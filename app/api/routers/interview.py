from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, BackgroundTasks
from fastapi.responses import StreamingResponse
from sqlmodel import Session

from app.models.db import get_session
from app.models.entities import InterviewSession, InterviewQuestion, InterviewAnswer, FeedbackReport
from app.models.schemas import (
    InterviewStartRequest,
    InterviewStartResponse,
    NextQuestionResponse,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    FeedbackResponse,
    InterviewSessionSummary,
    InterviewSessionDetail,
)
from app.services.agent_service import InterviewAgent
from app.services.feedback_service import generate_feedback, generate_feedback_async
from app.services.rag_service import retrieve_context, stream_question_from_context
from app.core.llm import get_llm
from app.core.config import get_settings
from app.services.prompts import llm_eval_prompt
import json
from typing import Dict, Any
from app.queues.local_db import LocalDBQueue
from app.services.stt_service import transcribe_audio_stub
from app.api.deps import get_current_user
from sqlmodel import select


router = APIRouter()


@router.post("/start", response_model=InterviewStartResponse)
def start_interview(payload: InterviewStartRequest, session: Session = Depends(get_session), user=Depends(get_current_user)):
    payload.user_id = payload.user_id or user.get("sub", "default")
    agent = InterviewAgent(session)
    sid, q, qid = agent.start_session(payload.user_id, payload.job_posting_id, payload.selected_experience_ids)
    return InterviewStartResponse(session_id=sid, first_question=q, first_question_id=qid)


@router.get("/{session_id}/next", response_model=NextQuestionResponse)
def next_question(session_id: int, session: Session = Depends(get_session), user=Depends(get_current_user)):
    agent = InterviewAgent(session)
    data = agent.next_question(session_id)
    return NextQuestionResponse(**data)


@router.post("/{session_id}/answer/{question_id}", response_model=SubmitAnswerResponse)
def submit_answer(session_id: int, question_id: int, payload: SubmitAnswerRequest, session: Session = Depends(get_session), user=Depends(get_current_user)):
    agent = InterviewAgent(session)
    data = agent.submit_answer(session_id, question_id, payload.answer)
    return SubmitAnswerResponse(**data)


# 중복 정의 방지: 피드백 조회는 하단의 단일 엔드포인트를 사용


