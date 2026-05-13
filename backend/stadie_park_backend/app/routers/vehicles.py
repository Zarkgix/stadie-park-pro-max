"""Vehicle router for Stadie-Park backend."""
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

@router.post("/", response_model=VehicleResponse)
async def create_vehicle(
    vehicle_in: VehicleCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Register a new vehicle for queue and parking allocation."""
    vehicle = Vehicle(
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
