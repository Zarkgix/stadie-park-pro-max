"""Pydantic schemas for payment processing and record keeping."""
from pydantic import BaseModel, Field

class PaymentBase(BaseModel):
    """Common payment fields."""
    vehicle_id: int
    amount: float = Field(..., gt=0, example=200.0)
    method: str = Field(..., example="M-Pesa")

class PaymentCreate(PaymentBase):
    """Schema used to record a new payment."""
    successful: bool = Field(..., example=True)

class PaymentResponse(PaymentBase):
    """Schema returned for payment records."""
    id: int
    successful: bool
    created_at: str

    class Config:
        from_attributes = True
