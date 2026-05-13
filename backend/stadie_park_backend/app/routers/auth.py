"""Authentication router for Stadie-Park backend."""
from typing import Literal
from fastapi import APIRouter, Depends, Form, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from ..database import get_db
from ..auth import authenticate_user, create_access_token, get_password_hash, get_current_user
from ..models.user import User
from ..models.vehicle import Vehicle
from ..models.payment import Payment
from ..schemas.user import Token, UserResponse, RegisterRequest, StaffCreate, UserUpdate
from ..schemas.vehicle import VehicleResponse

router = APIRouter()

def require_admin(user: User):
    """Require an active admin account."""
    if user.user_type != "admin" or not user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin access required")
    return user

@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_type: Literal["driver", "admin", "parking_marshal"] = Form(...),
    db: Session = Depends(get_db),
):
    """Issue an access token for valid credentials and matching user type."""
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    stored_user_type = user.user_type or ("admin" if user.is_admin else "driver")
    if stored_user_type != user_type:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is registered as {stored_user_type.replace('_', ' ')}, not {user_type.replace('_', ' ')}.",
        )
    if not user.is_active and stored_user_type in {"admin", "parking_marshal"}:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Your account is pending approval by an administrator.",
        )
    if not user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    access_token = create_access_token(user.email)
    return {"access_token": access_token, "token_type": "bearer", "user_type": stored_user_type}

@router.post("/register", response_model=UserResponse)
async def register_user_vehicle(data: RegisterRequest, db: Session = Depends(get_db)):
    """Register a new user and, for drivers, their vehicle."""
    existing = db.query(User).filter(User.email == data.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    allowed_categories = {"ambulance", "private", "bus", "vip"}
    category = data.category.lower() if data.category else None
    if data.user_type == "driver":
        if not data.plate_number or not category:
            raise HTTPException(status_code=400, detail="Drivers must provide a plate number and vehicle category")
        if category not in allowed_categories:
            raise HTTPException(status_code=400, detail="Invalid vehicle category")
        existing_vehicle = db.query(Vehicle).filter(Vehicle.plate_number == data.plate_number).first()
        if existing_vehicle:
            raise HTTPException(status_code=400, detail="Vehicle plate number already exists")
    
    # Calculate payment amount based on category
    payment_amounts = {
        "ambulance": 0.0,
        "private": 100.0,
        "bus": 200.0,
        "vip": 300.0
    }
    amount = payment_amounts.get(category, 100.0) if data.user_type == "driver" else 0.0
    
    hashed_password = get_password_hash(data.password)
    new_user = User(
        email=data.email,
        hashed_password=hashed_password,
        user_type=data.user_type,
        is_admin=data.user_type == "admin",  # Backward compatibility
        is_active=data.user_type == "driver",
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    if data.user_type != "driver":
        return new_user
    
    # Create vehicle
    urgency = 10 if category == "ambulance" else 5  # higher urgency for ambulance
    new_vehicle = Vehicle(
        user_id=new_user.id,
        plate_number=data.plate_number,
        category=category,
        urgency=urgency,
        payment_status="paid" if amount == 0 else "pending",
        status="waiting",
    )
    db.add(new_vehicle)
    db.commit()
    db.refresh(new_vehicle)
    
    # Create payment if amount > 0
    if amount > 0:
        new_payment = Payment(
            vehicle_id=new_vehicle.id,
            amount=amount,
            method="pending",  # or some default
            successful=False,
        )
        db.add(new_payment)
        db.commit()
    
    return new_user

@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return current_user

@router.get("/users", response_model=list[UserResponse])
async def list_users(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List users for account management."""
    if current_user.user_type == "parking_marshal":
        return db.query(User).filter(User.user_type == "driver").order_by(User.id).all()
    require_admin(current_user)
    return db.query(User).order_by(User.id).all()

@router.post("/users", response_model=UserResponse)
async def create_staff_user(
    staff: StaffCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Create an approved admin or parking marshal account."""
    require_admin(current_user)
    existing = db.query(User).filter(User.email == staff.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="User already exists")

    new_user = User(
        email=staff.email,
        hashed_password=get_password_hash(staff.password),
        user_type=staff.user_type,
        is_admin=staff.user_type == "admin",
        is_active=True,
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user

@router.post("/users/{user_id}/approve", response_model=UserResponse)
async def approve_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Approve a pending admin or parking marshal account."""
    require_admin(current_user)
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if user.user_type not in {"admin", "parking_marshal"}:
        raise HTTPException(status_code=400, detail="Only admin and parking marshal accounts require approval")
    user.is_active = True
    user.is_admin = user.user_type == "admin"
    db.commit()
    db.refresh(user)
    return user

@router.patch("/users/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: int,
    changes: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Edit a user account. Admins can edit any account; drivers only their own email."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    is_admin_user = current_user.user_type == "admin" and current_user.is_admin
    if not is_admin_user:
        if current_user.id != user_id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="You can only edit your own profile")
        if changes.user_type is not None or changes.is_active is not None:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Drivers cannot change roles or activation status")

    if changes.email is not None and changes.email != user.email:
        existing = db.query(User).filter(User.email == changes.email).first()
        if existing:
            raise HTTPException(status_code=400, detail="Email already exists")
        user.email = changes.email

    if is_admin_user and changes.user_type is not None:
        user.user_type = changes.user_type
        user.is_admin = changes.user_type == "admin"

    if is_admin_user and changes.is_active is not None:
        if user.id == current_user.id and changes.is_active is False:
            raise HTTPException(status_code=400, detail="You cannot deactivate your own admin account")
        user.is_active = changes.is_active

    db.commit()
    db.refresh(user)
    return user

@router.post("/users/{user_id}/deactivate", response_model=UserResponse)
async def deactivate_user(
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Deactivate a user account."""
    if current_user.id == user_id:
        raise HTTPException(status_code=400, detail="You cannot deactivate your own admin account")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    if current_user.user_type == "parking_marshal":
        if user.user_type != "driver":
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Marshals can only disable driver accounts")
    else:
        require_admin(current_user)
    user.is_active = False
    db.commit()
    db.refresh(user)
    return user

@router.get("/my-vehicles", response_model=list[VehicleResponse])
async def get_my_vehicles(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user's vehicles."""
    vehicles = db.query(Vehicle).filter(Vehicle.user_id == current_user.id).all()
    return vehicles
