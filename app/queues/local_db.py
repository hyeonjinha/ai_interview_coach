from __future__ import annotations

from typing import Optional, Dict, Any
from datetime import datetime

from sqlalchemy import text
from sqlmodel import Session, select

from app.models.db import engine
from app.models.job_queue import JobQueue


class LocalDBQueue:
    def enqueue(self, type: str, payload: Dict[str, Any]) -> int:
        with Session(engine) as db:
            job = JobQueue(type=type, payload=payload, status="pending")
            db.add(job)
            db.commit()
            db.refresh(job)
            return int(job.id)

    def dequeue(self) -> Optional[Dict[str, Any]]:
        # Postgres 전용: NOW() 기준으로 pending 중 하나를 잡아서 processing으로 마킹
        with engine.begin() as conn:
            row = conn.execute(text(
                """
                UPDATE jobqueue
                SET status='processing', updated_at=NOW()
                WHERE id = (
                  SELECT id FROM jobqueue
                  WHERE status='pending' AND (scheduled_at IS NULL OR scheduled_at <= NOW())
                  ORDER BY id ASC
                  FOR UPDATE SKIP LOCKED
                  LIMIT 1
                )
                RETURNING id, type, payload
                """
            )).fetchone()
        if not row:
            return None
        return {"id": int(row[0]), "type": row[1], "payload": row[2]}

    def ack(self, job_id: int) -> None:
        with Session(engine) as db:
            job = db.get(JobQueue, job_id)
            if job:
                job.status = "done"
                job.updated_at = datetime.utcnow()
                db.add(job)
                db.commit()

    def fail(self, job_id: int, retryable: bool = True) -> None:
        with Session(engine) as db:
            job = db.get(JobQueue, job_id)
            if job:
                job.attempts += 1
                job.status = "pending" if retryable else "failed"
                job.updated_at = datetime.utcnow()
                db.add(job)
                db.commit()


