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

VALID_ROLES = frozenset({"doctor", "nurse", "admin", "patient", "lab", "pharmacy"})
_ROLE_ALIASES = {
    "clinical_officer": "nurse",
    "pharmacist": "pharmacy",
    "laboratory": "lab",
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


def _role_from_bearer(token: str) -> str:
    try:
        signing_key = _get_jwk_client().get_signing_key_from_jwt(token)
        decode_opts: dict[str, Any] = {"verify_aud": False}
        audience = (settings.oidc_audience or "").strip()
        if audience:
            decode_opts["verify_aud"] = True
            decode_opts["audience"] = audience
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256", "ES256"],
            issuer=(settings.oidc_issuer_url or "").strip().rstrip("/"),
            options=decode_opts,
        )
    except jwt.PyJWTError as exc:
        _log.warning("JWT validation failed: %s", exc)
        raise HTTPException(status_code=401, detail="Invalid or expired access token") from exc

    role = _pick_role_from_claims(claims)
    if not role:
        raise HTTPException(status_code=403, detail="Token has no recognized UniHealth role")
    return role


def resolve_role(request: Request) -> str:
    """Resolve clinician role from Bearer JWT (if OIDC enabled) or ``X-UniHealth-Role``."""
    if settings.oidc_enabled:
        auth = request.headers.get("Authorization", "").strip()
        if auth.lower().startswith("bearer "):
            return _role_from_bearer(auth.split(" ", 1)[1].strip())
        if settings.oidc_allow_header_fallback:
            return _role_from_header(request)
        raise HTTPException(status_code=401, detail="Authorization: Bearer token required")
    return _role_from_header(request)


def require_role(request: Request, allowed: list[str]) -> str:
    role = resolve_role(request)
    if role not in allowed:
        raise HTTPException(
            status_code=403,
            detail=f"Role '{role}' is not permitted to access this endpoint",
        )
    return role
