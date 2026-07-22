"""Round-trip persistence tests for billing + UHIC (requires local Postgres)."""

from __future__ import annotations

import os

import pytest

import app.state as st
from app.billing_service import bootstrap_billing_state, create_invoice
from app.insurance_service import bootstrap_uhic_state, submit_claim
from app.persistence import billing_pg, uhic_pg
from app.persistence.bootstrap import load_pilot_state
from app.store import close_postgres_pool, has_postgres_pool, init_postgres_pool


pytestmark = pytest.mark.skipif(
    os.getenv("EHR_TEST_PG") != "1",
    reason="Set EHR_TEST_PG=1 with Postgres running to enable integration tests",
)


@pytest.fixture
async def pg_pool():
    st.billing_invoices.clear()
    st.billing_payments.clear()
    st.mpesa_transactions.clear()
    st.uhic_members.clear()
    st.uhic_policies.clear()
    st.uhic_claims.clear()
    st.uhic_premium_ledger.clear()
    st.uhic_provider_scores.clear()
    st.uhic_claim_audit.clear()
    st.uhic_sync_version = 0
    st.uhic_sync_updated_at = None

    await init_postgres_pool()
    if not has_postgres_pool():
        pytest.skip("Postgres pool unavailable")
    yield
    await close_postgres_pool()


@pytest.mark.asyncio
async def test_billing_round_trip(pg_pool):
    bootstrap_billing_state()
    create_invoice(
        {
            "patient_id": "P002",
            "patient_name": "Persist Test",
            "description": "Persistence check",
            "amount_kes": 999,
        },
        "billing",
    )
    await billing_pg.save_all(st.billing_invoices, st.billing_payments, st.mpesa_transactions)

    st.billing_invoices.clear()
    loaded = await billing_pg.load_all()
    assert any(inv["id"] and inv["amount_kes"] == 999 for inv in loaded["invoices"])


@pytest.mark.asyncio
async def test_uhic_claim_persists(pg_pool):
    bootstrap_uhic_state()
    before = len(st.uhic_claims)
    submit_claim(
        {
            "member_id": "UHIC-M-0001",
            "patient_id": "P001",
            "encounter_id": "ENC-P001-002",
            "provider_id": "FAC-A",
            "scheme_type": "SHIF",
            "submitted_amount_kes": 1500,
        }
    )
    assert len(st.uhic_claims) == before + 1
    claim = st.uhic_claims[-1]
    await uhic_pg.upsert_claim(claim)

    rows = await uhic_pg.load_all()
    ids = {c["claim_id"] for c in rows["claims"]}
    assert claim["claim_id"] in ids


@pytest.mark.asyncio
async def test_load_pilot_state_from_empty_db(pg_pool):
    await load_pilot_state()
    assert len(st.billing_invoices) >= 1
    assert len(st.uhic_members) >= 1
    has_billing = await billing_pg.has_data()
    has_uhic = await uhic_pg.has_data()
    assert has_billing
    assert has_uhic
