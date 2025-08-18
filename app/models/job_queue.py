from __future__ import annotations

from datetime import datetime
from typing import Optional, Dict, Any

from sqlmodel import SQLModel, Field, Column, JSON


class JobQueue(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    type: str = Field(index=True)
    payload: Dict[str, Any] = Field(sa_column=Column(JSON))
    status: str = Field(default="pending", index=True)
    attempts: int = 0
    scheduled_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


