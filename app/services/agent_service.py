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


def _llm_eval_prompt(question: str, answer: str) -> List[Dict[str, str]]:
    sys = (
        "당신은 기술 면접관입니다. 아래 답변을 4가지 기준으로 평가하고, "
        "분류(rating)와 개선을 위한 구체 힌트를 제공합니다."
    )
    usr = f"""
질문:
{question}

답변:
{answer}

평가기준:
1) 질문 이해도 (동문서답 여부)
2) STAR 구조 준수 및 결과의 정량적 수치 제시 여부
3) 기술적 깊이(왜 그 기술/방법을 선택했는가, 트레이드오프 이해)
4) 문제 해결 과정의 선명도

요구사항:
- rating을 GOOD | VAGUE | OFF_TOPIC 중 하나로 선정
- 모호하거나 누락된 부분에 대해 follow_up 힌트 1~2개 제시(한국어)
- JSON만 반환: {{"rating": "...", "notes": {{"summary": "...", "hints": ["...", "..."]}}}}
"""
    return [
        {"role": "system", "content": sys},
        {"role": "user", "content": usr},
    ]


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
        first_q = generate_question_from_context(goal, ctx)

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

        # Evaluate
        messages = _llm_eval_prompt(q.text, answer)
        raw = self.llm.chat(messages)

        rating = "VAGUE"
        notes: Dict[str, Any] = {"summary": raw, "hints": []}
        # Try parse JSON block if exists
        import json, re
        try:
            # Extract JSON object if wrapped in text
            match = re.search(r"\{[\s\S]*\}", raw)
            payload = match.group(0) if match else raw
            parsed = json.loads(payload)
            rating = parsed.get("rating", rating)
            notes = parsed.get("notes", notes)
        except Exception:
            # keep heuristic output
            pass

        ans = InterviewAnswer(session_id=session_id, question_id=question_id, answer_text=answer, evaluation={"rating": rating, "notes": notes})
        self.db.add(ans)
        self.db.commit()
        self.db.refresh(ans)

        next_action = "next_question"
        follow_up_count = sess.follow_up_count

        if rating == "GOOD":
            # proceed to next main question
            sess.current_round += 1
            sess.follow_up_count = 0
            goal = "다음 핵심 역량을 검증"
            ctx = retrieve_context(goal, top_k=6)
            nxt = generate_question_from_context(goal, ctx)
            q2 = InterviewQuestion(session_id=session_id, round_index=sess.current_round, question_type="main", text=nxt)
            self.db.add(q2)
            next_action = "next_question"
        elif rating == "OFF_TOPIC":
            # re-focus on intent
            if follow_up_count < self.settings.max_follow_ups:
                hint = notes.get("summary", "질문의 의도에 맞춰 핵심을 다시 설명해주세요.")
                fu = InterviewQuestion(session_id=session_id, round_index=sess.current_round, question_type="follow_up", text=f"핵심은 다음과 같습니다: {hint}. 이를 바탕으로 다시 간단히 답변해주세요.", parent_question_id=question_id)
                self.db.add(fu)
                sess.follow_up_count += 1
                next_action = "follow_up"
            else:
                sess.follow_up_count = 0
                sess.current_round += 1
                ctx = retrieve_context("새로운 역량 질문", top_k=6)
                nxt = generate_question_from_context("새로운 역량 질문", ctx)
                q2 = InterviewQuestion(session_id=session_id, round_index=sess.current_round, question_type="main", text=nxt)
                self.db.add(q2)
                next_action = "next_question"
        else:  # VAGUE
            if follow_up_count < self.settings.max_follow_ups:
                hints = notes.get("hints", [])
                hint_text = "; ".join(hints) if hints else "성과를 정량적으로 제시하고, 기술 선택의 이유를 설명해주세요."
                fu = InterviewQuestion(session_id=session_id, round_index=sess.current_round, question_type="follow_up", text=hint_text, parent_question_id=question_id)
                self.db.add(fu)
                sess.follow_up_count += 1
                next_action = "follow_up"
            else:
                sess.follow_up_count = 0
                sess.current_round += 1
                ctx = retrieve_context("다음 질문", top_k=6)
                nxt = generate_question_from_context("다음 질문", ctx)
                q2 = InterviewQuestion(session_id=session_id, round_index=sess.current_round, question_type="main", text=nxt)
                self.db.add(q2)
                next_action = "next_question"

        self.db.add(sess)
        self.db.commit()

        return {"rating": rating, "notes": notes, "next_action": next_action, "follow_up_count": sess.follow_up_count}

