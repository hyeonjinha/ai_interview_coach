from __future__ import annotations

import os
import time
from app.queues.local_db import LocalDBQueue
from app.worker.handlers import handle


def main():
    poll_interval = float(os.getenv("QUEUE_POLL_INTERVAL", "1"))
    q = LocalDBQueue()
    while True:
        job = q.dequeue()
        if not job:
            time.sleep(poll_interval)
            continue
        try:
            handle(job["type"], job["payload"])
            q.ack(job["id"])
        except Exception:
            q.fail(job["id"], retryable=True)


if __name__ == "__main__":
    main()


