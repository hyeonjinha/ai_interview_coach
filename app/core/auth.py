from __future__ import annotations

from datetime import datetime, timedelta
from typing import Optional

from jose import jwt, JWTError

from app.core.config import get_settings


ALGO = "HS256"


def create_access_token(user_id: int, email: str, expires_minutes: int | None = None) -> str:
    settings = get_settings()
    if expires_minutes is None:
        expires_minutes = settings.jwt_expires_minutes
    now = datetime.utcnow()
    payload = {
        "sub": str(user_id),
        "email": email,
        "iat": int(now.timestamp()),
        "exp": int((now + timedelta(minutes=expires_minutes)).timestamp()),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm=ALGO)


def verify_token(token: str) -> Optional[dict]:
    settings = get_settings()
    try:
        payload = jwt.decode(token, settings.jwt_secret, algorithms=[ALGO])
        return payload
    except JWTError:
        return None


