"""Tests for legal document e-signing."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from app.api.routers import legal_documents as legal_router
from app.config import settings


@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(settings, "kafka_bootstrap_servers", "")
    app = FastAPI()
    app.include_router(legal_router.router)
    return TestClient(app)


def test_templates(client):
    res = client.get("/esign/templates", headers={"X-UniHealth-Role": "doctor"})
    assert res.status_code == 200
    body = res.json()
    types = {t["doc_type"] for t in body["templates"]}
    assert "poa" in types
    assert "surgical_consent" in types
    assert "emergency_consent" in types


def test_surgical_consent_flow(client):
    create = client.post(
        "/esign/documents",
        json={
            "patient_id": "P001",
            "doc_type": "surgical_consent",
            "context": {"procedure": "Appendectomy", "surgeon": "Dr. Mutuku"},
        },
        headers={"X-UniHealth-Role": "doctor"},
    )
    assert create.status_code == 200
    doc_id = create.json()["document"]["id"]

    patient_sign = client.post(
        f"/esign/documents/{doc_id}/sign",
        json={
            "signer_role": "patient",
            "signer_name": "Wangui Njoroge",
            "attestation": "I have read and agree to the procedure described.",
        },
        headers={"X-UniHealth-Role": "doctor"},
    )
    assert patient_sign.status_code == 200

    clinician_sign = client.post(
        f"/esign/documents/{doc_id}/sign",
        json={
            "signer_role": "clinician",
            "signer_name": "Dr. James Mutuku",
            "attestation": "I confirm informed consent was obtained.",
        },
        headers={"X-UniHealth-Role": "doctor"},
    )
    assert clinician_sign.status_code == 200
    assert clinician_sign.json()["document"]["status"] == "completed"

    verify = client.get(
        f"/esign/documents/{doc_id}/verify",
        headers={"X-UniHealth-Role": "doctor"},
    )
    assert verify.status_code == 200
    assert verify.json()["valid"] is True
    assert verify.json()["verification_code_valid"] is True


def test_emergency_consent(client):
    create = client.post(
        "/esign/documents",
        json={
            "patient_id": "P002",
            "doc_type": "emergency_consent",
            "context": {"incapacity": "Unconscious", "surrogate": "Spouse present"},
        },
        headers={"X-UniHealth-Role": "nurse"},
    )
    assert create.status_code == 200
    doc_id = create.json()["document"]["id"]

    for role, name in [("clinician", "Dr. Onyango"), ("witness", "Nurse Njeri")]:
        res = client.post(
            f"/esign/documents/{doc_id}/sign",
            json={
                "signer_role": role,
                "signer_name": name,
                "attestation": "Emergency grounds documented.",
            },
            headers={"X-UniHealth-Role": "nurse"},
        )
        assert res.status_code == 200

    verify = client.get(f"/esign/documents/{doc_id}/verify", headers={"X-UniHealth-Role": "nurse"})
    assert verify.json()["valid"] is True


def test_poa_patient_create(client):
    res = client.post(
        "/esign/documents",
        json={
            "patient_id": "P001",
            "doc_type": "poa",
            "context": {"agent_name": "Grace Adhiambo", "relationship": "Sister"},
        },
        headers={"X-UniHealth-Role": "patient", "X-Patient-Id": "P001"},
    )
    assert res.status_code == 200
    assert res.json()["document"]["doc_type"] == "poa"
