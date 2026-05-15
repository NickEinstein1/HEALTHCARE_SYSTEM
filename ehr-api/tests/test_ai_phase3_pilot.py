"""
Phase 3 AI Assist pilot — contracts for ward capacity + census endpoints.

Runs without Postgres/Redis: uses a slim FastAPI app with only the /ai router
and in-memory simulator state bootstrapped per test session.
"""

from __future__ import annotations

import sqlite3
import uuid

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routers import ai as ai_router
from app.state import bootstrap_ai_state


@pytest.fixture(autouse=True)
def _clear_integration_idempotency_cache():
    """Avoid cross-test collisions on shared MSH-10 / idempotency keys."""
    from app.ai import integration_dedupe as dedupe

    with dedupe._lock:
        dedupe._recent.clear()
    yield
    with dedupe._lock:
        dedupe._recent.clear()


@pytest.fixture(scope="session", autouse=True)
def reset_sim_once():
    bootstrap_ai_state()


@pytest.fixture(scope="session")
def ai_app() -> FastAPI:
    app = FastAPI()
    app.include_router(ai_router.router)
    return app


@pytest.fixture()
def ai_client(ai_app: FastAPI):
    with TestClient(ai_app) as client:
        yield client


@pytest.fixture(scope="session")
def first_ward_id(ai_app: FastAPI) -> str:
    """Resolve a stable ward after bootstrap (runs before TestClient churn)."""
    with TestClient(ai_app) as client:
        r = client.get("/ai/wards", headers={"X-UniHealth-Role": "doctor"})
        assert r.status_code == 200
        data = r.json()
        assert data
        assert len(data[0]["ward_id"]) >= 2
        return data[0]["ward_id"]


def test_wards_requires_role(ai_client: TestClient) -> None:
    r = ai_client.get("/ai/wards")
    assert r.status_code == 401


def test_wards_doctor_returns_wards(ai_client: TestClient) -> None:
    r = ai_client.get("/ai/wards", headers={"X-UniHealth-Role": "doctor"})
    assert r.status_code == 200
    wards = r.json()
    assert isinstance(wards, list)
    assert len(wards) >= 1
    row = wards[0]
    for key in ("ward_id", "name", "occupied", "capacity"):
        assert key in row


def test_forecast_doctor_ok(ai_client: TestClient, first_ward_id: str) -> None:
    fr = ai_client.get(
        f"/ai/wards/{first_ward_id}/forecast?hours=12",
        headers={"X-UniHealth-Role": "doctor"},
    )
    assert fr.status_code == 200
    steps = fr.json()
    assert isinstance(steps, list)
    assert len(steps) >= 1
    assert "predicted" in steps[0]


def test_history_doctor_contains_iso(ai_client: TestClient, first_ward_id: str) -> None:
    hr = ai_client.get(
        f"/ai/wards/{first_ward_id}/history?limit=24",
        headers={"X-UniHealth-Role": "doctor"},
    )
    assert hr.status_code == 200
    rows = hr.json()
    assert isinstance(rows, list)
    assert len(rows) >= 8
    assert "ts_iso" in rows[-1]


def test_census_snapshot_nurse_visible_to_doctor_history(
    ai_client: TestClient, first_ward_id: str,
) -> None:
    wards = ai_client.get("/ai/wards", headers={"X-UniHealth-Role": "nurse"}).json()
    ward = next((w for w in wards if w["ward_id"] == first_ward_id), wards[0])
    wid = ward["ward_id"]
    occ = max(1, min(3, int(ward["capacity"]) - 1))
    payload = {"occupied": occ, "source": "pytest_manual"}
    p = ai_client.post(
        f"/ai/wards/{wid}/census-snapshot",
        json=payload,
        headers={"X-UniHealth-Role": "nurse"},
    )
    assert p.status_code == 200
    rows = ai_client.get(
        f"/ai/wards/{wid}/history?limit=24",
        headers={"X-UniHealth-Role": "doctor"},
    ).json()
    assert any(str(r.get("source")) == "pytest_manual" for r in rows)


def test_doctor_cannot_post_census(ai_client: TestClient, first_ward_id: str) -> None:
    p = ai_client.post(
        f"/ai/wards/{first_ward_id}/census-snapshot",
        json={"occupied": 1},
        headers={"X-UniHealth-Role": "doctor"},
    )
    assert p.status_code == 403


def test_doctor_cannot_recompute_forecasts(ai_client: TestClient) -> None:
    r = ai_client.post(
        "/ai/wards/recompute-forecasts",
        headers={"X-UniHealth-Role": "doctor"},
    )
    assert r.status_code == 403


