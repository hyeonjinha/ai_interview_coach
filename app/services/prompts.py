from __future__ import annotations

from typing import List, Dict


def llm_eval_prompt(question: str, answer: str) -> List[Dict[str, str]]:
    """답변 평가 프롬프트. JSON 스키마를 강제하여 안정적으로 파싱 가능하게 함.

    출력 스키마 예:
    {
      "rating": "GOOD|VAGUE|OFF_TOPIC",
      "notes": {
        "summary": "...요약",
        "hints": ["꼬리질문 단서1", "단서2"],
        "missing_dims": ["quantitative", "justification"]
      }
    }
    """
    sys = (
        "당신은 기술 면접관입니다. 아래 답변을 5가지 축으로 평가하고, "
        "분류(rating)와 개선을 위한 구체 힌트를 제공합니다."
    )
    usr = f"""
질문:
{question}

답변:
{answer}

평가기준(축):
1) 이해도(동문서답 여부)
2) 정량성(지표·규모·기간 등 수치 제시)
3) 기술적 깊이/정당화(선택 이유, 근거)
4) 트레이드오프/대안 비교
5) 과정/재현성(STAR, 운영/테스트/관측)

요구사항:
- rating을 GOOD | VAGUE | OFF_TOPIC 중 하나로 선정
- 부족한 축을 missing_dims로 나열(키: understanding, quantitative, justification, tradeoff, process)
- follow_up 힌트 1~2개 제시(한글, 15어 이내, 단문)
- 반드시 JSON만 반환:
  {{
    "rating": "...",
    "notes": {{
      "summary": "한글 1~2문장 요약",
      "hints": ["...", "..."],
      "missing_dims": ["quantitative", "justification"]
    }}
  }}
"""
    return [
        {"role": "system", "content": sys},
        {"role": "user", "content": usr},
    ]


__all__ = ["llm_eval_prompt"]


