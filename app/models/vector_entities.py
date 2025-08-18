from __future__ import annotations

from typing import Optional, List, Dict, Any
from sqlmodel import SQLModel, Field, Column, JSON
from pgvector.sqlalchemy import Vector
from app.core.config import get_settings


def _dim() -> int:
    settings = get_settings()
    try:
        # 기본 1536(OpenAI text-embedding-3-small)
        return int(getattr(settings, "embedding_dim", 1536) or 1536)
    except Exception:
        return 1536


class RAGEmbedding(SQLModel, table=True):
    __tablename__ = "rag_embeddings"
    id: str = Field(primary_key=True)
    collection: str = Field(index=True)
    document: Optional[str] = None
    meta: Dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON))
    # Vector column (pgvector)
    embedding: Optional[List[float]] = Field(default=None, sa_column=Column(Vector(_dim())))


