"""AI assistant router for Stadie-Park."""
import json
import os
import urllib.request

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models.user import User
from ..models.vehicle import Vehicle
from ..models.parking_slot import ParkingSlot
from ..models.payment import Payment
from ..services.priority_queue import APSEngine

router = APIRouter()


class ChatMessage(BaseModel):
    """Recent conversation message."""
    role: str
    text: str


class ChatRequest(BaseModel):
    """Incoming chat message."""
    message: str
    history: list[ChatMessage] = Field(default_factory=list)


class ChatResponse(BaseModel):
    """Assistant response."""
    reply: str
    source: str = "fallback"


class AiStatusResponse(BaseModel):
    """Current local LLM connection status."""
    connected: bool
    model: str
    ollama_url: str
    available_models: list[str] = Field(default_factory=list)
    error: str | None = None


def ollama_url() -> str:
    """Return the configured Ollama base URL."""
    return os.getenv("OLLAMA_URL", "http://localhost:11434").rstrip("/")


def ollama_model() -> str:
    """Return the configured Ollama model name."""
    return os.getenv("OLLAMA_MODEL", "gemma4:31b-cloud")


def fetch_ollama_models() -> tuple[list[str], str | None]:
    """Fetch locally available Ollama models."""
    request = urllib.request.Request(ollama_url() + "/api/tags", method="GET")
    try:
        with urllib.request.urlopen(request, timeout=5) as response:
            body = json.loads(response.read().decode("utf-8"))
            return [item.get("name", "") for item in body.get("models", []) if item.get("name")], None
    except Exception as exc:
        return [], str(exc)


def get_user_queue_positions(user: User, db: Session) -> list[dict[str, object]]:
    """Return the signed-in driver's vehicles with live APS queue positions."""
    queue = APSEngine.get_priority_queue(db)
    positions = []
    for index, item in enumerate(queue, start=1):
        vehicle = item["vehicle"]
        if vehicle.user_id != user.id:
            continue
        positions.append({
            "vehicle": vehicle,
            "position": index,
            "ahead": index - 1,
            "score": round(float(item["score"]), 2),
            "queue_length": len(queue),
        })
    return positions


def direct_live_reply(message: str, user: User, db: Session) -> str | None:
    """Answer live-data questions directly from the database."""
    text = message.lower()
    asks_queue_position = (
        ("ahead" in text and any(word in text for word in ("car", "cars", "vehicle", "vehicles", "queue", "me")))
        or "queue position" in text
        or "position in queue" in text
        or "how many vehicles" in text
        or "how many cars" in text
    )
    asks_availability = any(phrase in text for phrase in ("available slot", "available parking", "free slot", "slots free"))
    asks_payment_status = "payment" in text and any(word in text for word in ("status", "paid", "pending", "receipt", "owe"))

    if asks_queue_position:
        queue = APSEngine.get_priority_queue(db)
        if user.user_type != "driver":
            if not queue:
                return "There are currently no vehicles waiting in the queue."
            next_vehicle = queue[0]["vehicle"]
            return (
                f"There are {len(queue)} vehicle(s) currently waiting. "
                f"The next vehicle is {next_vehicle.plate_number} with priority score {round(float(queue[0]['score']), 2)}."
            )

        positions = get_user_queue_positions(user, db)
        if not positions:
            own_vehicles = db.query(Vehicle).filter(Vehicle.user_id == user.id).all()
            if not own_vehicles:
                return "I do not see any vehicle registered under your account yet, so you are not in the queue."
            parked_or_allocated = [vehicle for vehicle in own_vehicles if vehicle.status in {"parked", "allocated"}]
            if parked_or_allocated:
                vehicle = parked_or_allocated[0]
                slot = vehicle.parking_slot.slot_code if vehicle.parking_slot else "your assigned slot"
                return f"Your vehicle {vehicle.plate_number} is already {vehicle.status}, so there are 0 cars ahead of you. Please proceed to {slot}."
            return "I found your vehicle, but it is not currently marked as waiting in the queue."

        if len(positions) == 1:
            item = positions[0]
            vehicle = item["vehicle"]
            return (
                f"{item['ahead']} car(s) are ahead of you. "
                f"Your vehicle {vehicle.plate_number} is position {item['position']} of {item['queue_length']} "
                f"with priority score {item['score']}."
            )

        details = [
            f"{item['vehicle'].plate_number}: {item['ahead']} ahead, position {item['position']} of {item['queue_length']}"
            for item in positions
        ]
        return "Here are your current queue positions: " + "; ".join(details) + "."

    if asks_availability:
        available_slots = db.query(ParkingSlot).filter(ParkingSlot.status == "available").count()
        occupied_slots = db.query(ParkingSlot).filter(ParkingSlot.occupied == True).count()  # noqa: E712
        return f"There are currently {available_slots} available parking slot(s), with {occupied_slots} occupied slot(s)."

    if asks_payment_status and user.user_type == "driver":
        vehicles = db.query(Vehicle).filter(Vehicle.user_id == user.id).all()
        if not vehicles:
            return "I do not see a vehicle on your account yet, so there is no payment status to show."
        details = []
        for vehicle in vehicles:
            latest_payment = (
                db.query(Payment)
                .filter(Payment.vehicle_id == vehicle.id)
                .order_by(Payment.created_at.desc())
                .first()
            )
            if latest_payment:
                status = "paid" if latest_payment.successful else "pending"
                details.append(f"{vehicle.plate_number}: {status}, amount {latest_payment.amount}")
            else:
                details.append(f"{vehicle.plate_number}: {vehicle.payment_status}")
        return "Your current payment status is: " + "; ".join(details) + "."

    return None


