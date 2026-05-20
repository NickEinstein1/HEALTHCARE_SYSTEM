"""
Phase 1 FHIR gateway contracts (no Postgres/Redis required — store layer mocked).
"""

from __future__ import annotations

from datetime import date, datetime
from unittest.mock import AsyncMock, patch

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routers.fhir import router
from app.config import settings
from app.models import (
    AllergyIntolerance,
    Encounter,
    MedicationRequest,
    Observation,
    Patient,
    PatientSummary,
)


@pytest.fixture()
def fhir_client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    with TestClient(app) as client:
        yield client


def _sample_summary() -> PatientSummary:
    return PatientSummary(
        patient=Patient(
            id="P001",
            nhi_number="NHI-P001",
            family_name="Mutiso",
            given_name="P.",
            birth_date=date(1980, 1, 1),
            gender="male",
        ),
        encounters=[
            Encounter(
                id="E001",
                patient_id="P001",
                facility_id="FAC-A",
                facility_name="KNH",
                status="finished",
                period_start=datetime(2026, 1, 1, 10, 0, 0),
            ),
        ],
    )


def test_patient_summary_cache_hit_header(fhir_client: TestClient) -> None:
    summary = _sample_summary()
    with (
        patch("app.api.routers.fhir.get_summary_from_cache", new_callable=AsyncMock, return_value=summary),
        patch("app.api.routers.fhir.get_summary_from_db", new_callable=AsyncMock) as db_mock,
    ):
        r = fhir_client.get(
            "/fhir/r5/Patient/P001/summary?encounters=5",
            headers={"X-Facility-Id": "FAC-A"},
        )
    assert r.status_code == 200
    assert r.headers.get("X-Cache-Source") == "redis-hit"
    assert r.json()["patient"]["id"] == "P001"
    db_mock.assert_not_called()


def test_patient_summary_db_miss_backfills_cache(fhir_client: TestClient) -> None:
    summary = _sample_summary()
    with (
        patch("app.api.routers.fhir.get_summary_from_cache", new_callable=AsyncMock, return_value=None),
        patch("app.api.routers.fhir.get_summary_from_db", new_callable=AsyncMock, return_value=summary),
        patch("app.api.routers.fhir.set_summary_in_cache", new_callable=AsyncMock) as cache_set,
    ):
        r = fhir_client.get("/fhir/r5/Patient/P001/summary?encounters=5")
    assert r.status_code == 200
    assert r.headers.get("X-Cache-Source") == "postgres-miss"
    cache_set.assert_awaited_once()


def test_patient_summary_strict_consent_denied(
    fhir_client: TestClient,
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.setattr(settings, "consent_mode", "strict", raising=False)
    with patch("app.api.routers.fhir.has_active_consent", new_callable=AsyncMock, return_value=False):
        r = fhir_client.get(
            "/fhir/r5/Patient/P001/summary?encounters=5",
            headers={"X-Facility-Id": "FAC-A"},
        )
    assert r.status_code == 403


def test_ingest_patient_accepted(fhir_client: TestClient) -> None:
    with patch("app.api.routers.fhir.send_patient") as send:
        r = fhir_client.post(
            "/fhir/r5/Patient",
            json={"id": "P099", "nhi_number": "NHI-P099", "family_name": "Test", "given_name": "T."},
        )
    assert r.status_code == 202
    assert r.json()["status"] == "accepted"
    send.assert_called_once()


def test_observations_list_from_cache(fhir_client: TestClient) -> None:
    obs = [
        Observation(
            id="O1",
            patient_id="P001",
            code="8867-4",
            value_text="72",
            unit="/min",
        ),
    ]
    with (
        patch("app.api.routers.fhir.get_observations_from_cache", new_callable=AsyncMock, return_value=obs),
        patch("app.api.routers.fhir.get_observations_from_db", new_callable=AsyncMock) as db_mock,
    ):
        r = fhir_client.get("/fhir/r5/Patient/P001/observations?limit=5")
    assert r.status_code == 200
    assert r.headers.get("X-Cache-Source") == "redis-hit"
    assert r.json()[0]["id"] == "O1"
    db_mock.assert_not_called()


def test_medication_requests_from_db(fhir_client: TestClient) -> None:
    meds = [
        MedicationRequest(id="M1", patient_id="P001", medication_code="RX1", status="active"),
    ]
    with (
        patch("app.api.routers.fhir.get_med_requests_from_cache", new_callable=AsyncMock, return_value=None),
        patch("app.api.routers.fhir.get_med_requests_from_db", new_callable=AsyncMock, return_value=meds),
        patch("app.api.routers.fhir.set_med_requests_in_cache", new_callable=AsyncMock),
    ):
        r = fhir_client.get("/fhir/r5/Patient/P001/medication-requests?limit=5")
    assert r.status_code == 200
    assert r.headers.get("X-Cache-Source") == "postgres-miss"


def test_ingest_allergy_intolerance_accepted(fhir_client: TestClient) -> None:
    with patch("app.api.routers.fhir.send_allergy_intolerance") as send:
        r = fhir_client.post(
            "/fhir/r5/AllergyIntolerance",
            json={
                "id": "A099",
                "patient_id": "P001",
                "code": "penicillin",
                "substance_text": "Penicillin",
                "criticality": "high",
            },
        )
    assert r.status_code == 202
    assert r.json()["status"] == "accepted"
    send.assert_called_once()


def test_allergy_intolerances_from_cache(fhir_client: TestClient) -> None:
    rows = [
        AllergyIntolerance(
            id="A1",
            patient_id="P001",
            substance_text="Penicillin",
            criticality="high",
        ),
    ]
    with (
        patch("app.api.routers.fhir.get_allergies_from_cache", new_callable=AsyncMock, return_value=rows),
        patch("app.api.routers.fhir.get_allergies_from_db", new_callable=AsyncMock) as db_mock,
    ):
        r = fhir_client.get("/fhir/r5/Patient/P001/allergy-intolerances?limit=5")
    assert r.status_code == 200
    assert r.headers.get("X-Cache-Source") == "redis-hit"
    assert r.json()[0]["id"] == "A1"
    db_mock.assert_not_called()
