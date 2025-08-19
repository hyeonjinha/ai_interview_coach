from __future__ import annotations

from typing import List, Dict, Any, Optional
from sqlmodel import Session

from app.core.vectorstore import VectorStore
from app.core.llm import get_llm
from app.models.entities import Experience, JobPosting


def build_documents(experiences: List[Experience], job: JobPosting) -> List[Dict[str, Any]]:
    docs: List[Dict[str, Any]] = []
    for e in experiences:
        text_parts: List[str] = []
        if e.title:
            text_parts.append(f"[Experience Title] {e.title}")
        if isinstance(e.content, dict):
            for k, v in e.content.items():
                if v:
                    text_parts.append(f"[{k}] {v}")
        text = "\n".join(text_parts)
        docs.append({"text": text, "meta": {"type": "experience", "experience_id": e.id}})
    # job sections
    if isinstance(job.sections, dict):
        for k, v in job.sections.items():
            if v:
                docs.append({"text": str(v), "meta": {"type": "job", "section": k, "job_posting_id": job.id}})
    elif job.raw_text:
        docs.append({"text": job.raw_text, "meta": {"type": "job", "section": "raw", "job_posting_id": job.id}})
    return docs


def index_documents(docs: List[Dict[str, Any]]) -> None:
    vs = VectorStore(collection_name="interview_kb")
    vs.upsert(documents=[d["text"] for d in docs], metadatas=[d["meta"] for d in docs])


def retrieve_context(question: str, top_k: int = 6) -> List[str]:
    vs = VectorStore(collection_name="interview_kb")
    res = vs.query(question, n_results=top_k)
    docs = res.get("documents", [[]])[0]
    return docs or []


def generate_question_from_context(goal: str, context_chunks: List[str], round_index: Optional[int] = None) -> str:
    """컨텍스트 기반 메인 질문 생성.

    규칙:
    - 1~2문장, 25~45어(라운드 3+는 35~60 허용)
    - 컨텍스트 스니펫을 1회 이상 직접 언급/인용
    - 무엇/왜/어떻게/결과(수치) 중 최소 2개 축 포함
    - 라운드에 따라 난이도 조정
    """
    llm = get_llm()
    context = "\n\n".join(context_chunks[:6])

    # 라운드 기반 난이도 안내
    if round_index is None:
        difficulty = "Round 1: 사실 검증 + 핵심 성과(지표·규모·기간)."
        length_rule = "한글 1~2문장, 25~45어."
    elif round_index <= 1:
        difficulty = "Round 1: 사실 검증 + 핵심 성과(지표·규모·기간)."
        length_rule = "한글 1~2문장, 25~45어."
    elif round_index == 2:
        difficulty = "Round 2: 설계·성능·운영 트레이드오프와 대안 비교."
        length_rule = "한글 1~2문장, 25~45어."
    else:
        difficulty = "Round 3+: 실패/장애/한계 대응, 모니터링/재현성/개선 반복."
        length_rule = "한글 1~2문장, 35~60어."

    sys = (
        "당신은 엄격하지만 공정한 시니어 면접관입니다. 제공된 근거 자료에 기반해 질문을 생성합니다. "
        "질문은 환각 없이 컨텍스트를 직접 인용/언급해야 하며, 무엇/왜/어떻게/결과(수치) 중 최소 2개 축을 포함합니다."
    )
    usr = (
        f"면접 목표:\n{goal}\n\n"
        f"근거 자료(발췌):\n{context}\n\n"
        f"난이도: {difficulty}\n"
        f"길이 규칙: {length_rule}\n"
        "제약:\n"
        "- 컨텍스트 구절을 1회 이상 직접 언급(예: 대괄호 포함 텍스트).\n"
        "- 복수 질문/리스트/나열식 금지. 의문문 1개.\n"
        "- 하나의 핵심만 묻기.\n\n"
        "출력: 질문 문장만 반환."
    )
    out = llm.chat([
        {"role": "system", "content": sys},
        {"role": "user", "content": usr},
    ])
    return out.strip()

