"""Auth status and OIDC discovery helpers for clients."""

from fastapi import APIRouter, Request

from app.auth import resolve_role
from app.config import settings

router = APIRouter(prefix="/auth", tags=["auth"])


@router.get("/status")
async def auth_status():
    return {
        "deployment_env": settings.deployment_env,
        "oidc_enabled": settings.oidc_enabled,
        "issuer": settings.oidc_issuer_url or None,
        "audience": settings.oidc_audience or None,
        "header_fallback": settings.oidc_allow_header_fallback,
        "consent_mode": settings.consent_mode,
        "production_profile": settings.is_production,
    }


@router.get("/me")
async def auth_me(request: Request):
    role = resolve_role(request)
    return {"role": role, "auth_mode": "oidc" if settings.oidc_enabled else "header"}
