from __future__ import annotations

from typing import TypedDict, List, Optional, Literal, Dict, Any


class InterviewState(TypedDict, total=False):
    """LangGraph에서 사용하는 최소 상태 정의.

    데이터베이스에 저장/질의가 필요한 정보는 노드에서 처리하고,
    여기에는 분기 결정을 위한 핵심 상태만 유지한다.
    """

    # 세션/라운드 진행
    session_id: int
    user_id: str
    current_round: int
    follow_up_count: int

    # 이번에 평가할 Q/A
    last_question_id: int
    last_question_text: str
    last_answer_text: str

    # 평가 결과
    last_rating: Literal["GOOD", "VAGUE", "OFF_TOPIC"]
    notes: Dict[str, Any]

    # 목적/컨텍스트
    goal: str
    context: List[str]

    # 병렬 생성 후보
    candidate_follow_up: Optional[str]
    candidate_next_main: Optional[str]

    # 최종 출력(질문 확정 후)
    next_question_id: Optional[int]
    next_question_text: Optional[str]
    next_question_type: Literal["main", "follow_up"]
    next_round_index: Optional[int]


