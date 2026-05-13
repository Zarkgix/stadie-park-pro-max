"""Payment router for Stadie-Park backend."""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from ..database import get_db
from ..auth import get_current_active_user
from ..models.payment import Payment
from ..models.vehicle import Vehicle
from ..schemas.payment import PaymentCreate, PaymentResponse

router = APIRouter()

@router.post("/", response_model=PaymentResponse)
async def create_payment(
    payment_in: PaymentCreate,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_active_user),
):
    """Record a payment transaction for a parked vehicle."""
    vehicle = db.query(Vehicle).filter(Vehicle.id == payment_in.vehicle_id).first()
    if not vehicle:
        raise HTTPException(status_code=404, detail="Vehicle not found")
    payment = Payment(
        vehicle_id=payment_in.vehicle_id,
        amount=payment_in.amount,
        method=payment_in.method,
        successful=payment_in.successful,
    )
    vehicle.payment_status = "paid" if payment_in.successful else "pending"
    db.add(payment)
    db.commit()
    db.refresh(payment)
    return payment

@router.get("/", response_model=List[PaymentResponse])
async def list_payments(db: Session = Depends(get_db)):
    """List all payment records."""
    return db.query(Payment).all()
