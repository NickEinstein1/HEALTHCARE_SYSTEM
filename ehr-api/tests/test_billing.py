"""Tests for billing and M-Pesa payment API."""

from __future__ import annotations

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

import app.state as st
from app.api.routers import billing as billing_router
from app.billing_service import bootstrap_billing_state


@pytest.fixture
def client():
    st.billing_invoices.clear()
    st.billing_payments.clear()
    st.mpesa_transactions.clear()
    bootstrap_billing_state()
    app = FastAPI()
    app.include_router(billing_router.router)
    return TestClient(app)


def test_patient_summary(client: TestClient):
    res = client.get(
        "/billing/patient/summary",
        headers={"X-UniHealth-Role": "patient", "X-Patient-Id": "P001"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["patient_id"] == "P001"
    assert body["paybill"] == "400100"
    assert len(body["invoices"]) >= 1


def test_patient_stk_push_simulated(client: TestClient):
    before = len(st.billing_payments)
    res = client.post(
        "/patient/payment",
        json={"patient_id": "P001", "purpose": "contribution", "amount_kes": 500},
        headers={"X-UniHealth-Role": "patient", "X-Patient-Id": "P001"},
    )
    assert res.status_code == 200
    body = res.json()
    assert body["status"] == "completed"
    assert body["mpesa_receipt"]
    assert len(st.billing_payments) == before + 1


def test_billing_create_invoice(client: TestClient):
    res = client.post(
        "/billing/invoices",
        json={
            "patient_id": "P002",
            "patient_name": "Test Patient",
            "description": "Lab panel",
            "amount_kes": 1200,
        },
        headers={"X-UniHealth-Role": "billing"},
    )
    assert res.status_code == 200
    inv = res.json()["invoice"]
    assert inv["patient_id"] == "P002"
    assert inv["amount_kes"] == 1200


def test_billing_record_payment(client: TestClient):
    res = client.post(
        "/billing/payment",
        json={
            "patient_id": "P001",
            "invoice_id": "INV-2026-002",
            "amount_kes": 500,
            "method": "mpesa",
            "mpesa_receipt": "ABC123XYZ",
            "phone": "254712345678",
        },
        headers={"X-UniHealth-Role": "billing"},
    )
    assert res.status_code == 200
    payment = res.json()["payment"]
    assert payment["status"] == "completed"
    invoice = next(i for i in st.billing_invoices if i["id"] == "INV-2026-002")
    assert invoice["status"] == "paid"


def test_mpesa_c2b(client: TestClient):
    res = client.post(
        "/payments/mpesa/c2b",
        json={
            "patient_id": "P001",
            "TransAmount": "500",
            "TransID": "C2B123456",
            "MSISDN": "254700000001",
            "BillRefNumber": "UniHealth Health",
        },
    )
    assert res.status_code == 200
    assert res.json()["status"] == "ok"


def test_patient_cannot_access_other_patient_invoice(client: TestClient):
    res = client.get(
        "/billing/invoices/INV-2026-001",
        headers={"X-UniHealth-Role": "patient", "X-Patient-Id": "P999"},
    )
    assert res.status_code == 403
