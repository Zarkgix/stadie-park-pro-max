"""Pydantic schemas for parking slot data."""
from pydantic import BaseModel
from typing import Optional

class ParkingSlotBase(BaseModel):
    """Base fields for parking slot definitions."""
    slot_code: str
    zone: str
    status: str

class ParkingSlotCreate(ParkingSlotBase):
    """Schema used to create a parking slot."""
    pass

class ParkingSlotResponse(ParkingSlotBase):
    """Schema returned for parking slot details."""
    id: int
    current_vehicle_id: Optional[int]

    class Config:
        from_attributes = True
