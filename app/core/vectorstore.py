from __future__ import annotations

from typing import List, Dict, Any
import uuid
import os

from sqlalchemy import text
from sqlmodel import Session

from app.core.config import get_settings
from app.core.embeddings import get_embedding_service
from app.models.db import engine
from app.models.vector_entities import RAGEmbedding


class VectorStore:
    def __init__(self, collection_name: str = "kb_default"):
        self.collection = collection_name
        self.embeddings = get_embedding_service()
        # Ensure pgvector extension exists when using Postgres
        # Always ensure pgvector extension exists
        with engine.connect() as conn:
            conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
            conn.commit()

    def upsert(self, documents: List[str], metadatas: List[Dict[str, Any]], ids: List[str] | None = None) -> List[str]:
        if ids is None:
            ids = [str(uuid.uuid4()) for _ in documents]
        vectors = self.embeddings.embed_texts(documents)

        # Use ORM style upsert (get or create then update)
        with Session(engine) as db:
            for i, doc in enumerate(documents):
                rid = ids[i]
                row = db.get(RAGEmbedding, rid)
                if not row:
                    row = RAGEmbedding(id=rid, collection=self.collection)
                row.document = doc
                row.meta = metadatas[i] if isinstance(metadatas[i], dict) else {}
                row.embedding = vectors[i]
                db.add(row)
            db.commit()
        return ids

    def query(self, query_text: str, n_results: int = 5) -> Dict[str, Any]:
        q_emb = self.embeddings.embed_texts([query_text])[0]
        # Use textual vector literal casting for reliability
        qv_str = "[" + ",".join(str(float(x)) for x in q_emb) + "]"
        sql = text(
            """
            SELECT id, document, meta, 1 - (embedding <=> (:qv)::vector) AS score
            FROM rag_embeddings
            WHERE collection = :collection
            ORDER BY embedding <=> (:qv)::vector
            LIMIT :k
            """
        )
        with engine.connect() as conn:
            res = conn.execute(sql, {"qv": qv_str, "collection": self.collection, "k": n_results}).fetchall()
        return {
            "ids": [[r[0] for r in res]],
            "documents": [[r[1] for r in res]],
            "metadatas": [[r[2] for r in res]],
            "distances": [[1 - r[3] for r in res]],
        }

