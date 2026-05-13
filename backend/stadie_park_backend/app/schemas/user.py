"""Pydantic schemas for user authentication and administration."""
from pydantic import BaseModel, EmailStr
from typing import Literal, Optional

UserType = Literal["driver", "admin", "parking_marshal"]

class UserBase(BaseModel):
    """Base model shared by user schemas."""
    email: EmailStr
    user_type: UserType

class UserCreate(UserBase):
    """Schema for creating a new user."""
    password: str

class UserResponse(UserBase):
    """Schema returned for user details."""
    id: int
    is_admin: bool
    is_active: bool

    class Config:
        from_attributes = True

class Token(BaseModel):
    """Schema for returning authentication tokens."""
    access_token: str
    token_type: str
    user_type: str

class RegisterRequest(BaseModel):
    """Schema for user registration with vehicle."""
    email: EmailStr
    password: str
    user_type: UserType
    plate_number: Optional[str] = None  # Only required for drivers
    category: Optional[str] = None  # Only required for drivers (ambulance, private, bus, vip)

class StaffCreate(BaseModel):
    """Schema for admin-created staff accounts."""
    email: EmailStr
    password: str
    user_type: Literal["admin", "parking_marshal"]

class UserUpdate(BaseModel):
    """Admin-editable user fields."""
    email: Optional[EmailStr] = None
    user_type: Optional[UserType] = None
    is_active: Optional[bool] = None
