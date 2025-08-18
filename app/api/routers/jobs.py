from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session
from bs4 import BeautifulSoup
import requests

from app.core.config import get_settings
from app.models.db import get_session
from app.models.entities import JobPosting
from app.models.schemas import JobPostingCreate, JobPostingRead
from app.api.deps import get_current_user
from sqlmodel import select


router = APIRouter()


def _parse_job_text(text: str) -> dict:
    # 매우 단순한 휴리스틱 파서. 실서비스에서는 Section 헤더를 정교하게 인식하도록 개선 필요
    sections = {"main": text}
    for key in ["주요 업무", "자격 요건", "우대 사항", "우대사항", "책임", "요건"]:
        if key in text:
            sections_key = {
                "주요 업무": "responsibilities",
                "책임": "responsibilities",
                "자격 요건": "requirements",
                "요건": "requirements",
                "우대 사항": "preferred",
                "우대사항": "preferred",
            }.get(key, key)
            # 간단히 구간을 자르지는 않고, 전체 텍스트를 보존. 프롬프트에서 섹션 키 활용
            sections[sections_key] = text
    return sections


@router.post("/", response_model=JobPostingRead)
def create_job_posting(payload: JobPostingCreate, session: Session = Depends(get_session), user=Depends(get_current_user)):
    settings = get_settings()
    payload.user_id = str(user.get("sub", "default"))
    raw_text: Optional[str] = payload.raw_text

    if payload.source_type == "url":
        if not settings.allow_url_fetch:
            raise HTTPException(status_code=400, detail="URL fetch disabled in settings")
        if not payload.url:
            raise HTTPException(status_code=400, detail="URL is required for source_type=url")
        try:
            r = requests.get(payload.url, timeout=10)
            r.raise_for_status()
            soup = BeautifulSoup(r.text, "html.parser")
            raw_text = soup.get_text(" ", strip=True)
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {e}")

    if not raw_text:
        raise HTTPException(status_code=400, detail="No job text provided")

    sections = _parse_job_text(raw_text)
    jp = JobPosting(
        user_id=payload.user_id,
        source_type=payload.source_type,
        url=payload.url,
        raw_text=raw_text,
        sections=sections,
        status=(payload.status or "draft"),
        application_qa=(payload.application_qa or []),
    )
    session.add(jp)
    session.commit()
    session.refresh(jp)
    return jp


@router.get("/{job_id}", response_model=JobPostingRead)
def get_job_posting(job_id: int, session: Session = Depends(get_session)):
    jp = session.get(JobPosting, job_id)
    if not jp:
        raise HTTPException(status_code=404, detail="Job posting not found")
    return jp
@router.put("/{job_id}", response_model=JobPostingRead)
def update_job_posting(job_id: int, payload: JobPostingCreate, session: Session = Depends(get_session), user=Depends(get_current_user)):
    jp = session.get(JobPosting, job_id)
    if not jp:
        raise HTTPException(status_code=404, detail="Job posting not found")
    # user는 User 모델 객체로 가정. 이메일 또는 id 문자열을 user_id로 저장했을 수 있음
    expected_user_id = getattr(user, "id", None)
    if expected_user_id is None:
        expected_user_id = getattr(user, "email", None) or getattr(user, "sub", None) or "default"
    if jp.user_id != str(expected_user_id):
        raise HTTPException(status_code=403, detail="Forbidden")
    # update allowed fields
    jp.source_type = payload.source_type or jp.source_type
    jp.url = payload.url if payload.url is not None else jp.url
    jp.raw_text = payload.raw_text if payload.raw_text is not None else jp.raw_text
    if payload.raw_text:
        jp.sections = _parse_job_text(payload.raw_text)
    if payload.status is not None:
        jp.status = payload.status
    if payload.application_qa is not None:
        jp.application_qa = payload.application_qa
    session.add(jp)
    session.commit()
    session.refresh(jp)
    return jp



@router.get("/", response_model=List[JobPostingRead])
def list_job_postings(user_id: str = "default", session: Session = Depends(get_session), user=Depends(get_current_user)):
    user_id = user.get("sub", user_id)
    items = session.exec(select(JobPosting).where(JobPosting.user_id == user_id).order_by(JobPosting.id.desc())).all()
    return items


@router.delete("/{job_id}")
def delete_job_posting(job_id: int, session: Session = Depends(get_session)):
    jp = session.get(JobPosting, job_id)
    if not jp:
        raise HTTPException(status_code=404, detail="Job posting not found")
    session.delete(jp)
    session.commit()
    return {"ok": True}

