from __future__ import annotations

from typing import Protocol, Optional, Dict, Any


class QueueClient(Protocol):
    def enqueue(self, type: str, payload: Dict[str, Any]) -> int: ...
    def dequeue(self) -> Optional[Dict[str, Any]]: ...  # {id,type,payload}
    def ack(self, job_id: int) -> None: ...
    def fail(self, job_id: int, retryable: bool = True) -> None: ...


