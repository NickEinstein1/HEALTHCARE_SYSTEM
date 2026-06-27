"""Tests for clinical AI assessment (rules provider — no external API keys)."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routers import clinical_ai as clinical_ai_router
from app.config import settings


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "clinical_ai_provider", "rules")
    monkeypatch.setattr(settings, "kafka_bootstrap_servers", "")
    app = FastAPI()
    app.include_router(clinical_ai_router.router)
    return TestClient(app)


def test_providers_lists_rules(client):
    res = client.get(
        "/ai/clinical-assessment/providers",
        headers={"X-UniHealth-Role": "doctor"},
    )
    assert res.status_code == 200
    body = res.json()
    assert "rules" in body["configured_providers"]
    assert body["default_provider"] == "rules"


def test_assess_requires_role(client):
    res = client.post(
        "/ai/clinical-assessment",
        json={"patient_id": "P001", "scenario_assessment": "Fever and cough for 3 days"},
    )
    assert res.status_code in (401, 403)


def test_assess_rules_fallback(client):
    res = client.post(
        "/ai/clinical-assessment",
        json={
            "patient_id": "P001",
            "scenario_assessment": "Fever 39C, productive cough, pleuritic chest pain",
            "sickness_notes": "Patient reports worsening shortness of breath",
        },
        headers={"X-UniHealth-Role": "doctor"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["provider"] == "rules"
    assert body["summary"]
    assert "disclaimer" in body
    assert "audit_id" in body
    assert isinstance(body["differential_diagnoses"], list)


def test_context_preview(client):
    res = client.get(
        "/ai/clinical-assessment/context/P001",
        headers={"X-UniHealth-Role": "doctor"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["patient_id"] == "P001"
    assert "context" in body


def test_invalid_patient_id(client):
    res = client.post(
        "/ai/clinical-assessment",
        json={"patient_id": "../../etc", "scenario_assessment": "test"},
        headers={"X-UniHealth-Role": "doctor"},
    )
    assert res.status_code == 400
