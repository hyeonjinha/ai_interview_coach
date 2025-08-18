from __future__ import annotations

from typing import List, Dict, Any, Tuple
import numpy as np
from sqlmodel import Session, select

from app.core.embeddings import get_embedding_service, cosine_similarity
from app.models.entities import Experience, JobPosting


def _experience_text(exp: Experience) -> str:
    parts: List[str] = []
    if exp.title:
        parts.append(exp.title)
    if isinstance(exp.content, dict):
        for k in ["role", "responsibilities", "achievements", "tech_stack", "problems", "solutions", "summary", "description"]:
            v = exp.content.get(k)
            if v:
                parts.append(str(v))
    return "\n".join(parts)


def _job_query_text(sections: Dict[str, Any]) -> str:
    keys = ["main", "job_description", "responsibilities", "requirements", "preferred", "plus"]
    parts = [str(sections.get(k, "")) for k in keys if sections.get(k)]
    return "\n".join(parts)


def recommend_experiences(session: Session, user_id: str, job_posting_id: int, experience_ids: List[int] | None, threshold: float) -> List[Tuple[int, float, bool]]:
    jp: JobPosting | None = session.get(JobPosting, job_posting_id)
    if not jp:
        raise ValueError("Job posting not found")

    exps: List[Experience]
    if experience_ids:
        exps = [session.get(Experience, eid) for eid in experience_ids]
        exps = [e for e in exps if e and e.user_id == user_id]
    else:
        exps = session.exec(select(Experience).where(Experience.user_id == user_id)).all()

    texts = [_experience_text(e) for e in exps]
    query_text = _job_query_text(jp.sections) or (jp.raw_text or "")

    embedder = get_embedding_service()
    exp_embs = np.array(embedder.embed_texts(texts)) if texts else np.zeros((0, 384))
    q_emb = np.array(embedder.embed_texts([query_text]))[0] if query_text else np.zeros((384,))

    if exp_embs.shape[0] == 0:
        return []

    sims = cosine_similarity(exp_embs, q_emb.reshape(1, -1)).reshape(-1)

    ranked = sorted(zip(exps, sims), key=lambda x: float(x[1]), reverse=True)
    result: List[Tuple[int, float, bool]] = []
    for e, s in ranked:
        result.append((e.id, float(s), bool(s >= threshold)))
    return result

