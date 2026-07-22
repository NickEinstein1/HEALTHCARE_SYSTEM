"""
Authentication for UniHealth API routes.

Pilot modes:
  - Header (default): ``X-UniHealth-Role`` for local/dev.
  - OIDC (staging/prod): validate Keycloak JWT ``Authorization: Bearer``; optional header fallback.
"""

from __future__ import annotations

import logging
from typing import Any

import jwt
from fastapi import HTTPException, Request
from jwt import PyJWKClient

from app.config import settings

_log = logging.getLogger(__name__)

VALID_ROLES = frozenset({
    "doctor", "nurse", "admin", "patient", "lab", "pharmacy", "billing",
    "underwriter", "claims_adjudicator", "compliance_auditor", "broker", "scheme_finance",
})
# Roles allowed on /ai/ws/alerts/{role} (patients use REST polling, not WS).
WS_ALERT_ROLES = frozenset({"doctor", "nurse", "admin", "lab", "pharmacy"})
_ROLE_ALIASES = {
    "clinical_officer": "nurse",
    "pharmacist": "pharmacy",
    "laboratory": "lab",
    "finance_admin": "billing",
    "accounts_clerk": "billing",
    "insurance_officer": "claims_adjudicator",
    "uhic": "claims_adjudicator",
}

_jwk_client: PyJWKClient | None = None


def _get_jwk_client() -> PyJWKClient:
    global _jwk_client
    issuer = (settings.oidc_issuer_url or "").strip().rstrip("/")
    if not issuer:
        raise HTTPException(status_code=503, detail="OIDC issuer URL not configured")
    if _jwk_client is None:
        jwks = (settings.oidc_jwks_url or "").strip()
        if not jwks:
            jwks = f"{issuer}/protocol/openid-connect/certs"
        _jwk_client = PyJWKClient(jwks)
    return _jwk_client


def _role_from_header(request: Request) -> str:
    role = request.headers.get("X-UniHealth-Role", "").strip().lower()
    if not role:
        raise HTTPException(status_code=401, detail="X-UniHealth-Role header required")
    role = _ROLE_ALIASES.get(role, role)
    if role not in VALID_ROLES:
        raise HTTPException(status_code=403, detail=f"Unknown role: {role}")
    return role


def _pick_role_from_claims(claims: dict[str, Any]) -> str | None:
    custom = (settings.oidc_role_claim or "unihealth_role").strip()
    if custom and claims.get(custom):
        raw = str(claims[custom]).strip().lower()
        return _ROLE_ALIASES.get(raw, raw) if raw in VALID_ROLES or raw in _ROLE_ALIASES else None

    realm = claims.get("realm_access") or {}
    if isinstance(realm, dict):
        for r in realm.get("roles") or []:
            name = str(r).strip().lower()
            if name in VALID_ROLES:
                return name
            if name in _ROLE_ALIASES:
                return _ROLE_ALIASES[name]

    resource = claims.get("resource_access") or {}
    if isinstance(resource, dict):
        for _client, data in resource.items():
            if not isinstance(data, dict):
                continue
            for r in data.get("roles") or []:
                name = str(r).strip().lower()
                if name in VALID_ROLES:
                    return name
                if name in _ROLE_ALIASES:
                    return _ROLE_ALIASES[name]
    return None


def _decode_bearer_claims(token: str) -> dict[str, Any]:
    try:
        signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
        decode_opts: dict[str, Any] = {"verify_aud": False}
        audience = (settings.oidc_audience or "").strip()
        if audience:
            decode_opts["verify_aud"] = True
            decode_opts["audience"] = audience
        return jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            issuer=(settings.oidc_issuer_url or "").strip().rstrip("/"),
            options=decode_opts,
        )
    except jwt.PyJWTError as exc:
        _log.warning("JWT validation failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid or expired access token") from exc


def role_from_access_token(token: str) -> str:
    """Validate OIDC access token and return UniHealth role (for REST and WebSocket)."""
    claims = _decode_bearer_claims(token.strip())
    role = _pick_role_from_claims(claims)
    if not role:
        raise HTTPException(status_code=403, detail="Token has no recognized UniHealth role")
    return role


def _role_from_bearer(token: str) -> str:
    return role_from_access_token(token)


class WsAuthError(Exception):
    """WebSocket auth failure — carries a close code for the WS handshake."""

    def __init__(self, reason: str, code: int = 4001) -> None:
        super().__init__(reason)
        self.reason = reason
        self.code = code


def _ws_dev_token_set() -> frozenset[str]:
    raw = (settings.ws_dev_tokens or "").strip()
    return frozenset(t.strip() for t in raw.split(",") if t.strip())


def resolve_ws_role(token: str, requested_role: str) -> str:
    """
    Validate ?token= for /ai/ws/alerts/{role}.

    - OIDC enabled: JWT required unless dev tokens explicitly allowed as fallback.
    - JWT role must match the path role (prevents cross-role socket hijack).
    - Dev tokens (pilot/local): shared secret + path role when ``ws_allow_dev_tokens``.
    """
    req = (requested_role or "").strip().lower()
    req = _ROLE_ALIASES.get(req, req)
    if req not in WS_ALERT_ROLES:
        raise WsAuthError(f"Unknown role: {req}", 4003)

    tok = (token or "").strip()
    if not tok:
        raise WsAuthError("Missing token", 4001)

    if settings.oidc_enabled:
        try:
            role = role_from_access_token(tok)
        except HTTPException as exc:
            if settings.ws_allow_dev_tokens and tok in _ws_dev_token_set():
                return req
            detail = exc.detail if isinstance(exc.detail, str) else "Invalid token"
            code = 4003 if exc.status_code == 403 else 4001
            raise WsAuthError(detail, code) from exc
        if role != req:
            raise WsAuthError("Token role does not match connection role", 4003)
        return role

    if settings.ws_allow_dev_tokens and tok in _ws_dev_token_set():
        return req

    raise WsAuthError("Invalid token", 4001)


