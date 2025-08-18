from __future__ import annotations

from typing import List, Dict, Any
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


def generate_question_from_context(goal: str, context_chunks: List[str]) -> str:
    llm = get_llm()
    context = "\n\n".join(context_chunks[:6])
    sys = (
        "당신은 엄격하지만 공정한 시니어 면접관입니다. 제공된 근거 자료에 기반해 "
        "지원자의 실제 수행 능력과 의사결정 이유를 검증할 심층 질문을 1개 생성하세요."
    )
    usr = (
        f"면접 목표:\n{goal}\n\n"
        f"근거 자료:\n{context}\n\n"
        "요청: 경험 사실 검증과 기술 선택의 이유(Trade-off) 확인이 함께 드러나게 질문 1개만 한국어로 작성."
    )
    out = llm.chat([
        {"role": "system", "content": sys},
        {"role": "user", "content": usr},
    ])
    return out.strip()

