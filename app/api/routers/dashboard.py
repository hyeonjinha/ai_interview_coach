from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.db import get_session
from app.models.entities import Experience, JobPosting, InterviewSession
from app.api.deps import get_current_user


router = APIRouter()


@router.get("/summary")
def summary(session: Session = Depends(get_session), user=Depends(get_current_user)):
    user_id = str(user.get("sub", "default"))
    exp_q = select(Experience).where(Experience.user_id == user_id)
    job_q = select(JobPosting).where(JobPosting.user_id == user_id)
    sess_q = select(InterviewSession).where(InterviewSession.user_id == user_id)
    exp_count = len(session.exec(exp_q).all())
    job_count = len(session.exec(job_q).all())
    sess_count = len(session.exec(sess_q).all())
    recent_sessions = session.exec(
        select(InterviewSession).where(InterviewSession.user_id == user_id).order_by(InterviewSession.id.desc()).limit(5)
    ).all()
    recent = [
        {
            "id": s.id,
            "job_posting_id": s.job_posting_id,
            "status": s.status,
            "round": s.current_round,
            "created_at": s.created_at,
        }
        for s in recent_sessions
    ]
    return {
        "experiences": exp_count,
        "jobs": job_count,
        "sessions": sess_count,
        "recent": recent,
    }


