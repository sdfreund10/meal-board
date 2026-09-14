from __future__ import annotations

from fastapi import HTTPException, Request, status


def is_authenticated(request: Request) -> bool:
    return bool(request.session.get("authenticated"))


def require_session(request: Request) -> None:
    if not is_authenticated(request):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )
