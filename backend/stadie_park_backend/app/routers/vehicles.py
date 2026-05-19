"""Vehicle router for Stadie-Park backend."""
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..auth import get_current_active_user
from ..models.vehicle import Vehicle
from ..models.parking_slot import ParkingSlot
from ..schemas.vehicle import VehicleCreate, VehicleResponse, VehicleUpdate
from ..services.priority import calculate_priority_score

router = APIRouter()

DEFAULT_SLOTS = [
    ("E-01", "Emergency"),
    ("E-02", "Emergency"),
    ("V-01", "VVIP"),
    ("V-02", "VVIP"),
    ("V-03", "VIP"),
    ("B-01", "Bus"),
    ("B-02", "Public transport"),
    ("G-01", "General"),
    ("G-02", "General"),
    ("G-03", "General"),
    ("O-01", "Overflow"),
    ("O-02", "Overflow"),
]

ZONE_PREFERENCES = {
    "ambulance": ["Emergency", "Overflow"],
    "emergency": ["Emergency", "Overflow"],
    "vvip": ["VVIP", "VIP", "Overflow"],
    "vip": ["VIP", "VVIP", "Overflow"],
    "bus": ["Bus", "Public transport", "Overflow"],
    "public transport": ["Public transport", "Bus", "Overflow"],
    "general": ["General", "Overflow"],
    "private": ["General", "Overflow"],
    "regular": ["General", "Overflow"],
}


def ensure_default_slots(db: Session) -> None:
    """Create baseline demo slots if the database has no parking slots yet."""
    if db.query(ParkingSlot).count() > 0:
        return

    for slot_code, zone in DEFAULT_SLOTS:
        db.add(ParkingSlot(slot_code=slot_code, zone=zone, status="available", occupied=False))
    db.commit()


def find_best_available_slot(vehicle: Vehicle, db: Session) -> ParkingSlot | None:
    """Pick the nearest suitable available slot category for the vehicle."""
    ensure_default_slots(db)
    category = vehicle.category.strip().lower()
    preferred_zones = ZONE_PREFERENCES.get(category, ["General", "Overflow"])

    for zone in preferred_zones:
        slot = (
            db.query(ParkingSlot)
            .filter(
                ParkingSlot.zone == zone,
                ParkingSlot.status == "available",
                ParkingSlot.occupied == False,  # noqa: E712
            )
            .order_by(ParkingSlot.slot_code.asc())
            .first()
        )
        if slot:
            return slot

    return (
        db.query(ParkingSlot)
        .filter(
            ParkingSlot.status == "available",
            ParkingSlot.occupied == False,  # noqa: E712
        )
        .order_by(ParkingSlot.slot_code.asc())
        .first()
    )

@router.post("/", response_model=VehicleResponse)
async def create_vehicle(
    vehicle_in: VehicleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Register a new vehicle for queue and parking allocation."""
    vehicle = Vehicle(
        user_id=vehicle_in.user_id,
        plate_number=vehicle_in.plate_number,
        category=vehicle_in.category,
        urgency=vehicle_in.urgency,
        waiting_time=vehicle_in.waiting_time,
        payment_status=vehicle_in.payment_status,
        status="waiting",
        priority_score=calculate_priority_score(vehicle_in),
    )
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.post("/{vehicle_id}/assign-best-slot", response_model=VehicleResponse)
async def assign_best_slot(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Assign a waiting vehicle to the best available slot for its category."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    if vehicle.status == "exited":
        raise HTTPException(status_code=400, detail="Exited vehicles cannot be reassigned")

    if vehicle.parking_slot_id:
        existing_slot = db.query(ParkingSlot).filter(ParkingSlot.id == vehicle.parking_slot_id).first()
        if existing_slot:
            existing_slot.status = "available"
            existing_slot.occupied = False
            existing_slot.current_vehicle_id = None

    slot = find_best_available_slot(vehicle, db)
    if not slot:
        raise HTTPException(status_code=409, detail="No available parking slots")

    slot.status = "occupied"
    slot.occupied = True
    slot.current_vehicle_id = vehicle.id
    vehicle.parking_slot_id = slot.id
    vehicle.status = "assigned"
    vehicle.allocated_at = datetime.utcnow()
    vehicle.priority_score = calculate_priority_score(vehicle)

    db.add(slot)
    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle


@router.post("/{vehicle_id}/process-exit", response_model=VehicleResponse)
async def process_vehicle_exit(
    vehicle_id: int,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Mark a vehicle as processed/exited and release its assigned slot."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")

    if vehicle.parking_slot_id:
        slot = db.query(ParkingSlot).filter(ParkingSlot.id == vehicle.parking_slot_id).first()
        if slot:
            slot.status = "available"
            slot.occupied = False
            slot.current_vehicle_id = None
            db.add(slot)

    vehicle.status = "exited"
    vehicle.parking_slot_id = None
    if not vehicle.allocated_at:
        vehicle.allocated_at = datetime.utcnow()

    db.add(vehicle)
    db.commit()
    db.refresh(vehicle)
    return vehicle

@router.get("/", response_model=List[VehicleResponse])
async def list_vehicles(db: Session = Depends(get_db)):
    """List all vehicles in the system."""
    return db.query(Vehicle).all()

@router.get("/{vehicle_id}", response_model=VehicleResponse)
async def get_vehicle(vehicle_id: int, db: Session = Depends(get_db)):
    """Retrieve a single vehicle by ID."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    return vehicle

@router.put("/{vehicle_id}", response_model=VehicleResponse)
async def update_vehicle(
    vehicle_id: int,
    vehicle_in: VehicleUpdate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Update a vehicle's status, category, or payment state."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    for field, value in vehicle_in.dict(exclude_unset=True).items():
        setattr(vehicle, field, value)
    vehicle.priority_score = calculate_priority_score(vehicle_in)
    db.commit()
    db.refresh(vehicle)
    return vehicle
