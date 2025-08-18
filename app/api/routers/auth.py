from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select
from pydantic import BaseModel

from app.models.db import get_session
from app.models.entities import User
from app.core.auth import create_access_token


router = APIRouter()


class SignupRequest(BaseModel):
    email: str
    password: str
    name: str | None = None


class LoginRequest(BaseModel):
    email: str
    password: str


@router.post("/signup")
def signup(request: SignupRequest, session: Session = Depends(get_session)):
    exists = session.exec(select(User).where(User.email == request.email)).first()
    if exists:
        raise HTTPException(status_code=400, detail="Email already exists")
    user = User(email=request.email, hashed_password=User.hash_password(request.password), name=request.name)
    session.add(user)
    session.commit()
    session.refresh(user)
    token = create_access_token(user.id, user.email)
    return {"access_token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}


@router.post("/login")
def login(request: LoginRequest, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == request.email)).first()
    if not user or not User.verify_password(request.password, user.hashed_password):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    token = create_access_token(user.id, user.email)
    return {"access_token": token, "user": {"id": user.id, "email": user.email, "name": user.name}}


