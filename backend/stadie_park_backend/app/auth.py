"""Authentication helpers for Stadie-Park backend."""
import os
import hashlib
import secrets
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models.user import User

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-for-prod")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# In-memory token store for the example backend.
ACCESS_TOKENS = {}


def get_password_hash(password: str) -> str:
    """Create a simple SHA-256 hash for a password."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compare a plain password against a stored hash."""
    return secrets.compare_digest(get_password_hash(plain_password), hashed_password)


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Verify user credentials and return the user when valid."""
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(email: str) -> str:
    """Create a short-lived API token for a user session."""
    token = secrets.token_urlsafe(32)
    ACCESS_TOKENS[token] = email
    return token


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Return the current authenticated user from the token."""
    email = ACCESS_TOKENS.get(token)
    if not email:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """Require that the current user is active."""
    if not current_user.is_active:
        raise HTTPException(status_code=400, detail="Inactive user")
    return current_user
