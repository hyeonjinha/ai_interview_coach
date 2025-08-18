from __future__ import annotations

from typing import Dict, Any
from sqlmodel import Session

from app.models.db import engine
from app.services.feedback_service import collect_interview_data, prepare_feedback_prompt, parse_feedback_response
from app.core.llm import get_llm
from app.core.vectorstore import VectorStore


def handle_generate_feedback(payload: Dict[str, Any]) -> None:
    session_id = int(payload["session_id"])  # required
    from app.models.entities import FeedbackReport
    from datetime import datetime

    with Session(engine) as db:
        report = db.exec(
            db.select(FeedbackReport).where(FeedbackReport.session_id == session_id)
        ).first() if hasattr(db, "select") else db.query(FeedbackReport).filter_by(session_id=session_id).first()
        # 보수적 처리: 없으면 생성
        if not report:
            report = FeedbackReport(session_id=session_id, status="processing")
            db.add(report)
            db.commit()
            db.refresh(report)
        report.status = "processing"
        db.add(report)
        db.commit()

        transcript = collect_interview_data(db, session_id)
        prompt = prepare_feedback_prompt(transcript)
        llm = get_llm()
        raw = llm.chat(prompt)
        parsed = parse_feedback_response(raw)

        report.status = "completed"
        report.report = parsed
        report.completed_at = datetime.utcnow()
        db.add(report)
        db.commit()


def handle_embed_documents(payload: Dict[str, Any]) -> None:
    # payload: {documents: [{text, meta}, ...], collection?: str}
    docs = payload.get("documents", [])
    collection = payload.get("collection", "interview_kb")
    if not docs:
        return
    vs = VectorStore(collection_name=collection)
    vs.upsert([d["text"] for d in docs], [d.get("meta", {}) for d in docs])


def handle(job_type: str, payload: Dict[str, Any]) -> None:
    if job_type == "generate_feedback":
        handle_generate_feedback(payload)
    elif job_type == "embed_documents":
        handle_embed_documents(payload)
    else:
        # 확장 포인트: STT, 레포트 요약 등
        pass


