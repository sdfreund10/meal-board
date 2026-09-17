from __future__ import annotations

from datetime import datetime

from fastapi import HTTPException, Request, status


def is_authenticated(request: Request) -> bool:
    return bool(request.session.get("authenticated"))

def has_admin_access(request: Request) -> bool:
    admin_until = request.session.get("admin_until")

    if admin_until is None:
        return False
    expires_at = datetime.fromisoformat(admin_until)
    return expires_at > datetime.now()


def require_session(request: Request) -> None:
    if not is_authenticated(request):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
        )

def require_admin(request: Request) -> None:
    if not has_admin_access(request):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required",
        )
