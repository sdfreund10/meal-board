from __future__ import annotations

import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status

from app.auth_rate_limit import login_rate_limiter
from app.config import settings
from app.deps import has_admin_access, is_authenticated, require_session
from app.schemas import AdminLogin, AuthLogin, AuthStatus

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=AuthStatus)
def login(payload: AuthLogin, request: Request) -> AuthStatus:
    login_rate_limiter.check(request)
    pin = payload.pin
    expected = settings.household_pin
    # compare_digest requires equal-length inputs on some Python versions.
    pin_ok = len(pin) == len(expected) and secrets.compare_digest(pin, expected)
    if not pin_ok:
        login_rate_limiter.record_failure(request)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid PIN",
        )
    login_rate_limiter.clear(request)
    request.session["authenticated"] = True
    return AuthStatus(authenticated=True)

@router.post(
    "/elevate",
    response_model=AuthStatus,
    dependencies=[Depends(require_session)]
)
def elevate(payload: AdminLogin, request: Request) -> AuthStatus:
    password = payload.password
    expected = settings.admin_password
    # compare_digest requires equal-length inputs on some Python versions.
    pw_ok = len(password) == len(expected) and secrets.compare_digest(
        password, expected
    )
    if not pw_ok:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid password",
        )
    request.session["admin_until"] = (datetime.now() + timedelta(days=1)).isoformat()
    return AuthStatus(authenticated=True, admin_access=has_admin_access(request))


@router.post("/logout", response_model=AuthStatus)
def logout(request: Request) -> AuthStatus:
    request.session.clear()
    return AuthStatus(authenticated=False)


@router.get("/me", response_model=AuthStatus)
def me(request: Request) -> AuthStatus:
    return AuthStatus(
        authenticated=is_authenticated(request),
        admin_access=has_admin_access(request)
    )


@router.get(
    "/session",
    response_model=AuthStatus,
    dependencies=[Depends(require_session)],
)
def session_check() -> AuthStatus:
    return AuthStatus(authenticated=True)