def local_fallback_reply(message: str, user: User, db: Session) -> str:
    """Return a useful local answer when no LLM service is configured."""
    live_reply = direct_live_reply(message, user, db)
    if live_reply:
        return live_reply

    text = message.lower()
    if any(word in text for word in ("where", "find", "go", "navigate", "navigation", "menu", "page", "screen", "tab", "use")):
        if user.user_type == "admin":
            return (
                "Use the top menu to open Dashboard, then choose the admin section you need. "
                "Admins use the dashboard to review users, approve staff, manage parking operations, check reports, "
                "and adjust settings; use AI Support any time you need help finding the right page."
            )
        if user.user_type == "parking_marshal":
            return (
                "Use Dashboard as your main workspace. From there, parking marshals can register vehicles at intake, "
                "check payments, manage the queue, assign or release parking slots, and view operational reports."
            )
        return (
            "Use the top menu to open Dashboard. Drivers can use it to register a vehicle, check parking availability, "
            "make a payment, view queue status, see assigned slot directions, and open receipts; AI Support can guide "
            "you to the right step if you are unsure."
        )
    if any(word in text for word in ("hello", "hi", "hey", "good morning", "good evening")):
        return "Hello, welcome to Stadie-Park customer care. I can guide you around the app, explain each dashboard section, and show you where to register vehicles, pay, check the queue, or find your slot."
    if "login" in text or "sign in" in text or "password" in text:
        return "Sorry about that. Please try signing in again from the login page, and make sure the correct account type is selected. If it still fails, customer care can help reset or confirm the account."
    if "register" in text or "account" in text or "profile" in text:
        return "I can help with that. For the demo, please use the registration page or dashboard profile area, then customer care can confirm anything that looks unclear."
    if "approve" in text or "pending" in text:
        if user.user_type == "admin":
            return "Absolutely. Please check the Users section in the dashboard for pending accounts. In a real support flow, customer care would confirm the account status before approval."
        return "No worries. If your account is pending, customer care or an admin can help confirm the status and guide you through the next step."
    if "vehicle" in text or "car" in text:
        return "Sure thing. Please check the Vehicles area in your dashboard for the demo status. If anything looks off, customer care can confirm the vehicle details for you."
    if "payment" in text or "fee" in text:
        return "I understand. Please check the Payments area in your dashboard. If the amount, receipt, or status looks confusing, customer care can help confirm it."
    if "slot" in text or "zone" in text or "parking" in text:
        return "Happy to help. Please check the parking zone or assigned slot shown in the dashboard. For the demo, customer care can guide you to the right area."
    if "queue" in text or "priority" in text or "aps" in text:
        return "Of course. The demo queue shows how vehicles are organized for parking support. Please use it as guidance, and customer care can confirm the final parking direction."
    if "admin" in text or "marshal" in text or "staff" in text:
        return "Sure, I can guide you. Staff and admin actions are handled from the dashboard, and customer care can help confirm which account type should be used."
    return (
        "Thanks for reaching out to Stadie-Park customer care. I can guide you around the app and explain how to use "
        "the dashboard, vehicle registration, payments, queue, parking slots, receipts, reports, and account pages. "
        "Tell me what you are trying to do, and I will point you to the right screen."
    )


