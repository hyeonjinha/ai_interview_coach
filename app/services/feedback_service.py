from __future__ import annotations

import time
from datetime import datetime
from typing import Dict, Any, List
from sqlmodel import Session, select

from app.core.llm import get_llm
from app.models.db import get_session
from app.models.entities import InterviewSession, InterviewAnswer, InterviewQuestion, FeedbackReport


def _feedback_prompt(transcript: List[Dict[str, str]]) -> str:
    """면접 전사와 평가 결과를 종합한 피드백 프롬프트"""
    lines = []
    for t in transcript:
        lines.append(f"Q({t['round']},{t['type']}): {t['question']}")
        lines.append(f"A: {t['answer']}")
        if t.get('evaluation'):
            eval_data = t['evaluation']
            lines.append(f"평가: {eval_data.get('rating', 'N/A')}")
            if eval_data.get('notes'):
                notes = eval_data['notes']
                if notes.get('missing_dims'):
                    lines.append(f"부족한 요소: {', '.join(notes['missing_dims'])}")
                if notes.get('hints'):
                    lines.append(f"개선 힌트: {', '.join(notes['hints'])}")
        lines.append("---")
    
    return "\n".join(lines)


def _project_improvement_prompt(transcript: List[Dict[str, str]], project_context: str = "") -> str:
    """프로젝트 기반 개선 제안 프롬프트"""
    context_info = f"프로젝트 컨텍스트: {project_context}\n\n" if project_context else ""
    
    return f"""{context_info}면접 내용을 바탕으로 프로젝트 개선 방향을 제안하세요.

면접 내용:
{_feedback_prompt(transcript)}

프로젝트 개선 제안:
1. 추가하면 좋을 내용: 프로젝트에 보완하면 좋을 기술적 요소나 과정
2. 구체화 방향: 이미 언급된 내용을 더 구체적으로 발전시킬 방향
3. 실무 적용: 실제 업무에서 활용할 수 있는 구체적 방법

형식(JSON): {{
  "additional_content": ["추가할 내용 1", "추가할 내용 2"],
  "concretization": ["구체화 방향 1", "구체화 방향 2"],
  "practical_application": ["실무 적용 방법 1", "실무 적용 방법 2"]
}}"""


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

    # 1. 종합 피드백 생성 (질문별 평가 결과 종합)
    sys_overall = (
        "당신은 시니어 면접 코치입니다. 질문별 평가 결과를 종합하여 "
        "구체적이고 실행 가능한 피드백을 작성하세요."
    )
    usr_overall = (
        _feedback_prompt(transcript)
        + "\n\n위 면접 내용과 평가 결과를 바탕으로 종합 피드백을 작성하세요."
        + "\n\n형식(JSON): {\"overall\":\"...\", \"strengths\":[\"\"], \"areas\":[\"\"], \"detailed_analysis\":\"...\"}"
    )
    
    raw_overall = llm.chat([
        {"role": "system", "content": sys_overall},
        {"role": "user", "content": usr_overall},
    ])

    # 2. 프로젝트 개선 제안 생성
    sys_project = (
        "당신은 시니어 기술 리더입니다. 면접 내용을 바탕으로 "
        "프로젝트 개선 방향을 구체적으로 제안하세요."
    )
    usr_project = _project_improvement_prompt(transcript)
    
    raw_project = llm.chat([
        {"role": "system", "content": sys_project},
        {"role": "user", "content": usr_project},
    ])

    # 3. 결과 파싱 및 통합
    import json
    
    # 기본값 설정
    overall = "전반적으로 수고하셨습니다. 질문별 평가 결과를 바탕으로 개선 방향을 제시합니다."
    strengths: List[str] = []
    areas: List[str] = []
    detailed_analysis = "면접 내용을 종합 분석한 결과입니다."
    project_suggestions = {
        "additional_content": ["프로젝트에 추가하면 좋을 내용"],
        "concretization": ["구체화할 방향"],
        "practical_application": ["실무 적용 방법"]
    }
    
    try:
        # 종합 피드백 파싱
        parsed_overall = json.loads(raw_overall)
        overall = parsed_overall.get("overall", overall)
        strengths = parsed_overall.get("strengths", strengths)
        areas = parsed_overall.get("areas", areas)
        detailed_analysis = parsed_overall.get("detailed_analysis", detailed_analysis)
        
        # 프로젝트 제안 파싱
        parsed_project = json.loads(raw_project)
        project_suggestions = parsed_project
    except Exception as e:
        print(f"피드백 파싱 실패: {e}")
        pass

    return {
        "overall": overall,
        "strengths": strengths,
        "areas": areas,
        "detailed_analysis": detailed_analysis,
        "project_suggestions": project_suggestions,
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
    
    overall = "전반적으로 수고하셨습니다. 질문별 평가 결과를 바탕으로 개선 방향을 제시합니다."
    strengths: List[str] = ["면접에 적극적으로 참여해주셨습니다"]
    areas: List[str] = []
    detailed_analysis = "면접 내용을 종합 분석한 결과입니다."
    project_suggestions = {
        "additional_content": ["프로젝트에 추가하면 좋을 내용"],
        "concretization": ["구체화할 방향"],
        "practical_application": ["실무 적용 방법"]
    }
    
    try:
        parsed = json.loads(raw_feedback)
        overall = parsed.get("overall", overall)
        strengths = parsed.get("strengths", strengths)
        areas = parsed.get("areas", areas)
        detailed_analysis = parsed.get("detailed_analysis", detailed_analysis)
        project_suggestions = parsed.get("project_suggestions", project_suggestions)
    except Exception:
        pass
    
    return {
        "overall": overall,
        "strengths": strengths,
        "areas": areas,
        "detailed_analysis": detailed_analysis,
        "project_suggestions": project_suggestions,
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