def test_integration_census_hidden_when_disabled(
    ai_client: TestClient,
    first_ward_id: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "ai_census_integration_secret", "", raising=False)
    r = ai_client.post(
        f"/ai/integration/wards/{first_ward_id}/census-snapshot",
        json={"occupied": 1},
        headers={"X-AI-Census-Secret": "anything"},
    )
    assert r.status_code == 404


def test_integration_census_rejects_bad_secret(
    ai_client: TestClient,
    first_ward_id: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "ai_census_integration_secret", "server-secret-bc", raising=False)
    r = ai_client.post(
        f"/ai/integration/wards/{first_ward_id}/census-snapshot",
        json={"occupied": 2},
        headers={"X-AI-Census-Secret": "wrong"},
    )
    assert r.status_code == 401


def test_integration_census_updates_history(
    ai_client: TestClient,
    first_ward_id: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import settings

    wards = ai_client.get("/ai/wards", headers={"X-UniHealth-Role": "doctor"}).json()
    ward = next((w for w in wards if w["ward_id"] == first_ward_id), wards[0])
    monkeypatch.setattr(settings, "ai_census_integration_secret", "integ-pytest-secret", raising=False)
    occ = max(2, min(4, int(ward["capacity"]) - 1))
    payload = {"occupied": occ, "source": "pytest_integration_feed"}
    p = ai_client.post(
        f"/ai/integration/wards/{ward['ward_id']}/census-snapshot",
        json=payload,
        headers={"X-AI-Census-Secret": "integ-pytest-secret"},
    )
    assert p.status_code == 200
    rows = ai_client.get(
        f"/ai/wards/{ward['ward_id']}/history?limit=24",
        headers={"X-UniHealth-Role": "doctor"},
    ).json()
    assert any(str(r.get("source")) == "pytest_integration_feed" for r in rows)


def test_integration_census_idempotent_replay(
    ai_client: TestClient,
    first_ward_id: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import settings

    wards = ai_client.get("/ai/wards", headers={"X-UniHealth-Role": "doctor"}).json()
    ward = next((w for w in wards if w["ward_id"] == first_ward_id), wards[0])
    wid = ward["ward_id"]
    cap = int(ward["capacity"])
    occ_a = max(2, min(4, cap - 1))
    occ_b = min(cap, occ_a + 3)
    if occ_b == occ_a:
        occ_b = max(0, occ_a - 1)

    monkeypatch.setattr(settings, "ai_census_integration_secret", "idem-census-secret", raising=False)
    ikey = str(uuid.uuid4())
    headers = {"X-AI-Census-Secret": "idem-census-secret"}
    url = f"/ai/integration/wards/{wid}/census-snapshot"

    r1 = ai_client.post(
        url,
        json={"occupied": occ_a, "source": "idem_a", "idempotency_key": ikey},
        headers=headers,
    )
    assert r1.status_code == 200
    first = r1.json()
    assert first.get("idempotent_replay") is None
    assert int(first["occupied"]) == occ_a

    r2 = ai_client.post(
        url,
        json={"occupied": occ_b, "source": "idem_b", "idempotency_key": ikey},
        headers=headers,
    )
    assert r2.status_code == 200
    second = r2.json()
    assert second.get("idempotent_replay") is True
    second.pop("idempotent_replay", None)
    assert second == first


def test_integration_hl7_replays_same_msh10(
    ai_client: TestClient,
    first_ward_id: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "ai_census_integration_secret", "hl7-idem-secret", raising=False)
    ctl = str(uuid.uuid4())
    msg = (
        f"MSH|^~\\&|S|R|UH|UH|202601011200||ADT^A01|{ctl}|P|2.5\r"
        f"PV1|1|I|{first_ward_id}\r"
    )
    headers = {"X-AI-Census-Secret": "hl7-idem-secret"}

    r1 = ai_client.post("/ai/integration/hl7/adt", json={"message": msg}, headers=headers)
    assert r1.status_code == 200
    first = r1.json()
    assert first.get("idempotent_replay") is None

    r2 = ai_client.post("/ai/integration/hl7/adt", json={"message": msg}, headers=headers)
    assert r2.status_code == 200
    second = r2.json()
    assert second.get("idempotent_replay") is True
    second.pop("idempotent_replay", None)
    assert second == first


def test_integration_census_writes_sqlite_row(
    ai_client: TestClient,
    first_ward_id: str,
    tmp_path,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import settings

    db_path = tmp_path / "census.sqlite"
    monkeypatch.setattr(settings, "ward_census_sqlite_path", str(db_path), raising=False)
    monkeypatch.setattr(settings, "ai_census_integration_secret", "sqlite-integ-secret", raising=False)

    wards = ai_client.get("/ai/wards", headers={"X-UniHealth-Role": "doctor"}).json()
    ward = next((w for w in wards if w["ward_id"] == first_ward_id), wards[0])
    occ = max(2, min(4, int(ward["capacity"]) - 1))

    r = ai_client.post(
        f"/ai/integration/wards/{ward['ward_id']}/census-snapshot",
        json={"occupied": occ, "source": "pytest_sqlite_row"},
        headers={"X-AI-Census-Secret": "sqlite-integ-secret"},
    )
    assert r.status_code == 200

    conn = sqlite3.connect(str(db_path))
    try:
        n = conn.execute("SELECT COUNT(*) FROM ward_census_snapshot").fetchone()[0]
    finally:
        conn.close()
    assert int(n) >= 1


def test_hl7_extract_trigger_and_resolve_ward() -> None:
    from app.ai.hl7_adt_stub import extract_adt_trigger, pv1_assigned_location_field, resolve_ward_id

    msg = (
        "MSH|^~\\&|S|R|UH|UH|202601011200||ADT^A01|X|P|2.5\r"
        "PID|1||P1||DOE\r"
        "PV1|1|I|WARD-DEMO^RM1|||||||||||||||||||||||||||||||||||||||\r"
    )
    assert extract_adt_trigger(msg) == "A01"
    loc = pv1_assigned_location_field(msg)
    assert loc is not None
    assert resolve_ward_id(loc, ["WARD-DEMO"]) == "WARD-DEMO"


def test_integration_hl7_adt_disables_without_secret(ai_client: TestClient, first_ward_id: str) -> None:
    msg = (
        "MSH|^~\\&|S|R|UH|UH|202601011200||ADT^A01|X|P|2.5\r"
        f"PV1|1|I|{first_ward_id}\r"
    )
    r = ai_client.post(
        "/ai/integration/hl7/adt",
        json={"message": msg},
        headers={"X-AI-Census-Secret": "anything"},
    )
    assert r.status_code == 404


def test_integration_hl7_a08_returns_ignored(
    ai_client: TestClient,
    first_ward_id: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "ai_census_integration_secret", "hl7-test-secret", raising=False)
    msg = (
        "MSH|^~\\&|S|R|UH|UH|202601011200||ADT^A08|X|P|2.5\r"
        f"PV1|1|I|{first_ward_id}\r"
    )
    r = ai_client.post(
        "/ai/integration/hl7/adt",
        json={"message": msg},
        headers={"X-AI-Census-Secret": "hl7-test-secret"},
    )
    assert r.status_code == 200
    data = r.json()
    assert data.get("status") == "ignored"
    assert data.get("trigger") == "A08"


def test_integration_hl7_a01_updates_snapshot(
    ai_client: TestClient,
    first_ward_id: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "ai_census_integration_secret", "hl7-test-secret-2", raising=False)
    msg = (
        "MSH|^~\\&|S|R|UH|UH|202601011200||ADT^A01|X|P|2.5\r"
        f"PV1|1|I|{first_ward_id}\r"
    )
    r = ai_client.post(
        "/ai/integration/hl7/adt",
        json={"message": msg},
        headers={"X-AI-Census-Secret": "hl7-test-secret-2"},
    )
    assert r.status_code == 200
    data = r.json()
    assert "skipped" in data or "forecast_meta" in data or "history_length" in data

    if not data.get("skipped"):
        hist = ai_client.get(
            f"/ai/wards/{first_ward_id}/history?limit=32",
            headers={"X-UniHealth-Role": "doctor"},
        ).json()
        assert any(str(h.get("source", "")).startswith("hl7/ADT^A01") for h in hist)


def test_integration_hl7_ward_override_without_pv1_ward_match(
    ai_client: TestClient,
    first_ward_id: str,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from app.config import settings

    monkeypatch.setattr(settings, "ai_census_integration_secret", "hl7-test-secret-3", raising=False)
    msg = (
        "MSH|^~\\&|S|R|UH|UH|202601011200||ADT^A03|X|P|2.5\r"
        "PV1|1|I|UNKNOWN-LOCATION\r"
    )
    r = ai_client.post(
        "/ai/integration/hl7/adt",
        json={"message": msg, "ward_id_override": first_ward_id},
        headers={"X-AI-Census-Secret": "hl7-test-secret-3"},
    )
    assert r.status_code == 200