def build_system_context(user: User, db: Session) -> str:
    """Build a role-aware context block from current system data."""
    role = user.user_type
    my_vehicle_count = db.query(Vehicle).filter(Vehicle.user_id == user.id).count()
    waiting_count = db.query(Vehicle).filter(Vehicle.status == "waiting").count()
    total_vehicle_count = db.query(Vehicle).count()
    paid_count = db.query(Vehicle).filter(Vehicle.payment_status == "paid").count()
    pending_payment_count = db.query(Vehicle).filter(Vehicle.payment_status == "pending").count()
    available_slots = db.query(ParkingSlot).filter(ParkingSlot.status == "available").count()
    occupied_slots = db.query(ParkingSlot).filter(ParkingSlot.occupied == True).count()  # noqa: E712
    queue_positions = get_user_queue_positions(user, db) if role == "driver" else []
    if queue_positions:
        queue_details = "; ".join(
            f"{item['vehicle'].plate_number} is position {item['position']} of {item['queue_length']} "
            f"with {item['ahead']} vehicles ahead and score {item['score']}"
            for item in queue_positions
        )
    else:
        queue_details = "No signed-in driver vehicle is currently waiting in the queue."

    if role == "admin":
        permissions = (
            "The user is an admin. They can manage users, approve pending staff, assign roles, "
            "manage zones, configure priority categories, configure fees, see reports, and change system settings."
        )
        visible_data = (
            f"They can see all {total_vehicle_count} vehicles, {waiting_count} waiting vehicles, "
            f"{paid_count} paid vehicles, {pending_payment_count} pending payments, "
            f"{available_slots} available slots, and {occupied_slots} occupied slots."
        )
    elif role == "parking_marshal":
        permissions = (
            "The user is a parking marshal. They can register/intake vehicles at the gate, validate payments, "
            "manage the operational queue, assign or release slots, report incidents, broadcast messages, "
            "and temporarily disable driver access. They cannot create admins, approve staff, change roles, "
            "change fee schedules, or edit global system settings."
        )
        visible_data = (
            f"They can see operational vehicles: {total_vehicle_count} total, {waiting_count} waiting, "
            f"{available_slots} available slots, and {occupied_slots} occupied slots."
        )
    else:
        permissions = (
            "The user is a driver. They can manage only their own profile, register their own vehicle, "
            "check availability, pay for parking, monitor queue status, see slot directions, view receipts, "
            "and ask for help. They cannot manage users, approve accounts, change roles, configure zones, "
            "change priority weights, change fees, or edit system settings."
        )
        visible_data = (
            f"They have {my_vehicle_count} linked vehicle(s). System-wide visible public data: "
            f"{waiting_count} vehicles waiting and {available_slots} available slots."
        )

    return (
        "You are Stadie-Park's in-app navigation assistant for the website demo. Your main job is to help users "
        "understand where to go in the app and how to use each screen. When the user asks for live status, counts, "
        "queue position, payment status, slot availability, or vehicle details, answer with the actual data in this "
        "context first instead of only directing them to a page. Add navigation only as a follow-up sentence when it "
        "helps. Speak like a polite support desk representative: warm, simple, reassuring, and "
        "site-focused. Keep the user on Stadie-Park app topics such as login, registration, dashboard navigation, "
        "vehicle registration, parking availability, parking zones, assigned slot directions, payments, receipts, "
        "queue status, reports, admin approval, parking marshal tools, and account help. If a user asks a general "
        "question, gently turn the answer into guidance for using the app. Use the role permissions and live data "
        "below only as soft context. Do not over-explain algorithms, database details, APIs, or exact rules unless "
        "the user clearly asks. If the answer is uncertain, give demo navigation guidance and say the dashboard, "
        "customer care, or parking office can confirm final details. Avoid saying you are an AI model. Do not claim "
        "live web access, legal authority, medical authority, or private system data you were not given. Keep replies "
        "short: usually 1 to 4 sentences.\n\n"
        f"Signed-in user: {user.email}\n"
        f"Role: {role}\n"
        f"Permissions: {permissions}\n"
        f"Current data summary: {visible_data}\n"
        f"Signed-in driver's live queue details: {queue_details}\n"
        "Navigation map: Home introduces Stadie-Park. Register creates an account. Login signs users in. Dashboard "
        "is the main workspace. Drivers use Dashboard for profile, vehicle registration, parking availability, "
        "payments, queue status, slot directions, and receipts. Parking marshals use Dashboard for vehicle intake, "
        "payment validation, queue management, slot assignment or release, incidents, and operational reports. "
        "Admins use Dashboard for users, approvals, roles, zones, priority settings, fees, reports, and system "
        "settings. Queue shows parking order and APS demo status. Parking shows zones and slot availability. "
        "Payment handles fees and receipts. Reports summarizes activity. AI Support and the floating chatbot guide "
        "users around the app."
    )


