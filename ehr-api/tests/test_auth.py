"""Auth module: header mode and OIDC settings."""

from __future__ import annotations

from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.auth import require_role, resolve_role
from app.config import settings


def _request(headers: dict[str, str] | None = None) -> MagicMock:
    req = MagicMock()
    req.headers = headers or {}
    return req


def test_resolve_role_from_header(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "oidc_enabled", False, raising=False)
    role = resolve_role(_request({"X-UniHealth-Role": "doctor"}))
    assert role == "doctor"


def test_resolve_role_missing_header(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "oidc_enabled", False, raising=False)
    with pytest.raises(HTTPException) as exc:
        resolve_role(_request({}))
    assert exc.value.status_code == 401


def test_require_role_denied(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "oidc_enabled", False, raising=False)
    with pytest.raises(HTTPException) as exc:
        require_role(_request({"X-UniHealth-Role": "patient"}), ["doctor", "nurse"])
    assert exc.value.status_code == 403


def test_oidc_requires_bearer_when_no_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "oidc_enabled", True, raising=False)
    monkeypatch.setattr(settings, "oidc_allow_header_fallback", False, raising=False)
    monkeypatch.setattr(settings, "oidc_issuer_url", "http://keycloak/realms/unihealth", raising=False)
    with pytest.raises(HTTPException) as exc:
        resolve_role(_request({}))
    assert exc.value.status_code == 401
