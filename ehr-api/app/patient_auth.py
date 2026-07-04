"""
Patient OTP + gateway session tokens for pilot / pre-Keycloak go-live.

When ``EHR_OIDC_ENABLED=true``, clients should use Keycloak tokens after OTP MFA.
When OIDC is off, ``verify_otp`` issues an HS256 patient session JWT accepted by ``resolve_role``.
"""

from __future__ import annotations

import logging
import secrets
import time
from typing import Any

import jwt

from app.config import settings

_log = logging.getLogger(__name__)

# phone|patient_id → {code, expires_at}
_otp_store: dict[str, dict[str, Any]] = {}


def _otp_key(phone: str, patient_id: str) -> str:
    return f"{phone.strip()}|{patient_id.strip().upper()}"


def request_otp(*, phone: str, patient_id: str) -> dict[str, Any]:
    phone_n = phone.strip().replace(" ", "").replace("-", "")
    pid = patient_id.strip()
    if not phone_n or len(phone_n) < 9:
        raise ValueError("valid phone required")
    if not pid:
        raise ValueError("patient_id required")

    code = f"{secrets.randbelow(1_000_000):06d}"
    key = _otp_key(phone_n, pid)
    _otp_store[key] = {
        "code": code,
        "expires_at": time.time() + max(60, int(settings.otp_ttl_seconds)),
        "attempts": 0,
    }
    _log.info("OTP issued for patient_id=%s phone=***%s", pid, phone_n[-4:])

    out: dict[str, Any] = {
        "status": "sent",
        "patient_id": pid,
        "phone_masked": f"{phone_n[:4]}•••{phone_n[-2:]}",
        "expires_in_seconds": int(settings.otp_ttl_seconds),
        "message": "OTP sent via SMS" if not settings.otp_simulate else "OTP simulated (check response or logs)",
    }
    if settings.otp_simulate:
        out["debug_otp"] = code
    return out


def verify_otp(*, phone: str, patient_id: str, code: str) -> dict[str, Any]:
    phone_n = phone.strip().replace(" ", "").replace("-", "")
    pid = patient_id.strip()
    code_n = (code or "").strip()
    key = _otp_key(phone_n, pid)
    row = _otp_store.get(key)
    if not row:
        raise ValueError("OTP expired or not requested")
    row["attempts"] = int(row.get("attempts") or 0) + 1
    if row["attempts"] > 5:
        _otp_store.pop(key, None)
        raise ValueError("too many OTP attempts")
    if time.time() > float(row["expires_at"]):
        _otp_store.pop(key, None)
        raise ValueError("OTP expired")
    if code_n != str(row["code"]):
        raise ValueError("invalid OTP")

    _otp_store.pop(key, None)

    # When Keycloak is on, client exchanges credentials for OIDC token after MFA.
    if settings.oidc_enabled:
        return {
            "status": "verified",
            "patient_id": pid,
            "auth_mode": "oidc",
            "message": "OTP verified — complete sign-in with OIDC access token",
        }

    token = issue_patient_session_token(pid)
    return {
        "status": "verified",
        "patient_id": pid,
        "auth_mode": "patient_session",
        "access_token": token,
        "token_type": "Bearer",
        "expires_in": int(settings.patient_session_ttl_seconds),
        "message": "OTP verified — session token issued",
    }


def issue_patient_session_token(patient_id: str) -> str:
    now = int(time.time())
    ttl = max(300, int(settings.patient_session_ttl_seconds))
    payload = {
        "sub": patient_id,
        "patient_id": patient_id,
        "unihealth_role": "patient",
        "iss": "unihealth-gateway",
        "iat": now,
        "exp": now + ttl,
        "token_use": "patient_session",
    }
    return jwt.encode(payload, settings.patient_session_secret, algorithm="HS256")


def decode_patient_session_token(token: str) -> dict[str, Any]:
    return jwt.decode(
        token,
        settings.patient_session_secret,
        algorithms=["HS256"],
        options={"require": ["exp", "sub", "unihealth_role"]},
    )
