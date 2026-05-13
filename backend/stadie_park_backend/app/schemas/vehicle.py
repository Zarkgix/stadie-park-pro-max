"""Pydantic schemas for vehicle registration and status."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class VehicleBase(BaseModel):
    """Base fields shared by vehicle schemas."""
    user_id: int
    plate_number: str = Field(..., example="KAA 123A")
    category: str = Field(..., example="VIP")
    urgency: int = Field(..., ge=1, le=10, example=8)
    waiting_time: int = Field(..., ge=0, example=12)
    payment_status: str = Field(..., example="pending")

class VehicleCreate(VehicleBase):
    """Schema for vehicle creation requests."""
    pass

class VehicleUpdate(BaseModel):
    """Fields that can be updated after registration."""
    status: Optional[str]
    urgency: Optional[int]
    waiting_time: Optional[int]
    payment_status: Optional[str]

class VehicleResponse(VehicleBase):
    """Schema returned for vehicle data."""
    id: int
    priority_score: float
    status: str
    parking_slot_id: Optional[int]
    created_at: datetime
    allocated_at: Optional[datetime]

    class Config:
        from_attributes = True

class VehicleWithScoreResponse(VehicleResponse):
    """Vehicle response with current priority score."""
    current_priority_score: float