def build_messages(message: str, history: list[ChatMessage], user: User, db: Session) -> list[dict[str, str]]:
    """Create Ollama chat messages with bounded conversation history."""
    messages = [{"role": "system", "content": build_system_context(user, db)}]
    for item in history[-8:]:
        if item.role not in {"user", "assistant"}:
            continue
        content = item.text.strip()
        if content:
            messages.append({"role": item.role, "content": content[:1500]})
    messages.append({"role": "user", "content": message})
    return messages


def ask_local_llm(message: str, history: list[ChatMessage], user: User, db: Session) -> str | None:
    """Call a local Ollama-compatible LLM when OLLAMA_URL is configured."""
    payload = json.dumps({
        "model": ollama_model(),
        "messages": build_messages(message, history, user, db),
        "stream": False,
        "think": False,
        "options": {"temperature": 0.35, "num_ctx": 4096},
    }).encode("utf-8")
    request = urllib.request.Request(
        ollama_url() + "/api/chat",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=90) as response:
            body = json.loads(response.read().decode("utf-8"))
            chat_message = body.get("message") or {}
            return chat_message.get("content")
    except Exception:
        return None


@router.get("/status", response_model=AiStatusResponse)
async def ai_status():
    """Show whether the backend can reach Ollama."""
    models, error = fetch_ollama_models()
    model = ollama_model()
    return {
        "connected": bool(models) and model in models,
        "model": model,
        "ollama_url": ollama_url(),
        "available_models": models,
        "error": error if error else (None if model in models else f"Model {model} is not available in Ollama."),
    }


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Chat with the Stadie-Park assistant. Requires login."""
    live_reply = direct_live_reply(data.message, current_user, db)
    if live_reply:
        return {"reply": live_reply, "source": "database"}

    llm_reply = ask_local_llm(data.message, data.history, current_user, db)
    if llm_reply:
        return {"reply": llm_reply.strip(), "source": "ollama"}
    return {"reply": local_fallback_reply(data.message, current_user, db), "source": "fallback"}
