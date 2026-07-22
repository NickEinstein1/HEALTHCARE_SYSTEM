"""Auth scoping tests for patient IDOR hardening."""

from __future__ import annotations

from fastapi import FastAPI, Request
from fastapi.testclient import TestClient

from app.auth import require_bound_patient_id
from app.config import settings
from app.patient_auth import issue_patient_session_token


def test_bound_patient_rejects_mismatched_header(monkeypatch):
    monkeypatch.setattr(settings, "oidc_enabled", False)
    token = issue_patient_session_token("P001")
    app = FastAPI()

    @app.get("/probe")
    def probe(request: Request):
        return {"pid": require_bound_patient_id(request, "patient", query_pid=None)}

    client = TestClient(app)
    ok = client.get(
        "/probe",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Patient-Id": "P001",
            "X-UniHealth-Role": "patient",
        },
    )
    assert ok.status_code == 200
    assert ok.json()["pid"] == "P001"

    bad = client.get(
        "/probe",
        headers={
            "Authorization": f"Bearer {token}",
            "X-Patient-Id": "P002",
            "X-UniHealth-Role": "patient",
        },
    )
    assert bad.status_code == 403
