"""Priority scoring and queue assignment logic for Stadie-Park."""
from typing import List
from sqlalchemy.orm import Session
from ..models.vehicle import Vehicle
from ..models.parking_slot import ParkingSlot

CATEGORY_WEIGHTS = {
    "Emergency": 40,
    "VIP": 30,
    "Staff": 20,
    "Media": 15,
    "Regular": 10,
}

PAYMENT_WEIGHT = {
    "paid": 0,
    "pending": 10,
    "unpaid": 15,
}

URGENCY_WEIGHT = 2.0
WAITING_TIME_WEIGHT = 0.5
MAX_WAITING_BONUS = 20


def calculate_priority_score(vehicle_data) -> float:
    """Calculate a priority score for a vehicle.

    Priority is based on category, urgency, waiting time, and payment status.
    Higher score means the vehicle should be allocated sooner.
    """
    category_score = CATEGORY_WEIGHTS.get(getattr(vehicle_data, "category", "Regular"), 10)
    urgency_score = getattr(vehicle_data, "urgency", 1) * URGENCY_WEIGHT
    waiting_time = getattr(vehicle_data, "waiting_time", 0)
    waiting_bonus = min(waiting_time * WAITING_TIME_WEIGHT, MAX_WAITING_BONUS)
    payment_score = PAYMENT_WEIGHT.get(getattr(vehicle_data, "payment_status", "pending"), 10)

    total_score = category_score + urgency_score + waiting_bonus + payment_score
    return float(round(total_score, 2))


def sort_vehicles_by_priority(vehicles: List[Vehicle]) -> List[Vehicle]:
    """Return vehicles sorted from highest to lowest priority."""
    return sorted(vehicles, key=lambda item: item.priority_score if item.priority_score is not None else 0, reverse=True)


def assign_parking_slots(db: Session, vehicles: List[Vehicle]) -> List[Vehicle]:
    """Allocate available parking slots to waiting vehicles based on priority.

    The algorithm prefers matching zone type first, then any available slot.
    It updates vehicle status and slot assignment in the database.
    """
    queued = sort_vehicles_by_priority(vehicles)
    available_slots = db.query(ParkingSlot).filter(ParkingSlot.status == "available").all()

    assigned = []
    for vehicle in queued:
        for slot in available_slots:
            if slot.zone == vehicle.category or slot.zone == "Regular":
                slot.status = "occupied"
                slot.current_vehicle = vehicle
                vehicle.parking_slot_id = slot.id
                vehicle.status = "parked"
                vehicle.priority_score = calculate_priority_score(vehicle)
                assigned.append(vehicle)
                available_slots.remove(slot)
                db.add(slot)
                db.add(vehicle)
                db.commit()
                db.refresh(slot)
                db.refresh(vehicle)
                break
    return assigned
