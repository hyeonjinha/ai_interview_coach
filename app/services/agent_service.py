from __future__ import annotations

from typing import List, Dict, Any
from sqlmodel import Session, select

from app.core.config import get_settings
from app.core.llm import get_llm
from app.models.entities import (
    InterviewSession,
    InterviewQuestion,
    InterviewAnswer,
    Experience,
    JobPosting,
)
from app.services.rag_service import build_documents, index_documents, retrieve_context, generate_question_from_context
from app.services.graph import build_interview_graph
from app.services.graph.state import InterviewState
from app.services.prompts import llm_eval_prompt


def _llm_eval_prompt(question: str, answer: str) -> List[Dict[str, str]]:
    return llm_eval_prompt(question, answer)


class InterviewAgent:
    def __init__(self, db: Session):
        self.db = db
        self.llm = get_llm()
        self.settings = get_settings()

    def start_session(self, user_id: str, job_posting_id: int, selected_experience_ids: List[int]) -> tuple[int, str, int]:
        job = self.db.get(JobPosting, job_posting_id)
        if not job:
            raise ValueError("Job posting not found")
        exps = [self.db.get(Experience, i) for i in selected_experience_ids]
        exps = [e for e in exps if e]

        # Index docs for RAG
        docs = build_documents(exps, job)
        index_documents(docs)

        sess = InterviewSession(user_id=user_id, job_posting_id=job_posting_id, selected_experience_ids=selected_experience_ids)
        self.db.add(sess)
        self.db.commit()
        self.db.refresh(sess)

        goal = "선택된 경험과 공고 우대사항을 바탕으로 핵심 역량을 검증"
        ctx = retrieve_context(goal, top_k=6)
        first_q = generate_question_from_context(goal, ctx, round_index=0)

        q = InterviewQuestion(session_id=sess.id, round_index=0, question_type="main", text=first_q)
        self.db.add(q)
        self.db.commit()
        self.db.refresh(q)

        return sess.id, first_q, q.id

    def next_question(self, session_id: int) -> Dict[str, Any]:
        # Return last created question in this session
        q = self.db.exec(
            select(InterviewQuestion).where(InterviewQuestion.session_id == session_id).order_by(InterviewQuestion.id.desc())
        ).first()
        if not q:
            raise ValueError("No question found for this session")
        return {"question": q.text, "question_id": q.id, "question_type": q.question_type, "round_index": q.round_index}

    def submit_answer(self, session_id: int, question_id: int, answer: str) -> Dict[str, Any]:
        q = self.db.get(InterviewQuestion, question_id)
        sess = self.db.get(InterviewSession, session_id)
        if not q or not sess:
            raise ValueError("Invalid session or question")

        # LangGraph 호출을 위한 상태 구성
        state: InterviewState = {
            "session_id": session_id,
            "user_id": sess.user_id,
            "current_round": sess.current_round or 0,
            "follow_up_count": sess.follow_up_count or 0,
            "last_question_id": question_id,
            "last_question_text": q.text,
            "last_answer_text": answer,
        }

        app = build_interview_graph(self.db)
        out: InterviewState = app.invoke(state)

        rating = out.get("last_rating", "VAGUE")  # type: ignore[assignment]
        notes = out.get("notes", {"summary": "", "hints": []})
        next_q_type = out.get("next_question_type", "main")
        next_action = "follow_up" if next_q_type == "follow_up" else "next_question"

        # 최신 세션의 follow_up_count 반영을 위해 리로드
        sess = self.db.get(InterviewSession, session_id)

        return {
            "rating": rating,
            "notes": notes,
            "next_action": next_action,
            "follow_up_count": getattr(sess, "follow_up_count", 0),
        }

