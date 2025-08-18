from __future__ import annotations

import time
from datetime import datetime
from typing import Dict, Any, List
from sqlmodel import Session, select

from app.core.llm import get_llm
from app.models.db import get_session
from app.models.entities import InterviewSession, InterviewAnswer, InterviewQuestion, FeedbackReport


def _feedback_prompt(transcript: List[Dict[str, str]]) -> str:
    lines = []
    for t in transcript:
        lines.append(f"Q({t['round']},{t['type']}): {t['question']}")
        lines.append(f"A: {t['answer']}")
        lines.append(f"Eval: {t['evaluation']}")
    return "\n".join(lines)


def generate_feedback(db: Session, session_id: int) -> Dict[str, Any]:
    llm = get_llm()
    sess = db.get(InterviewSession, session_id)
    if not sess:
        raise ValueError("Session not found")

    q_list = db.exec(select(InterviewQuestion).where(InterviewQuestion.session_id == session_id).order_by(InterviewQuestion.id.asc())).all()
    a_map = {a.question_id: a for a in db.exec(select(InterviewAnswer).where(InterviewAnswer.session_id == session_id)).all()}

    transcript = []
    for q in q_list:
        a = a_map.get(q.id)
        transcript.append(
            {
                "round": q.round_index,
                "type": q.question_type,
                "question": q.text,
                "answer": a.answer_text if a else "(no answer)",
                "evaluation": a.evaluation if a else {},
            }
        )

    sys = (
        "당신은 시니어 면접 코치입니다. 대화 내역과 평가를 바탕으로 종합 피드백을 작성하세요."
    )
    usr = (
        _feedback_prompt(transcript)
        + "\n\n형식(JSON): {\"overall\":\"...\", \"strengths\":[""], \"areas\":[""], \"model_answer\":\"...\"}"
    )
    raw = llm.chat([
        {"role": "system", "content": sys},
        {"role": "user", "content": usr},
    ])

    import json
    overall = "전반적으로 수고하셨습니다. 핵심 근거 제시를 더 보강해보세요."
    strengths: List[str] = []
    areas: List[str] = ["정량적 성과 수치 제시", "기술 선택 이유와 대안 비교"]
    model_answer = "STAR 구조로 상황-과업-행동-결과를 명확히, 특히 결과는 수치로 제시하세요."
    try:
        parsed = json.loads(raw)
        overall = parsed.get("overall", overall)
        strengths = parsed.get("strengths", strengths)
        areas = parsed.get("areas", areas)
        model_answer = parsed.get("model_answer", model_answer)
    except Exception:
        pass

    return {
        "overall": overall,
        "strengths": strengths,
        "areas": areas,
        "model_answer": model_answer,
    }


def collect_interview_data(db: Session, session_id: int) -> List[Dict[str, Any]]:
    """면접 데이터 수집"""
    q_list = db.exec(select(InterviewQuestion).where(InterviewQuestion.session_id == session_id).order_by(InterviewQuestion.id.asc())).all()
    a_map = {a.question_id: a for a in db.exec(select(InterviewAnswer).where(InterviewAnswer.session_id == session_id)).all()}

    transcript = []
    for q in q_list:
        a = a_map.get(q.id)
        transcript.append(
            {
                "round": q.round_index,
                "type": q.question_type,
                "question": q.text,
                "answer": a.answer_text if a else "(no answer)",
                "evaluation": a.evaluation if a else {},
            }
        )
    return transcript


def prepare_feedback_prompt(transcript: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """피드백 프롬프트 준비"""
    sys = (
        "당신은 시니어 면접 코치입니다. 대화 내역과 평가를 바탕으로 종합 피드백을 작성하세요."
    )
    usr = (
        _feedback_prompt(transcript)
        + "\n\n형식(JSON): {\"overall\":\"...\", \"strengths\":[\"\"], \"areas\":[\"\"], \"model_answer\":\"...\"}"
    )
    return [
        {"role": "system", "content": sys},
        {"role": "user", "content": usr},
    ]


def parse_feedback_response(raw_feedback: str) -> Dict[str, Any]:
    """LLM 응답 파싱"""
    import json
    
    overall = "전반적으로 수고하셨습니다. 핵심 근거 제시를 더 보강해보세요."
    strengths: List[str] = ["면접에 적극적으로 참여해주셨습니다"]
    areas: List[str] = ["정량적 성과 수치 제시", "기술 선택 이유와 대안 비교"]
    model_answer = "STAR 구조로 상황-과업-행동-결과를 명확히, 특히 결과는 수치로 제시하세요."
    
    try:
        parsed = json.loads(raw_feedback)
        overall = parsed.get("overall", overall)
        strengths = parsed.get("strengths", strengths)
        areas = parsed.get("areas", areas)
        model_answer = parsed.get("model_answer", model_answer)
    except Exception:
        pass
    
    return {
        "overall": overall,
        "strengths": strengths,
        "areas": areas,
        "model_answer": model_answer,
    }


def generate_feedback_async(session_id: int, report_id: int):
    """백그라운드에서 실행되는 비동기 피드백 생성"""
    print(f"🚀 피드백 생성 시작: session_id={session_id}, report_id={report_id}")
    
    # 새로운 데이터베이스 세션 생성
    from app.models.db import engine
    with Session(engine) as db:
        report = db.get(FeedbackReport, report_id)
        if not report:
            print(f"❌ 리포트를 찾을 수 없습니다: {report_id}")
            return
        
        try:
            # 1. 상태 업데이트: processing
            print("📊 상태 업데이트: processing")
            report.status = "processing"
            report.progress = 10
            db.add(report)
            db.commit()
            time.sleep(1)  # 사용자가 상태 변화를 볼 수 있도록
            
            # 2. 데이터 수집 (30%)
            print("📋 면접 데이터 수집 중...")
            transcript = collect_interview_data(db, session_id)
            report.progress = 30
            db.add(report)
            db.commit()
            time.sleep(1)
            
            # 3. LLM 프롬프트 준비 (50%)
            print("🛠️ 프롬프트 준비 중...")
            prompt = prepare_feedback_prompt(transcript)
            report.progress = 50
            db.add(report)
            db.commit()
            time.sleep(1)
            
            # 4. LLM API 호출 (80%)
            print("🤖 AI 피드백 생성 중...")
            llm = get_llm()
            raw_feedback = llm.chat(prompt)
            report.progress = 80
            db.add(report)
            db.commit()
            time.sleep(1)
            
            # 5. 결과 파싱 및 저장 (100%)
            print("✅ 피드백 완성 및 저장 중...")
            parsed_feedback = parse_feedback_response(raw_feedback)
            report.status = "completed"
            report.progress = 100
            report.report = parsed_feedback
            report.completed_at = datetime.utcnow()
            
            print(f"🎉 피드백 생성 완료: session_id={session_id}")
            
        except Exception as e:
            print(f"❌ 피드백 생성 실패: {str(e)}")
            report.status = "failed"
            report.error_message = str(e)
        
        finally:
            db.add(report)
            db.commit()

