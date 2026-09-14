from __future__ import annotations

import time
from collections import defaultdict, deque
from threading import Lock
from typing import DefaultDict, Deque

from fastapi import HTTPException, Request, status


class LoginRateLimiter:
    """Simple in-memory per-IP login attempt limiter."""

    def __init__(self, max_attempts: int = 5, window_seconds: float = 60.0) -> None:
        self.max_attempts = max_attempts
        self.window_seconds = window_seconds
        self._attempts: DefaultDict[str, Deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def _client_key(self, request: Request) -> str:
        if request.client is None:
            return "unknown"
        return request.client.host

    def check(self, request: Request) -> None:
        key = self._client_key(request)
        now = time.monotonic()
        with self._lock:
            bucket = self._attempts[key]
            while bucket and now - bucket[0] > self.window_seconds:
                bucket.popleft()
            if len(bucket) >= self.max_attempts:
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail="Too many login attempts. Try again shortly.",
                )

    def record_failure(self, request: Request) -> None:
        key = self._client_key(request)
        with self._lock:
            self._attempts[key].append(time.monotonic())

    def clear(self, request: Request) -> None:
        key = self._client_key(request)
        with self._lock:
            self._attempts.pop(key, None)


login_rate_limiter = LoginRateLimiter()
