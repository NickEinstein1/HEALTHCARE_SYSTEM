"""Auth status, patient OTP, and OIDC discovery helpers for clients."""

from fastapi import APIRouter, HTTPException, Request

from app.auth import patient_id_from_request, resolve_role
from app.config import settings
from app.patient_auth import request_otp, verify_otp

router = APIRouter(prefix="/auth", tags=["auth"])


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
    if forwarded:
        return forwarded
    if request.client:
        return request.client.host or "unknown"
    return "unknown"


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
        "otp_simulate": settings.otp_simulate,
        "patient_session_enabled": not settings.oidc_enabled,
        "mpesa_simulate": settings.mpesa_simulate,
    }


@router.get("/me")
async def auth_me(request: Request):
    role = resolve_role(request)
    pid = patient_id_from_request(request)
    mode = "oidc" if settings.oidc_enabled else ("patient_session" if request.headers.get("Authorization") else "header")
    return {"role": role, "patient_id": pid, "auth_mode": mode}


@router.post("/patient/otp/request", summary="Send patient MFA OTP (SMS in production)")
async def patient_otp_request(request: Request, payload: dict):
    try:
        return request_otp(
            phone=str(payload.get("phone") or ""),
            patient_id=str(payload.get("patient_id") or ""),
            client_ip=_client_ip(request),
        )
    except ValueError as exc:
        raise HTTPException(status_code=429 if "rate limit" in str(exc).lower() else 400, detail=str(exc)) from exc


@router.post("/patient/otp/verify", summary="Verify patient OTP and issue session (or confirm MFA for OIDC)")
async def patient_otp_verify(payload: dict):
    try:
        return verify_otp(
            phone=str(payload.get("phone") or ""),
            patient_id=str(payload.get("patient_id") or ""),
            code=str(payload.get("code") or ""),
        )
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
