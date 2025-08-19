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
)
from app.services.agent_service import InterviewAgent
from app.services.feedback_service import generate_feedback, generate_feedback_async
from app.services.rag_service import retrieve_context, stream_question_from_context
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


@router.get("/{session_id}/feedback", response_model=FeedbackResponse)
def interview_feedback(session_id: int, session: Session = Depends(get_session), user=Depends(get_current_user)):
    report = generate_feedback(session, session_id)
    return FeedbackResponse(**report)


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
def list_sessions(session: Session = Depends(get_session), user=Depends(get_current_user)):
    user_id = str(user.get("sub", "default"))
    rows = session.exec(
        select(InterviewSession).where(InterviewSession.user_id == user_id).order_by(InterviewSession.id.desc())
    ).all()
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

