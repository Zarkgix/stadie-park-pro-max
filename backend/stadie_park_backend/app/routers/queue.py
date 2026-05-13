"""Queue router for Stadie-Park backend."""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from ..database import get_db
from ..auth import get_current_active_user
from ..models.vehicle import Vehicle
from ..services.priority_queue import APSEngine
from ..schemas.vehicle import VehicleResponse
from pydantic import BaseModel

router = APIRouter()

class PriorityQueueItem(BaseModel):
    """Vehicle with current priority score."""
    vehicle_id: int
    plate_number: str
    category: str
    status: str
    current_priority_score: float
    urgency: int
    payment_status: str

@router.get("/", response_model=List[VehicleResponse])
async def current_queue(db: Session = Depends(get_db)):
    """View the current queue of waiting vehicles."""
    vehicles = db.query(Vehicle).filter(Vehicle.status == "waiting").all()
    return vehicles

@router.get("/priority-queue", response_model=List[PriorityQueueItem])
async def get_priority_queue(
    db: Session = Depends(get_db),
    is_emergency: bool = False
):
    """Get vehicles sorted by APS engine priority score."""
    priority_queue = APSEngine.get_priority_queue(db, is_emergency=is_emergency)
    
    result = []
    for item in priority_queue:
        vehicle = item["vehicle"]
        result.append(PriorityQueueItem(
            vehicle_id=vehicle.id,
            plate_number=vehicle.plate_number,
            category=vehicle.category,
            status=vehicle.status,
            current_priority_score=item["score"],
            urgency=vehicle.urgency,
            payment_status=vehicle.payment_status,
        ))
    
    return result

@router.get("/priority-score/{vehicle_id}")
async def get_vehicle_priority_score(
    vehicle_id: int,
    db: Session = Depends(get_db),
    is_emergency: bool = False
):
    """Calculate and return priority score for a specific vehicle."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    
    score = APSEngine.calculate_priority_score(vehicle, db, is_emergency, vehicle.created_at)
    
    return {
        "vehicle_id": vehicle.id,
        "plate_number": vehicle.plate_number,
        "category": vehicle.category,
        "priority_score": score,
        "breakdown": {
            "base_score": APSEngine.get_category_weight(vehicle.category) * APSEngine.get_urgency_multiplier(is_emergency),
            "time_bonus": APSEngine.get_time_bonus(vehicle.created_at),
            "zone_adjustment": APSEngine.get_zone_adjustment(vehicle.parking_slot_id, db),
            "wait_bonus": APSEngine.get_wait_bonus(vehicle.category, vehicle.waiting_time / 60.0 if vehicle.waiting_time else 0.0),
        }
    }
