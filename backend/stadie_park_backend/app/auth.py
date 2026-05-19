"""Authentication helpers for Stadie-Park backend."""
import os
import hashlib
import base64
import hmac
import json
import time
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from .database import get_db
from .models.user import User

SECRET_KEY = os.getenv("SECRET_KEY", "change-me-for-prod")
TOKEN_TTL_SECONDS = int(os.getenv("TOKEN_TTL_SECONDS", str(60 * 60 * 12)))

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

# In-memory token store kept for existing sessions in the current process.
ACCESS_TOKENS = {}


def _b64encode(data: bytes) -> str:
    """Encode bytes for compact URL-safe tokens."""
    return base64.urlsafe_b64encode(data).decode("ascii").rstrip("=")


def _b64decode(data: str) -> bytes:
    """Decode URL-safe token data with restored padding."""
    padding = "=" * (-len(data) % 4)
    return base64.urlsafe_b64decode(data + padding)


def _sign(payload: str) -> str:
    """Create an HMAC signature for a token payload."""
    return _b64encode(hmac.new(SECRET_KEY.encode("utf-8"), payload.encode("ascii"), hashlib.sha256).digest())


def get_password_hash(password: str) -> str:
    """Create a simple SHA-256 hash for a password."""
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Compare a plain password against a stored hash."""
    return hmac.compare_digest(get_password_hash(plain_password), hashed_password)


def authenticate_user(db: Session, email: str, password: str) -> Optional[User]:
    """Verify user credentials and return the user when valid."""
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def create_access_token(email: str) -> str:
    """Create a signed API token for a user session."""
    payload = _b64encode(json.dumps({"email": email, "iat": int(time.time())}, separators=(",", ":")).encode("utf-8"))
    token = f"{payload}.{_sign(payload)}"
    ACCESS_TOKENS[token] = email
    return token


def _email_from_token(token: str) -> str | None:
    """Read an email from either a current in-memory token or a signed token."""
    if token in ACCESS_TOKENS:
        return ACCESS_TOKENS[token]

    try:
        payload, signature = token.split(".", 1)
    except ValueError:
        return None

    if not hmac.compare_digest(_sign(payload), signature):
        return None

    try:
        data = json.loads(_b64decode(payload).decode("utf-8"))
    except (ValueError, json.JSONDecodeError):
        return None

    email = data.get("email")
    issued_at = data.get("iat")
    if not isinstance(email, str) or not isinstance(issued_at, int):
        return None
    if issued_at + TOKEN_TTL_SECONDS < int(time.time()):
        return None
    return email


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> User:
    """Return the current authenticated user from the token."""
    email = _email_from_token(token)
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
