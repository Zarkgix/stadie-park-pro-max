"""AI assistant router for Stadie-Park."""
import json
import os
import urllib.request

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.orm import Session

from ..auth import get_current_user
from ..database import get_db
from ..models.user import User
from ..models.vehicle import Vehicle
from ..models.payment import Payment
from ..models.parking_slot import ParkingSlot

router = APIRouter()


class ChatRequest(BaseModel):
    """Incoming chat message."""
    message: str


class ChatResponse(BaseModel):
    """Assistant response."""
    reply: str


def local_fallback_reply(message: str, user: User) -> str:
    """Return a useful local answer when no LLM service is configured."""
    role = user.user_type.replace("_", " ")
    text = message.lower()
    if "approve" in text or "pending" in text:
        if user.user_type == "admin":
            return "Open Dashboard, then Users. Pending admins and parking marshals appear at the top with an Approve button."
        return "Only an approved admin can approve pending staff accounts. Your account role is " + role + "."
    if "vehicle" in text or "car" in text:
        return "Use the Vehicles tab to view vehicle status. Admins see every vehicle; drivers see only their own registered vehicles."
    if "payment" in text or "fee" in text:
        return "Admins configure fees in the Payments tab. Drivers can process individual vehicle payments but cannot change fee settings."
    if "zone" in text or "parking" in text:
        return "Admins manage parking zones in the Zones tab. Drivers can view zone availability but cannot edit capacities or retire zones."
    return f"I am your Stadie-Park assistant. You are logged in as {role}. Ask me about vehicles, approvals, zones, payments, reports, or account settings."


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
        "You are the Stadie-Park local assistant. Answer based only on the system capabilities and data summary provided. "
        "Keep responses short, clear, and practical. If a user asks for something outside their permission, politely explain "
        "what they can do instead.\n\n"
        f"Signed-in user: {user.email}\n"
        f"Role: {role}\n"
        f"Permissions: {permissions}\n"
        f"Current data summary: {visible_data}\n"
        "Main workflows: driver self-service parking, marshal gate operations, admin system management, and demo-mode APS scoring."
    )


def ask_local_llm(message: str, user: User, db: Session) -> str | None:
    """Call a local Ollama-compatible LLM when OLLAMA_URL is configured."""
    ollama_url = os.getenv("OLLAMA_URL", "http://localhost:11434")

    model = os.getenv("OLLAMA_MODEL", "llama3.2")
    system_context = build_system_context(user, db)
    payload = json.dumps({
        "model": model,
        "system": system_context,
        "prompt": message,
        "stream": False,
        "think": False,
        "options": {"temperature": 0.2},
    }).encode("utf-8")
    request = urllib.request.Request(
        ollama_url.rstrip("/") + "/api/generate",
        data=payload,
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=20) as response:
            body = json.loads(response.read().decode("utf-8"))
            return body.get("response")
    except Exception:
        return None


@router.post("/chat", response_model=ChatResponse)
async def chat_with_assistant(
    data: ChatRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Chat with the Stadie-Park assistant. Requires login."""
    llm_reply = ask_local_llm(data.message, current_user, db)
    return {"reply": llm_reply or local_fallback_reply(data.message, current_user)}
