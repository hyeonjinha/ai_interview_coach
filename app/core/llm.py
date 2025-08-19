from __future__ import annotations

from typing import List, Dict, Any, Iterator, AsyncIterator
from functools import lru_cache
import os
import time
import asyncio

from app.core.config import get_settings


class LLMService:
    def chat(self, messages: List[Dict[str, str]]) -> str:
        raise NotImplementedError
    
    def chat_stream(self, messages: List[Dict[str, str]]) -> Iterator[str]:
        """스트리밍 채팅 (기본 구현: 토큰 단위 분할)"""
        response = self.chat(messages)
        # 간단한 토큰 분할 (실제로는 LLM API의 스트리밍 사용)
        words = response.split()
        for word in words:
            yield word + " "
            time.sleep(0.05)  # 자연스러운 타이핑 효과
    
    async def chat_stream_async(self, messages: List[Dict[str, str]]) -> AsyncIterator[str]:
        """비동기 스트리밍 채팅"""
        response = self.chat(messages)
        words = response.split()
        for word in words:
            yield word + " "
            await asyncio.sleep(0.05)


class OpenAILLMService(LLMService):
    def __init__(self, model: str):
        from openai import OpenAI

        self.client = OpenAI()
        self.model = model

    def chat(self, messages: List[Dict[str, str]]) -> str:
        resp = self.client.chat.completions.create(model=self.model, messages=messages)
        return (resp.choices[0].message.content or "").strip()
    
    def chat_stream(self, messages: List[Dict[str, str]]) -> Iterator[str]:
        """OpenAI 스트리밍 지원"""
        try:
            stream = self.client.chat.completions.create(
                model=self.model, 
                messages=messages, 
                stream=True
            )
            
            for chunk in stream:
                if chunk.choices[0].delta.content:
                    yield chunk.choices[0].delta.content
        except Exception as e:
            # 스트리밍 실패 시 일반 응답으로 fallback
            fallback_response = self.chat(messages)
            yield fallback_response


@lru_cache
def get_llm() -> LLMService:
    settings = get_settings()
    if not settings.openai_api_key:
        raise ValueError(
            "OpenAI API 키가 설정되지 않았습니다.\n"
            "1. .env 파일에 OPENAI_API_KEY를 설정하세요\n"
            "2. 또는 환경 변수로 OPENAI_API_KEY를 설정하세요\n"
            "3. https://platform.openai.com/api-keys 에서 API 키를 발급받으세요"
        )
    return OpenAILLMService(model=settings.llm_model)


def setup_langsmith():
    """LangSmith 설정 (선택사항)"""
    try:
        if os.getenv("LANGCHAIN_TRACING_V2") == "true":
            os.environ["LANGCHAIN_TRACING_V2"] = "true"
            os.environ["LANGCHAIN_ENDPOINT"] = os.getenv("LANGCHAIN_ENDPOINT", "https://api.smith.langchain.com")
            os.environ["LANGCHAIN_API_KEY"] = os.getenv("LANGCHAIN_API_KEY", "")
            os.environ["LANGCHAIN_PROJECT"] = os.getenv("LANGCHAIN_PROJECT", "ai-interview-coach")
            print("✅ LangSmith 설정 완료")
        else:
            print("ℹ️ LangSmith 설정 건너뜀 (LANGCHAIN_TRACING_V2=false)")
    except Exception as e:
        print(f"⚠️ LangSmith 설정 실패: {e}")
        print("ℹ️ LangSmith 없이 계속 진행합니다")