@router.post("/{session_id}/answer/{question_id}/audio", response_model=SubmitAnswerResponse)
async def submit_answer_audio(
    session_id: int,
    question_id: int,
    file: UploadFile = File(...),
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    # 스텁: 파일명을 이용해 텍스트 추출한 것으로 간주
    text = transcribe_audio_stub(file.filename)
    agent = InterviewAgent(session)
    data = agent.submit_answer(session_id, question_id, text)
    return SubmitAnswerResponse(**data)


@router.post("/{session_id}/end")
def end_interview(session_id: int, background_tasks: BackgroundTasks, session: Session = Depends(get_session), user=Depends(get_current_user)):
    # 1. 면접 상태를 completed로 변경
    interview_session = session.get(InterviewSession, session_id)
    if not interview_session:
        raise HTTPException(status_code=404, detail="Interview session not found")
    
    interview_session.status = "completed"
    session.add(interview_session)
    session.commit()
    
    # 2. 피드백 리포트 생성 시작 (기존 리포트가 있다면 삭제)
    existing_report = session.exec(
        select(FeedbackReport).where(FeedbackReport.session_id == session_id)
    ).first()
    if existing_report:
        session.delete(existing_report)
        session.commit()
    
    feedback_report = FeedbackReport(session_id=session_id, status="pending")
    session.add(feedback_report)
    session.commit()
    session.refresh(feedback_report)
    
    # 3. 큐에 작업 enqueue (워커가 처리)
    q = LocalDBQueue()
    q.enqueue("generate_feedback", {"session_id": session_id})
    
    return {"message": "피드백 생성을 시작했습니다", "session_id": session_id, "report_id": feedback_report.id}


@router.get("/{session_id}/next/stream")
def next_question_stream(session_id: int, session: Session = Depends(get_session), user=Depends(get_current_user)):
    """다음 질문(메인) 스트리밍. LangGraph 병렬 사전생성 없이도 체감 개선용.
    현재 세션의 goal/컨텍스트를 조회하여 스트리밍으로 질문을 전송한다.
    """
    # 세션/라운드 정보 조회
    s = session.get(InterviewSession, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Interview session not found")

    goal = "다음 핵심 역량을 검증" if (s.current_round or 0) > 0 else "선택된 경험과 공고 우대사항을 바탕으로 핵심 역량을 검증"
    ctx = retrieve_context(goal, top_k=6)

    def generator():
        for chunk in stream_question_from_context(goal, ctx, round_index=s.current_round or 0):
            yield chunk

    return StreamingResponse(generator(), media_type="text/plain; charset=utf-8")


@router.post("/{session_id}/answer/{question_id}/stream")
def submit_answer_stream(
    session_id: int,
    question_id: int,
    payload: SubmitAnswerRequest,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    """답변 평가 후 다음 질문을 SSE로 스트리밍 전송."""
    s = session.get(InterviewSession, session_id)
    q = session.get(InterviewQuestion, question_id)
    if not s or not q:
        raise HTTPException(status_code=404, detail="Invalid session or question")

    settings = get_settings()
    llm = get_llm()

    def sse(msg: Dict[str, Any], event: str | None = None) -> bytes:
        prefix = f"event: {event}\n" if event else ""
        return (prefix + f"data: {json.dumps(msg, ensure_ascii=False)}\n\n").encode("utf-8")

    def generator():
        # 1) 평가
        messages = llm_eval_prompt(q.text, payload.answer)
        raw = llm.chat(messages)
        rating = "VAGUE"
        notes: Dict[str, Any] = {"summary": raw, "hints": []}
        try:
            import re
            match = re.search(r"\{[\s\S]*\}", raw)
            payload_json = match.group(0) if match else raw
            parsed = json.loads(payload_json)
            rating = parsed.get("rating", rating)
            notes = parsed.get("notes", notes)
        except Exception:
            pass

        # 답변 저장
        ans = InterviewAnswer(
            session_id=session_id,
            question_id=question_id,
            answer_text=payload.answer,
            evaluation={"rating": rating, "notes": notes},
        )
        session.add(ans)
        session.commit()

        # 평가 이벤트 전송
        yield sse({"rating": rating, "notes": notes}, event="evaluation")

        # 2) 분기 결정
        follow_up_count = s.follow_up_count or 0
        route = "NEXT_ROUND"
        if rating != "GOOD" and follow_up_count < settings.max_follow_ups:
            route = "FOLLOW_UP"

        # 3) 질문 스트리밍/생성 및 저장
        yield b"event: question_start\n\n"
        if route == "FOLLOW_UP":
            hint_text = "; ".join(notes.get("hints", [])[:2]) if notes.get("hints") else "성과를 정량적으로 제시하고, 기술 선택의 이유를 설명해주세요."
            q2 = InterviewQuestion(
                session_id=session_id,
                round_index=s.current_round or 0,
                question_type="follow_up",
                text=hint_text,
                parent_question_id=question_id,
            )
            s.follow_up_count = follow_up_count + 1
            session.add(q2); session.add(s); session.commit(); session.refresh(q2)

            yield sse({"content": hint_text}, event="question_chunk")
            yield sse({"question_id": q2.id, "question_type": q2.question_type, "round_index": q2.round_index}, event="question_end")
        else:
            goal = "다음 핵심 역량을 검증" if (s.current_round or 0) > 0 else "선택된 경험과 공고 우대사항을 바탕으로 핵심 역량을 검증"
            ctx = retrieve_context(goal, top_k=6)
            full = []
            for chunk in stream_question_from_context(goal, ctx, round_index=s.current_round or 0):
                full.append(chunk)
                yield sse({"content": chunk}, event="question_chunk")

            text = ("".join(full)).strip()
            s.current_round = (s.current_round or 0) + 1
            s.follow_up_count = 0
            q2 = InterviewQuestion(
                session_id=session_id,
                round_index=s.current_round,
                question_type="main",
                text=text,
            )
            session.add(q2); session.add(s); session.commit(); session.refresh(q2)

            yield sse({"question_id": q2.id, "question_type": q2.question_type, "round_index": q2.round_index}, event="question_end")

        yield b"event: done\n\n"

    return StreamingResponse(generator(), media_type="text/event-stream")


@router.get("/{session_id}/feedback/status")
def get_feedback_status(session_id: int, session: Session = Depends(get_session), user=Depends(get_current_user)):
    """피드백 생성 상태 확인"""
    report = session.exec(
        select(FeedbackReport).where(FeedbackReport.session_id == session_id)
    ).first()
    
    if not report:
        return {"status": "not_found"}
    
    return {
        "status": report.status,
        "progress": report.progress,
        "report": report.report if report.status == "completed" else None,
        "error": report.error_message,
        "created_at": report.created_at,
        "completed_at": report.completed_at
    }


@router.get("/{session_id}/feedback", response_model=FeedbackResponse)
def interview_feedback(session_id: int, session: Session = Depends(get_session), user=Depends(get_current_user)):
    """완료된 피드백 조회"""
    report = session.exec(
        select(FeedbackReport).where(FeedbackReport.session_id == session_id)
    ).first()
    
    if not report:
        # 기존 방식으로 즉시 생성 (하위 호환)
        feedback_data = generate_feedback(session, session_id)
        return FeedbackResponse(**feedback_data)
    
    if report.status != "completed":
        raise HTTPException(status_code=202, detail="피드백이 아직 생성 중입니다")
    
    if not report.report:
        raise HTTPException(status_code=404, detail="피드백 데이터를 찾을 수 없습니다")
    
    return FeedbackResponse(**report.report)


@router.get("/{session_id}/transcript")
def get_transcript(session_id: int, session: Session = Depends(get_session), user=Depends(get_current_user)):
    q_list = session.exec(select(InterviewQuestion).where(InterviewQuestion.session_id == session_id).order_by(InterviewQuestion.id.asc())).all()
    a_map = {a.question_id: a for a in session.exec(select(InterviewAnswer).where(InterviewAnswer.session_id == session_id)).all()}
    items = []
    for q in q_list:
        a = a_map.get(q.id)
        items.append({
            "round": q.round_index,
            "type": q.question_type,
            "question": q.text,
            "answer": a.answer_text if a else None,
            "evaluation": a.evaluation if a else None,
        })
    return {"items": items}


@router.get("/", response_model=list[InterviewSessionSummary])
def list_sessions(include_legacy: bool = False, session: Session = Depends(get_session), user=Depends(get_current_user)):
    user_id = str(user.get("sub", "default"))
    if include_legacy:
        from sqlalchemy import or_
        q = select(InterviewSession).where(or_(InterviewSession.user_id == user_id, InterviewSession.user_id == "default"))
    else:
        q = select(InterviewSession).where(InterviewSession.user_id == user_id)
    rows = session.exec(q.order_by(InterviewSession.id.desc())).all()
    data = [
        InterviewSessionSummary(
            id=r.id,
            user_id=r.user_id,
            job_posting_id=r.job_posting_id,
            status=r.status,
            current_round=r.current_round,
            follow_up_count=r.follow_up_count,
            created_at=r.created_at,
        )
        for r in rows
    ]
    return data


@router.get("/{session_id}", response_model=InterviewSessionDetail)
def get_session_detail(session_id: int, session: Session = Depends(get_session), user=Depends(get_current_user)):
    s = session.get(InterviewSession, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Interview session not found")
    # 권한 확인(동일 사용자 또는 legacy default 허용)
    uid = str(user.get("sub", "default"))
    if s.user_id not in (uid, "default"):
        raise HTTPException(status_code=403, detail="Forbidden")

    # 마지막 질문 텍스트(있으면)
    last_q = session.exec(
        select(InterviewQuestion).where(InterviewQuestion.session_id == session_id).order_by(InterviewQuestion.id.desc())
    ).first()

    return InterviewSessionDetail(
        id=s.id,
        user_id=s.user_id,
        job_posting_id=s.job_posting_id,
        status=s.status,
        current_round=s.current_round,
        follow_up_count=s.follow_up_count,
        created_at=s.created_at,
        last_question=(last_q.text if last_q else None),
    )


@router.delete("/{session_id}")
def delete_session(session_id: int, session: Session = Depends(get_session), user=Depends(get_current_user)):
    s = session.get(InterviewSession, session_id)
    if not s:
        raise HTTPException(status_code=404, detail="Interview session not found")
    uid = str(user.get("sub", "default"))
    if s.user_id not in (uid, "default"):
        raise HTTPException(status_code=403, detail="Forbidden")

    # 관련 데이터 삭제(answers, questions, feedback)
    answers = session.exec(select(InterviewAnswer).where(InterviewAnswer.session_id == session_id)).all()
    for a in answers:
        session.delete(a)
    questions = session.exec(select(InterviewQuestion).where(InterviewQuestion.session_id == session_id)).all()
    for q in questions:
        session.delete(q)
    reports = session.exec(select(FeedbackReport).where(FeedbackReport.session_id == session_id)).all()
    for r in reports:
        session.delete(r)

    session.delete(s)
    session.commit()
    return {"ok": True}

