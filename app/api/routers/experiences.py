from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.db import get_session
from app.models.entities import Experience
from app.models.schemas import ExperienceCreate, ExperienceRead


from app.api.deps import get_current_user


router = APIRouter()


@router.post("/", response_model=ExperienceRead)
def create_experience(payload: ExperienceCreate, session: Session = Depends(get_session), user=Depends(get_current_user)):
    # 요청 바디의 user_id는 무시하고 토큰 기준으로 저장
    payload.user_id = str(user.get("sub", "default"))
    exp = Experience(**payload.model_dump())
    session.add(exp)
    session.commit()
    session.refresh(exp)
    return exp


@router.get("/", response_model=List[ExperienceRead])
def list_experiences(user_id: str = "default", session: Session = Depends(get_session), user=Depends(get_current_user)):
    user_id = user.get("sub", user_id)
    exps = session.exec(select(Experience).where(Experience.user_id == user_id)).all()
    return exps


@router.get("/{exp_id}", response_model=ExperienceRead)
def get_experience(exp_id: int, session: Session = Depends(get_session)):
    exp = session.get(Experience, exp_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    return exp


@router.put("/{exp_id}", response_model=ExperienceRead)
def update_experience(exp_id: int, payload: ExperienceCreate, session: Session = Depends(get_session), user=Depends(get_current_user)):
    exp = session.get(Experience, exp_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    # 권한 확인
    expected_user_id = getattr(user, "id", None)
    if expected_user_id is None:
        expected_user_id = getattr(user, "email", None) or getattr(user, "sub", None) or "default"
    if exp.user_id != str(expected_user_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    for k, v in payload.model_dump().items():
        setattr(exp, k, v)
    session.add(exp)
    session.commit()
    session.refresh(exp)
    return exp


@router.delete("/{exp_id}")
def delete_experience(exp_id: int, session: Session = Depends(get_session)):
    exp = session.get(Experience, exp_id)
    if not exp:
        raise HTTPException(status_code=404, detail="Experience not found")
    session.delete(exp)
    session.commit()
    return {"ok": True}

