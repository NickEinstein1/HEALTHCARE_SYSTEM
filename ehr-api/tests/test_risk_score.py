"""POST /ai/risk-score — feature flag and rules output."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routers import ai as ai_router
from app.config import settings
from app.state import bootstrap_ai_state


@pytest.fixture(autouse=True)
def _boot():
    bootstrap_ai_state()


@pytest.fixture()
def ai_client():
    app = FastAPI()
    app.include_router(ai_router.router)
    with TestClient(app) as c:
        yield c


def test_risk_score_disabled_404(ai_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ai_risk_score_enabled", False, raising=False)
    r = ai_client.post(
        "/ai/risk-score",
        json={"patient_id": "P001"},
        headers={"X-UniHealth-Role": "doctor"},
    )
    assert r.status_code == 404


def test_risk_score_enabled_returns_band(ai_client: TestClient, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setattr(settings, "ai_risk_score_enabled", True, raising=False)
    r = ai_client.post(
        "/ai/risk-score",
        json={
            "patient_id": "P001",
            "features": {"rr": 22, "spo2": 91, "sbp": 100, "hr": 110, "temp": 38.5, "gcs": 15},
            "use_fhir": False,
        },
        headers={"X-UniHealth-Role": "doctor"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data["risk_band"] in ("LOW", "MEDIUM", "HIGH")
    assert "news2" in data
    assert data.get("disclaimer")
