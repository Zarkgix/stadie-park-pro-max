"""Vehicle model for Stadie-Park backend."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, ForeignKey, Float, Boolean, DateTime
from sqlalchemy.orm import relationship
from ..database import Base

class Vehicle(Base):
    """Represents a vehicle that needs parking allocation."""
    __tablename__ = "vehicles"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    plate_number = Column(String, unique=True, index=True, nullable=False)
    category = Column(String, nullable=False)
    urgency = Column(Integer, default=1, nullable=False)
    waiting_time = Column(Integer, default=0, nullable=False)
    payment_status = Column(String, default="pending", nullable=False)
    priority_score = Column(Float, default=0.0, nullable=False)
    status = Column(String, default="waiting", nullable=False)
    parking_slot_id = Column(Integer, ForeignKey("parking_slots.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    allocated_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="vehicles")
    parking_slot = relationship("ParkingSlot", back_populates="vehicles", foreign_keys=[parking_slot_id])
