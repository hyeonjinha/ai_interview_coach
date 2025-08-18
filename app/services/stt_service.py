from __future__ import annotations

from typing import Optional


def transcribe_audio_stub(file_path: str) -> str:
    # STT 추후 구현: OpenAI Whisper API 또는 faster-whisper 연동
    # 현재는 스텁으로 파일명을 반환
    return f"[STT 미구현] 파일({file_path})에서 텍스트를 추출했다고 가정합니다."


__all__ = ["transcribe_audio_stub"]

