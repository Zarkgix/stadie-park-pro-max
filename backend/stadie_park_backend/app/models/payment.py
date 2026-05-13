"""Payment model for Stadie-Park backend financial records."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, Float, DateTime
from sqlalchemy.orm import relationship
from ..database import Base

class Payment(Base):
    """Stores payment transactions for parked vehicles."""
    __tablename__ = "payments"

    id = Column(Integer, primary_key=True, index=True)
    vehicle_id = Column(Integer, ForeignKey("vehicles.id"), nullable=False)
    amount = Column(Float, nullable=False)
    method = Column(String, nullable=False)
    successful = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    vehicle = relationship("Vehicle")
