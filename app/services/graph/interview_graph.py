from __future__ import annotations

from typing import Callable

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from sqlmodel import Session as DBSession

from app.services.graph.state import InterviewState
from app.services.rag_service import retrieve_context, generate_question_from_context
from app.core.llm import get_llm
from app.services.prompts import llm_eval_prompt
from app.models.entities import InterviewSession, InterviewQuestion, InterviewAnswer


def node_load_goal_and_context(state: InterviewState, db: DBSession) -> InterviewState:
    # 라운드에 따라 goal 설정
    goal = (
        "다음 핵심 역량을 검증" if state.get("current_round", 0) > 0 else "선택된 경험과 공고 우대사항을 바탕으로 핵심 역량을 검증"
    )
    ctx = retrieve_context(goal, top_k=6)
    state["goal"] = goal
    state["context"] = ctx
    return state


def node_save_answer_and_evaluate(state: InterviewState, db: DBSession) -> InterviewState:
    # 답변 저장 및 평가
    qid = state["last_question_id"]
    messages = llm_eval_prompt(state["last_question_text"], state["last_answer_text"])
    raw = get_llm().chat(messages)

    import json, re

    rating = "VAGUE"
    notes = {"summary": raw, "hints": []}
    try:
        m = re.search(r"\{[\s\S]*\}", raw)
        payload = m.group(0) if m else raw
        parsed = json.loads(payload)
        rating = parsed.get("rating", rating)
        notes = parsed.get("notes", notes)
    except Exception:
        pass

    ans = InterviewAnswer(
        session_id=state["session_id"],
        question_id=qid,
        answer_text=state["last_answer_text"],
        evaluation={"rating": rating, "notes": notes},
    )
    db.add(ans)
    db.commit()

    state["last_rating"] = rating
    state["notes"] = notes
    return state


def node_generate_follow_up(state: InterviewState, db: DBSession) -> InterviewState:
    hints = state.get("notes", {}).get("hints") or []
    if hints:
        fu = "; ".join(hints)
    else:
        fu = "성과를 정량적으로 제시하고, 기술 선택의 이유를 설명해주세요."
    state["candidate_follow_up"] = fu
    return state


def node_generate_next_main(state: InterviewState, db: DBSession) -> InterviewState:
    nxt = generate_question_from_context(state["goal"], state["context"], round_index=state.get("current_round", 0))
    state["candidate_next_main"] = nxt
    return state


def _decide_route(state: InterviewState, db: DBSession) -> str:
    sess = db.get(InterviewSession, state["session_id"])  # type: ignore[arg-type]
    rating = state.get("last_rating", "VAGUE")
    if rating == "GOOD":
        return "NEXT_ROUND"
    if getattr(sess, "follow_up_count", 0) < getattr(sess, "max_follow_ups", 3):
        return "FOLLOW_UP"
    return "NEXT_ROUND"


def node_emit_question(state: InterviewState, db: DBSession, route: str) -> InterviewState:
    sess = db.get(InterviewSession, state["session_id"])  # type: ignore[arg-type]
    if route == "FOLLOW_UP":
        text = state.get("candidate_follow_up") or "조금 더 구체적으로 설명해주세요."
        q = InterviewQuestion(
            session_id=sess.id,
            round_index=sess.current_round,
            question_type="follow_up",
            text=text,
            parent_question_id=state["last_question_id"],
        )
        sess.follow_up_count = (sess.follow_up_count or 0) + 1
    else:
        text = state.get("candidate_next_main") or "다음 역량에 대해 설명해주세요."
        sess.current_round = (sess.current_round or 0) + 1
        sess.follow_up_count = 0
        q = InterviewQuestion(
            session_id=sess.id,
            round_index=sess.current_round,
            question_type="main",
            text=text,
        )

    db.add(q)
    db.add(sess)
    db.commit()
    db.refresh(q)

    state["next_question_id"] = q.id
    state["next_question_text"] = q.text
    state["next_question_type"] = q.question_type  # type: ignore[assignment]
    state["next_round_index"] = q.round_index
    return state


def build_interview_graph(db: DBSession):
    g = StateGraph(InterviewState)

    # 래퍼로 DB 주입
    def wrap(fn: Callable[[InterviewState, DBSession], InterviewState]):
        return lambda s: fn(s, db)

    g.add_node("load_ctx", wrap(node_load_goal_and_context))
    g.add_node("save_and_eval", wrap(node_save_answer_and_evaluate))
    g.add_node("gen_follow_up", wrap(node_generate_follow_up))
    g.add_node("gen_next_main", wrap(node_generate_next_main))

    g.add_node("emit_follow_up", lambda s: node_emit_question(s, db, "FOLLOW_UP"))
    g.add_node("emit_next_round", lambda s: node_emit_question(s, db, "NEXT_ROUND"))

    g.set_entry_point("load_ctx")
    g.add_edge("load_ctx", "save_and_eval")

    # 후보 병렬 생성: 두 경로 모두로 에지 연결
    g.add_edge("save_and_eval", "gen_follow_up")
    g.add_edge("save_and_eval", "gen_next_main")

    # 간단 라우팅: gen_follow_up 이후 분기 (gen_next_main는 사이드 이펙트로 가정)
    def route_decider(state: InterviewState):
        return "emit_follow_up" if _decide_route(state, db) == "FOLLOW_UP" else "emit_next_round"

    g.add_conditional_edges(
        "gen_follow_up",
        route_decider,
        {"emit_follow_up": "emit_follow_up", "emit_next_round": "emit_next_round"},
    )

    g.add_edge("emit_follow_up", END)
    g.add_edge("emit_next_round", END)

    app = g.compile(checkpointer=MemorySaver())
    return app


