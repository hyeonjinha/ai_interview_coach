from __future__ import annotations

from typing import List, Dict, Any
from functools import lru_cache

from app.core.config import get_settings


class LLMService:
    def chat(self, messages: List[Dict[str, str]]) -> str:
        raise NotImplementedError


class OpenAILLMService(LLMService):
    def __init__(self, model: str):
        from openai import OpenAI

        self.client = OpenAI()
        self.model = model

    def chat(self, messages: List[Dict[str, str]]) -> str:
        resp = self.client.chat.completions.create(model=self.model, messages=messages)
        return (resp.choices[0].message.content or "").strip()


class HeuristicLLMService(LLMService):
    def chat(self, messages: List[Dict[str, str]]) -> str:
        # Very naive fallback that echoes simple guidance based on last user message
        last_user = next((m["content"] for m in reversed(messages) if m["role"] == "user"), "")
        if not last_user:
            return "정보가 부족합니다. 경험이나 공고 정보를 더 제공해주세요."
        if "정량" in last_user or any(ch.isdigit() for ch in last_user):
            return "답변이 비교적 명확합니다. 다음 질문으로 넘어가겠습니다."
        if "왜" in last_user or "because" in last_user.lower():
            return "기술 선택의 이유 설명이 일부 포함되어 있습니다. 조금 더 근거를 보강해보세요."
        return "핵심이 다소 모호합니다. STAR 구조와 정량적 성과를 포함해 다시 설명해보세요."


@lru_cache
def get_llm() -> LLMService:
    settings = get_settings()
    if settings.openai_api_key:
        return OpenAILLMService(model=settings.llm_model)
    return HeuristicLLMService()

