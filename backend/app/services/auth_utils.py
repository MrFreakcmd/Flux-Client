"""Authentication utilities for JWT token and API key handling."""
from datetime import datetime, timedelta, timezone
import hashlib
from typing import Optional
from jose import JWTError, jwt
from fastapi import Depends, HTTPException, status, Cookie
from sqlalchemy.orm import Session
from app.config import settings
from app.database import get_db
from app.models.models import ApiKey, User
import uuid

# Define oauth2 scheme (optional tokenUrl for OpenAPI documentation docs)
# Note: This is deprecated in favor of cookie-based auth, kept for API key support
from fastapi.security import OAuth2PasswordBearer
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/token", auto_error=False)


def create_access_token(
    data: dict, expires_delta: Optional[timedelta] = None
) -> str:
    """Create a JWT access token.

    Args:
        data: Claims to encode in the token
        expires_delta: Optional custom expiration time

    Returns:
        Encoded JWT token
    """
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(
            minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
        )
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm="HS256")
    return encoded_jwt


async def get_current_user(
    token: str = Depends(oauth2_scheme),
    access_token_cookie: Optional[str] = Cookie(None),
    db: Session = Depends(get_db)
) -> User:
    """Get current user from token (Authorization header or HttpOnly cookie).

    Supports both:
    1. Authorization: Bearer <token> header (for API clients)
    2. HttpOnly cookie (for web browsers, more secure)

    Args:
        token: Token from Authorization header (via oauth2_scheme)
        access_token_cookie: Token from HttpOnly cookie
        db: Database session

    Returns:
        Authenticated User object

    Raises:
        HTTPException: 401 if token is invalid or missing
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    # Try cookie first (preferred for security), then Authorization header
    token_to_use = access_token_cookie or token
    if not token_to_use:
        raise credentials_exception

    # Check if this is an API key (starts with "flux_")
    if token_to_use.startswith("flux_"):
        key_hash = hashlib.sha256(token_to_use.encode("utf-8")).hexdigest()
        api_key = db.query(ApiKey).filter(
            ApiKey.key_hash == key_hash, ApiKey.revoked_at.is_(None)
        ).first()
        if api_key is None:
            raise credentials_exception
        api_key.last_used_at = datetime.now(timezone.utc)
        db.commit()
        user = db.query(User).filter(User.id == api_key.user_id).first()
        if user is None:
            raise credentials_exception
        return user

    # Decode JWT token
    try:
        payload = jwt.decode(
            token_to_use, settings.SECRET_KEY, algorithms=["HS256"]
        )
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    # Validate UUID format
    try:
        user_uuid = uuid.UUID(user_id)
    except ValueError:
        raise credentials_exception

    user = db.query(User).filter(User.id == user_uuid).first()
    if user is None:
        raise credentials_exception
    return user


async def get_current_admin(
    current_user: User = Depends(get_current_user)
) -> User:
    """Dependency to ensure user is admin."""
    if not current_user.is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="The user does not have administrative privileges"
        )
    return current_user
