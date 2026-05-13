"""User model for Stadie-Park backend authentication."""
from sqlalchemy import Column, Integer, String, Boolean
from sqlalchemy.orm import relationship
from ..database import Base

class User(Base):
    """Represents a user (Driver, Admin, or Parking Marshal)."""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    user_type = Column(String, nullable=False)  # "driver", "admin", "parking_marshal"
    is_admin = Column(Boolean, default=False, nullable=False)  # For backward compatibility
    is_active = Column(Boolean, default=True, nullable=False)

    # Relationship to vehicles - use lazy loading to avoid circular import issues
    vehicles = relationship(
        "Vehicle",
        back_populates="user",
        lazy="select",
        viewonly=False
    )