def _role_from_patient_session(token: str) -> str | None:
    """Gateway-issued patient session JWT (HS256) when Keycloak OIDC is off."""
    if settings.oidc_enabled:
        return None
    try:
        from app.patient_auth import decode_patient_session_token

        claims = decode_patient_session_token(token)
        if claims.get("token_use") != "patient_session":
            return None
        role = str(claims.get("unihealth_role") or "").strip().lower()
        return role if role in VALID_ROLES else None
    except Exception:
        return None


def patient_id_from_request(request: Request) -> str | None:
    """Patient id from JWT claims or ``X-Patient-Id`` header."""
    auth = request.headers.get("Authorization", "").strip()
    if auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()
        if settings.oidc_enabled:
            try:
                claims = _decode_bearer_claims(token)
                for key in ("patient_id", "patientId", "sub"):
                    val = claims.get(key)
                    if val and str(val).strip():
                        return str(val).strip()
            except HTTPException:
                pass
        else:
            try:
                from app.patient_auth import decode_patient_session_token

                claims = decode_patient_session_token(token)
                pid = claims.get("patient_id") or claims.get("sub")
                if pid:
                    return str(pid).strip()
            except Exception:
                pass
    header_pid = request.headers.get("X-Patient-Id", "").strip()
    return header_pid or None


def require_bound_patient_id(
    request: Request,
    role: str,
    *,
    query_pid: str | None = None,
    required: bool = True,
) -> str | None:
    """
    Resolve patient_id for scoped routes.

    For ``role == patient``, prefer JWT ``patient_id`` / session claim and reject
    a mismatched ``X-Patient-Id`` / body / query override (IDOR hardening).
    """
    if role != "patient":
        pid = (query_pid or "").strip() or None
        if required and not pid:
            raise HTTPException(status_code=400, detail="patient_id required")
        return pid

    token_pid = None
    auth = request.headers.get("Authorization", "").strip()
    if auth.lower().startswith("bearer "):
        token = auth.split(" ", 1)[1].strip()
        if settings.oidc_enabled:
            try:
                claims = _decode_bearer_claims(token)
                for key in ("patient_id", "patientId", "sub"):
                    val = claims.get(key)
                    if val and str(val).strip():
                        # Prefer explicit patient_id claims; use sub only when role is patient.
                        if key == "sub":
                            role_claim = _pick_role_from_claims(claims)
                            if role_claim and role_claim != "patient":
                                continue
                        token_pid = str(val).strip()
                        break
            except HTTPException:
                pass
        else:
            try:
                from app.patient_auth import decode_patient_session_token

                claims = decode_patient_session_token(token)
                if claims.get("token_use") == "patient_session":
                    raw = claims.get("patient_id") or claims.get("sub")
                    if raw:
                        token_pid = str(raw).strip()
            except Exception:
                pass

    header_pid = request.headers.get("X-Patient-Id", "").strip() or None
    query = (query_pid or "").strip() or None

    if token_pid:
        for candidate in (header_pid, query):
            if candidate and candidate != token_pid:
                raise HTTPException(
                    status_code=403,
                    detail="patient_id does not match authenticated session",
                )
        return token_pid

    # Dev/header-only pilot: allow X-Patient-Id when no bearer patient claim.
    if settings.oidc_enabled and not settings.oidc_allow_header_fallback:
        raise HTTPException(
            status_code=401,
            detail="Bearer token with patient_id claim required",
        )

    pid = header_pid or query
    if required and not pid:
        raise HTTPException(status_code=400, detail="X-Patient-Id header required for patient role")
    return pid


def resolve_role(request: Request) -> str:
    """Resolve role from Bearer JWT (OIDC or patient session) or ``X-UniHealth-Role``."""
    auth = request.headers.get("Authorization", "").strip()
    bearer = auth.split(" ", 1)[1].strip() if auth.lower().startswith("bearer ") else ""

    if settings.oidc_enabled:
        # Staging/dev: trust role header when fallback is on (dashboard always sends both).
        if settings.oidc_allow_header_fallback:
            role_hdr = request.headers.get("X-UniHealth-Role", "").strip()
            if role_hdr:
                return _role_from_header(request)

        if bearer:
            try:
                return _role_from_bearer(bearer)
            except HTTPException:
                if settings.oidc_allow_header_fallback:
                    return _role_from_header(request)
                raise
        if settings.oidc_allow_header_fallback:
            return _role_from_header(request)
        raise HTTPException(status_code=401, detail="Authorization: Bearer token required")

    # OIDC off: prefer gateway patient session token, then role header (local pilot).
    if bearer:
        session_role = _role_from_patient_session(bearer)
        if session_role:
            return session_role
    if settings.is_production:
        raise HTTPException(
            status_code=401,
            detail="Authorization: Bearer token required (production rejects role-header-only auth)",
        )
    return _role_from_header(request)


def require_role(request: Request, allowed: list[str]) -> str:
    role = resolve_role(request)
    if role not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{role}' is not permitted to access this endpoint",
        )
    return role
