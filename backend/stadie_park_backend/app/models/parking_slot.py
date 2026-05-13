"""Parking slot model for Stadie-Park backend."""
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from ..database import Base

class ParkingSlot(Base):
    """Represents a parking slot in the stadium lot."""
    __tablename__ = "parking_slots"

    id = Column(Integer, primary_key=True, index=True)
    slot_code = Column(String, unique=True, index=True, nullable=False)
    zone = Column(String, nullable=False)
    zone_id = Column(Integer, nullable=True)  # For zone-based queries
    status = Column(String, default="available", nullable=False)
    occupied = Column(Boolean, default=False, nullable=False)
    current_vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=True)

    vehicles = relationship(
        "Vehicle",
        back_populates="parking_slot",
        foreign_keys="Vehicle.parking_slot_id",
    )
    current_vehicle = relationship(
        "Vehicle",
        foreign_keys=[current_vehicle_id],
    )
