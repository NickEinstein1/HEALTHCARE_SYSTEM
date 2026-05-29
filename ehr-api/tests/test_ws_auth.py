"""WebSocket alert auth — dev tokens and OIDC role binding."""

from __future__ import annotations

import pytest
from fastapi import HTTPException

from app.auth import WsAuthError, resolve_ws_role
from app.config import settings


def test_ws_dev_token_accepts_matching_role(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "oidc_enabled", False, raising=False)
    monkeypatch.setattr(settings, "ws_allow_dev_tokens", True, raising=False)
    monkeypatch.setattr(settings, "ws_dev_tokens", "dev-token-1", raising=False)
    assert resolve_ws_role("dev-token-1", "doctor") == "doctor"


def test_ws_dev_token_rejects_unknown_role(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "oidc_enabled", False, raising=False)
    monkeypatch.setattr(settings, "ws_allow_dev_tokens", True, raising=False)
    with pytest.raises(WsAuthError) as exc:
        resolve_ws_role("dev-token-1", "patient")
    assert exc.value.code == 4003


def test_ws_dev_tokens_disabled(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "oidc_enabled", False, raising=False)
    monkeypatch.setattr(settings, "ws_allow_dev_tokens", False, raising=False)
    with pytest.raises(WsAuthError) as exc:
        resolve_ws_role("dev-token-1", "doctor")
    assert exc.value.code == 4001


def test_ws_oidc_role_mismatch(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "oidc_enabled", True, raising=False)
    monkeypatch.setattr(settings, "ws_allow_dev_tokens", False, raising=False)
    monkeypatch.setattr(settings, "oidc_issuer_url", "http://keycloak/realms/unihealth", raising=False)

    def fake_role(_token: str) -> str:
        return "nurse"

    import app.auth as auth_mod

    monkeypatch.setattr(auth_mod, "role_from_access_token", fake_role)
    with pytest.raises(WsAuthError) as exc:
        resolve_ws_role("fake-jwt", "doctor")
    assert exc.value.code == 4003


def test_ws_oidc_valid_role(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "oidc_enabled", True, raising=False)
    monkeypatch.setattr(settings, "ws_allow_dev_tokens", False, raising=False)

    import app.auth as auth_mod

    monkeypatch.setattr(auth_mod, "role_from_access_token", lambda _t: "doctor")
    assert resolve_ws_role("fake-jwt", "doctor") == "doctor"


def test_ws_oidc_invalid_jwt_no_dev_fallback(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "oidc_enabled", True, raising=False)
    monkeypatch.setattr(settings, "ws_allow_dev_tokens", False, raising=False)

    import app.auth as auth_mod

    def boom(_token: str) -> str:
        raise HTTPException(status_code=401, detail="Invalid or expired access token")

    monkeypatch.setattr(auth_mod, "role_from_access_token", boom)
    with pytest.raises(WsAuthError) as exc:
        resolve_ws_role("bad", "doctor")
    assert exc.value.code == 4001
