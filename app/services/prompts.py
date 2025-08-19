from __future__ import annotations

from typing import List, Dict


def llm_eval_prompt(question: str, answer: str) -> List[Dict[str, str]]:
    """답변 평가 프롬프트. JSON 스키마를 강제하여 안정적으로 파싱 가능하게 함."""
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


__all__ = ["llm_eval_prompt"]


