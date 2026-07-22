"""Load billing + UHIC from Postgres or seed in-memory pilot data."""

from __future__ import annotations

import logging

import app.state as st
from app.billing_service import bootstrap_billing_state
from app.insurance_service import bootstrap_uhic_state
from app.persistence import billing_pg, uhic_pg
from app.store import has_postgres_pool

_log = logging.getLogger(__name__)


def _apply_billing(data: dict) -> None:
    st.billing_invoices.clear()
    st.billing_payments.clear()
    st.mpesa_transactions.clear()
    st.billing_invoices.extend(data.get("invoices") or [])
    st.billing_payments.extend(data.get("payments") or [])
    st.mpesa_transactions.extend(data.get("mpesa_transactions") or [])


def _apply_uhic(data: dict) -> None:
    from app.insurance_service import verify_claim_audit_chain

    audit = list(data.get("claim_audit") or [])
    verify_claim_audit_chain(audit)

    st.uhic_members.clear()
    st.uhic_policies.clear()
    st.uhic_claims.clear()
    st.uhic_premium_ledger.clear()
    st.uhic_provider_scores.clear()
    st.uhic_claim_audit.clear()
    st.uhic_members.extend(data.get("members") or [])
    st.uhic_policies.extend(data.get("policies") or [])
    st.uhic_claims.extend(data.get("claims") or [])
    st.uhic_premium_ledger.extend(data.get("premium_ledger") or [])
    st.uhic_provider_scores.extend(data.get("provider_scores") or [])
    st.uhic_claim_audit.extend(audit)
    st.uhic_sync_version = int(data.get("sync_version") or 0)
    st.uhic_sync_updated_at = data.get("sync_updated_at")


async def _seed_billing_to_db() -> None:
    bootstrap_billing_state()
    await billing_pg.save_all(
        st.billing_invoices,
        st.billing_payments,
        st.mpesa_transactions,
    )


async def _seed_uhic_to_db() -> None:
    bootstrap_uhic_state()
    await uhic_pg.save_all(
        members=st.uhic_members,
        policies=st.uhic_policies,
        claims=st.uhic_claims,
        premium_ledger=st.uhic_premium_ledger,
        provider_scores=st.uhic_provider_scores,
        claim_audit=st.uhic_claim_audit,
        sync_version=int(st.uhic_sync_version or 0),
        sync_updated_at=st.uhic_sync_updated_at,
    )


async def load_pilot_state() -> None:
    """Hydrate billing/UHIC from Postgres when available; seed DB if empty."""
    if not has_postgres_pool():
        bootstrap_billing_state()
        bootstrap_uhic_state()
        return

    billing_data = await billing_pg.load_all()
    uhic_data = await uhic_pg.load_all()
    billing_has = bool(billing_data.get("invoices"))
    uhic_has = bool(uhic_data.get("members"))

    if billing_has:
        _apply_billing(billing_data)
    else:
        await _seed_billing_to_db()

    if uhic_has:
        _apply_uhic(uhic_data)
    else:
        await _seed_uhic_to_db()

    _log.info(
        "Pilot state ready (invoices=%s members=%s claims=%s billing_from_db=%s uhic_from_db=%s)",
        len(st.billing_invoices),
        len(st.uhic_members),
        len(st.uhic_claims),
        billing_has,
        uhic_has,
    )
