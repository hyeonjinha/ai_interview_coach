from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.models.db import get_session
from app.models.entities import Experience
from app.models.schemas import RecommendationRequest, RecommendationResponse, RecommendedItem
from app.services.recommendation_service import recommend_experiences


router = APIRouter()


@router.post("/", response_model=RecommendationResponse)
def get_recommendations(payload: RecommendationRequest, session: Session = Depends(get_session)):
    items = recommend_experiences(
        session=session,
        user_id=payload.user_id,
        job_posting_id=payload.job_posting_id,
        experience_ids=payload.experience_ids,
        threshold=payload.threshold,
    )
    return RecommendationResponse(items=[RecommendedItem(experience_id=eid, score=score, selected=sel) for (eid, score, sel) in items])

