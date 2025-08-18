from __future__ import annotations

from typing import List
from functools import lru_cache

import numpy as np

from app.core.config import get_settings


class EmbeddingService:
    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        raise NotImplementedError


class OpenAIEmbeddingService(EmbeddingService):
    def __init__(self, model: str):
        from openai import OpenAI

        self.client = OpenAI()
        self.model = model

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        resp = self.client.embeddings.create(model=self.model, input=texts)
        return [d.embedding for d in resp.data]


class LocalSBERTEmbeddingService(EmbeddingService):
    def __init__(self, model_name: str = "sentence-transformers/all-MiniLM-L6-v2"):
        from sentence_transformers import SentenceTransformer

        self.model = SentenceTransformer(model_name)

    def embed_texts(self, texts: List[str]) -> List[List[float]]:
        if not texts:
            return []
        embs = self.model.encode(texts, show_progress_bar=False, convert_to_numpy=True, normalize_embeddings=True)
        return embs.tolist()


@lru_cache
def get_embedding_service() -> EmbeddingService:
    settings = get_settings()
    provider = settings.embedding_provider.lower() if settings.embedding_provider else "auto"

    # Prefer OpenAI if API key exists and provider is auto/openai
    if settings.openai_api_key and provider in {"auto", "openai"}:
        model = settings.embedding_model or "text-embedding-3-small"
        return OpenAIEmbeddingService(model=model)

    # Fallback to local SBERT
    model_name = settings.embedding_model or "sentence-transformers/all-MiniLM-L6-v2"
    return LocalSBERTEmbeddingService(model_name=model_name)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> np.ndarray:
    a_norm = a / (np.linalg.norm(a, axis=1, keepdims=True) + 1e-12)
    b_norm = b / (np.linalg.norm(b, axis=1, keepdims=True) + 1e-12)
    return a_norm @ b_norm.T

