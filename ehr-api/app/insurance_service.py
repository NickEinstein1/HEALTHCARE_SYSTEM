"""
UHIC — UniHealth Insurance Cover service layer (pilot in-memory + actuarial APIs).
"""

from __future__ import annotations

import hashlib
import time
import uuid
from typing import Any

import app.state as st
from app.insurance.actuarial import (
    eccif_depletion_forecast,
    fraud_risk_score,
    loss_ratio,
    national_contribution,
    reserve_snapshot,
    risk_rated_premium,
    shif_contribution,
)

SCHEME_TYPES = frozenset({"SHIF", "PHF", "ECCIF", "private", "corporate"})
MEMBER_STATUSES = frozenset({"active", "inactive", "pending", "suspended"})
CLAIM_STATUSES = frozenset({"submitted", "adjudicated", "paid", "denied", "flagged", "pending"})


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _hash_chain(prev_hash: str | None, payload: str) -> str:
    base = (prev_hash or "GENESIS") + "|" + payload
    return hashlib.sha256(base.encode()).hexdigest()


def verify_claim_audit_chain(entries: list[dict[str, Any]]) -> None:
    """Raise ValueError if audit prev_hash pointers / hashes are inconsistent."""
    prev: str | None = None
    for i, entry in enumerate(entries):
        h = str(entry.get("hash") or "").strip()
        if not h:
            raise ValueError(f"uhic claim audit chain break at index {i} (missing hash)")
        stored_prev = entry.get("prev_hash")
        if i == 0:
            if stored_prev not in (None, ""):
                # First entry may reference GENESIS-era null only
                pass
        elif stored_prev != prev:
            raise ValueError(
                f"uhic claim audit chain break at index {i} "
                f"(prev_hash={stored_prev!r} expected={prev!r})"
            )
        prev = h



def bump_uhic_sync(reason: str = "update", *, persist: bool = True) -> int:
    """Monotonic version — all clients poll to detect claim/payment changes."""
    st.uhic_sync_version = int(st.uhic_sync_version or 0) + 1
    st.uhic_sync_updated_at = _now_iso()
    if persist:
        _persist_sync_meta()
    return st.uhic_sync_version


def _persist_sync_meta() -> None:
    from app.persistence import uhic_pg
    from app.persistence.runtime import schedule_persist

    schedule_persist(
        uhic_pg.upsert_sync_meta(int(st.uhic_sync_version or 0), st.uhic_sync_updated_at)
    )


def _persist_claim(row: dict[str, Any]) -> None:
    from app.persistence import uhic_pg
    from app.persistence.runtime import schedule_persist

    schedule_persist(uhic_pg.upsert_claim(row))


def _persist_audit(entry: dict[str, Any]) -> None:
    from app.persistence import uhic_pg
    from app.persistence.runtime import schedule_persist

    schedule_persist(uhic_pg.append_audit(entry))


def bootstrap_uhic_state() -> None:
    if st.uhic_members:
        return

    st.uhic_members.extend([
        {
            "member_id": "UHIC-M-0001",
            "patient_id": "P001",
            "household_id": "HH-1001",
            "national_id": "28451234",
            "scheme_type": "SHIF",
            "status": "active",
            "given_name": "Patience",
            "family_name": "Mutiso",
            "created_at": _now_iso(),
        },
        {
            "member_id": "UHIC-M-0002",
            "patient_id": "P002",
            "household_id": "HH-1002",
            "national_id": "30129876",
            "scheme_type": "private",
            "status": "active",
            "given_name": "Omar",
            "family_name": "Abdullahi",
            "created_at": _now_iso(),
        },
    ])

    st.uhic_policies.extend([
        {
            "policy_id": "POL-SHIF-001",
            "member_id": "UHIC-M-0001",
            "payer_type": "SHIF",
            "benefit_package_id": "PKG-SHIF-ESSENTIAL",
            "effective_from": "2026-01-01",
            "effective_to": "2027-01-01",
            "status": "active",
            "monthly_contribution_kes": shif_contribution(45_000),
        },
        {
            "policy_id": "POL-PVT-002",
            "member_id": "UHIC-M-0002",
            "payer_type": "private",
            "benefit_package_id": "PKG-PVT-FAMILY",
            "effective_from": "2026-01-01",
            "effective_to": "2027-01-01",
            "status": "active",
            "monthly_contribution_kes": risk_rated_premium(3500, 38, "2")["monthly_premium_kes"],
        },
    ])

    st.uhic_claims.extend([
        {
            "claim_id": "CLM-2026-0001",
            "member_id": "UHIC-M-0001",
            "patient_id": "P001",
            "encounter_id": "ENC-P001-001",
            "provider_id": "FAC-A",
            "scheme_type": "SHIF",
            "status": "adjudicated",
            "submitted_amount_kes": 12_500,
            "adjudicated_amount_kes": 11_200,
            "fraud_score": 12,
            "fraud_band": "low",
            "fraud_reasons": [],
            "submitted_at": _now_iso(),
        },
        {
            "claim_id": "CLM-2026-0002",
            "member_id": "UHIC-M-0002",
            "patient_id": "P002",
            "encounter_id": "ENC-P002-001",
            "provider_id": "FAC-0001",
            "scheme_type": "private",
            "status": "flagged",
            "submitted_amount_kes": 48_000,
            "adjudicated_amount_kes": None,
            "fraud_score": 70,
            "fraud_band": "high",
            "fraud_reasons": ["UPCODING", "CLINICAL_MISMATCH"],
            "submitted_at": _now_iso(),
        },
    ])

    st.uhic_premium_ledger.extend([
        {
            "ledger_id": "PREM-001",
            "policy_id": "POL-SHIF-001",
            "member_id": "UHIC-M-0001",
            "amount_kes": shif_contribution(45_000),
            "channel": "payroll",
            "remittance_ref": "KRA-2026-03",
            "penalty_flag": False,
            "paid_at": _now_iso(),
        },
    ])

    st.uhic_provider_scores.extend([
        {
            "provider_id": "FAC-A",
            "provider_name": "KNH Nairobi",
            "facility_tier": 6,
            "fraud_score": 18,
            "outlier_flags": [],
            "rejection_rate_pct": 4.2,
            "avg_claim_kes": 9_800,
            "last_review": _now_iso(),
        },
        {
            "provider_id": "FAC-0003",
            "provider_name": "Meru General",
            "facility_tier": 4,
            "fraud_score": 62,
            "outlier_flags": ["HIGH_AVG_CLAIM", "PROCEDURE_MIX"],
            "rejection_rate_pct": 11.5,
            "avg_claim_kes": 22_400,
            "last_review": _now_iso(),
        },
    ])

    prev = None
    for entry in [
        {"event": "claim_submitted", "claim_id": "CLM-2026-0001"},
        {"event": "claim_adjudicated", "claim_id": "CLM-2026-0001", "amount": 11200},
        {"event": "claim_submitted", "claim_id": "CLM-2026-0002"},
        {"event": "fraud_flag", "claim_id": "CLM-2026-0002", "score": 70},
    ]:
        payload = str(entry)
        prev = _hash_chain(prev, payload)
        st.uhic_claim_audit.append({
            "ts": _now_iso(),
            "event": entry["event"],
            "claim_id": entry.get("claim_id"),
            "payload": entry,
            "hash": prev,
            "prev_hash": st.uhic_claim_audit[-1]["hash"] if st.uhic_claim_audit else None,
        })
    if not st.uhic_sync_updated_at:
        bump_uhic_sync("bootstrap", persist=False)


def dashboard_summary() -> dict[str, Any]:
    bootstrap_uhic_state()
    active_members = sum(1 for m in st.uhic_members if m.get("status") == "active")
    flagged = sum(1 for c in st.uhic_claims if c.get("status") == "flagged")
    paid_claims = [c for c in st.uhic_claims if c.get("status") in ("paid", "adjudicated")]
    incurred = sum(c.get("adjudicated_amount_kes") or c.get("submitted_amount_kes") or 0 for c in paid_claims)
    earned = sum(p.get("monthly_contribution_kes", 0) * 12 for p in st.uhic_policies)
    reserves = reserve_snapshot(earned_premium_kes=max(earned, 1), reported_claims_kes=incurred)
    return {
        "active_members": active_members,
        "active_policies": sum(1 for p in st.uhic_policies if p.get("status") == "active"),
        "claims_submitted": len(st.uhic_claims),
        "claims_flagged": flagged,
        "loss_ratio": loss_ratio(incurred, max(earned, 1)),
        "reserves": reserves,
        "schemes": {"SHIF": 1, "private": 1, "PHF": 0, "ECCIF": 0, "corporate": 0},
    }


def list_members(scheme_type: str | None = None, status: str | None = None) -> list[dict]:
    bootstrap_uhic_state()
    rows = st.uhic_members
    if scheme_type:
        rows = [m for m in rows if m.get("scheme_type") == scheme_type]
    if status:
        rows = [m for m in rows if m.get("status") == status]
    return rows


def get_member(member_id: str) -> dict | None:
    bootstrap_uhic_state()
    return next((m for m in st.uhic_members if m.get("member_id") == member_id), None)


def list_policies(member_id: str | None = None) -> list[dict]:
    bootstrap_uhic_state()
    if member_id:
        return [p for p in st.uhic_policies if p.get("member_id") == member_id]
    return list(st.uhic_policies)


def list_claims(
    member_id: str | None = None,
    status: str | None = None,
    provider_id: str | None = None,
    patient_id: str | None = None,
) -> list[dict]:
    bootstrap_uhic_state()
    rows = st.uhic_claims
    if member_id:
        rows = [c for c in rows if c.get("member_id") == member_id]
    if patient_id:
        rows = [c for c in rows if c.get("patient_id") == patient_id]
    if status:
        rows = [c for c in rows if c.get("status") == status]
    if provider_id:
        rows = [c for c in rows if c.get("provider_id") == provider_id]
    return rows


def submit_claim(payload: dict) -> dict:
    bootstrap_uhic_state()
    encounter_id = str(payload.get("encounter_id", "")).strip()
    if not encounter_id:
        raise ValueError("encounter_id required — claims must link to clinical encounter (FK guarantee)")

    flags = payload.get("fraud_flags") or {}
    fraud = fraud_risk_score(
        phantom_encounter=bool(flags.get("phantom_encounter")),
        upcoding_flag=bool(flags.get("upcoding")),
        duplicate_billing=bool(flags.get("duplicate_billing")),
        provider_outlier=bool(flags.get("provider_outlier")),
        clinical_mismatch=bool(flags.get("clinical_mismatch")),
        impossible_sequence=bool(flags.get("impossible_sequence")),
    )

    claim_id = f"CLM-2026-{len(st.uhic_claims) + 1:04d}"
    row = {
        "claim_id": claim_id,
        "member_id": payload.get("member_id"),
        "patient_id": payload.get("patient_id"),
        "encounter_id": encounter_id,
        "provider_id": payload.get("provider_id", "FAC-A"),
        "scheme_type": payload.get("scheme_type", "SHIF"),
        "status": "flagged" if fraud["score"] >= 55 else "submitted",
        "submitted_amount_kes": float(payload.get("submitted_amount_kes", 0)),
        "adjudicated_amount_kes": None,
        "fraud_score": fraud["score"],
        "fraud_band": fraud["band"],
        "fraud_reasons": fraud["reason_codes"],
        "submitted_at": _now_iso(),
        "updated_at": _now_iso(),
    }
    st.uhic_claims.append(row)

    prev = st.uhic_claim_audit[-1]["hash"] if st.uhic_claim_audit else None
    h = _hash_chain(prev, str(row))
    audit_entry = {
        "ts": _now_iso(),
        "event": "claim_submitted",
        "claim_id": claim_id,
        "payload": row,
        "hash": h,
        "prev_hash": prev,
    }
    st.uhic_claim_audit.append(audit_entry)
    _persist_claim(row)
    _persist_audit(audit_entry)
    bump_uhic_sync("claim_submitted")
    return row


def decide_claim(claim_id: str, decision: str, note: str = "") -> dict:
    bootstrap_uhic_state()
    row = next((c for c in st.uhic_claims if c.get("claim_id") == claim_id), None)
    if not row:
        raise ValueError("claim not found")
    decision = str(decision or "").strip().lower()
    allowed = ("approve", "approved", "deny", "denied", "reject", "rejected", "partial")
    if decision not in allowed:
        raise ValueError("decision must be approve, deny/reject, or partial")

    if decision in ("approve", "approved"):
        row["status"] = "adjudicated"
        row["adjudicated_amount_kes"] = row.get("submitted_amount_kes")
    elif decision in ("deny", "denied", "reject", "rejected"):
        row["status"] = "denied"
        row["adjudicated_amount_kes"] = 0
    else:
        row["status"] = "adjudicated"
        row["adjudicated_amount_kes"] = round(float(row.get("submitted_amount_kes", 0)) * 0.75, 2)

    row["decision_note"] = note
    row["decided_at"] = _now_iso()
    row["updated_at"] = _now_iso()

    bridge_claim_to_billing(row)

    prev = st.uhic_claim_audit[-1]["hash"] if st.uhic_claim_audit else None
    h = _hash_chain(prev, f"{claim_id}:{decision}:{note}")
    audit_entry = {
        "ts": _now_iso(),
        "event": "claim_decision",
        "claim_id": claim_id,
        "payload": {"decision": decision, "note": note},
        "hash": h,
        "prev_hash": prev,
    }
    st.uhic_claim_audit.append(audit_entry)
    _persist_claim(row)
    _persist_audit(audit_entry)
    bump_uhic_sync("claim_decision")
    return row


def bridge_claim_to_billing(claim: dict) -> None:
    """Check-and-balance: adjudicated claims update patient billing invoices."""
    from app.billing_service import bootstrap_billing_state

    bootstrap_billing_state()
    pid = str(claim.get("patient_id") or "").strip()
    if not pid:
        return
    enc = str(claim.get("encounter_id") or "").strip()
    claim_id = str(claim.get("claim_id") or "")
    status = str(claim.get("status") or "")

    for inv in st.billing_invoices:
        if inv.get("patient_id") != pid:
            continue
        if enc and inv.get("encounter_id") == enc:
            _apply_claim_to_invoice(inv, claim, status)
            from app.billing_service import _persist_invoice

            _persist_invoice(inv)
            return
        if claim_id and inv.get("claim_id") == claim_id:
            _apply_claim_to_invoice(inv, claim, status)
            from app.billing_service import _persist_invoice

            _persist_invoice(inv)
            return

    if status in ("adjudicated", "paid"):
        amount = float(claim.get("adjudicated_amount_kes") or claim.get("submitted_amount_kes") or 0)
        new_inv = {
            "id": f"INV-{claim_id}" if claim_id else f"INV-{uuid.uuid4().hex[:8]}",
            "patient_id": pid,
            "patient_name": pid,
            "facility_id": claim.get("provider_id", "FAC-A"),
            "encounter_id": enc or None,
            "claim_id": claim_id or None,
            "description": f"UHIC claim {claim_id}",
            "amount_kes": amount,
            "balance_kes": 0.0,
            "status": "covered",
            "issued_at": _now_iso(),
            "due_at": None,
            "paid_at": _now_iso(),
            "created_by_role": "uhic",
        }
        st.billing_invoices.append(new_inv)
        from app.billing_service import _persist_invoice

        _persist_invoice(new_inv)


def _apply_claim_to_invoice(inv: dict, claim: dict, status: str) -> None:
    if status in ("adjudicated", "paid"):
        inv["status"] = "covered"
        inv["balance_kes"] = 0.0
        inv["claim_id"] = claim.get("claim_id")
        inv["paid_at"] = _now_iso()
    elif status == "denied":
        inv["status"] = "issued"
        inv["balance_kes"] = float(claim.get("submitted_amount_kes") or inv.get("amount_kes") or 0)
    inv["updated_at"] = _now_iso()


def patient_coverage_stats(patient_id: str) -> dict[str, Any]:
    """Aggregates for patient coverage UI across apps."""
    claims = list_claims(patient_id=patient_id)
    adjudicated = [c for c in claims if c.get("status") in ("adjudicated", "paid")]
    used_ytd = sum(float(c.get("adjudicated_amount_kes") or 0) for c in adjudicated)
    annual_limit = 120_000.0
    return {
        "balance_kes": round(max(0.0, annual_limit - used_ytd), 2),
        "used_ytd_kes": round(used_ytd, 2),
        "annual_limit_kes": annual_limit,
        "claims_count": len(claims),
        "claims_processed": len(adjudicated),
        "renewal_date": "2027-03-31",
        "cover_active": bool(coverage_for_patient(patient_id)),
    }


def sync_bundle(
    *,
    patient_id: str | None = None,
    since_version: int = 0,
    include_summary: bool = False,
) -> dict[str, Any]:
    """
    Fast sync hub for uhic-app, patient-app, and web portal.
    Returns minimal payload when ``since_version`` matches (cheap poll).
    """
    bootstrap_uhic_state()
    version = int(st.uhic_sync_version or 0)
    changed = version > since_version
    out: dict[str, Any] = {
        "sync_version": version,
        "updated_at": st.uhic_sync_updated_at or _now_iso(),
        "changed": changed,
        "claims_count": len(st.uhic_claims),
    }
    if not changed and since_version > 0:
        return out

    if patient_id:
        out["coverage"] = coverage_for_patient(patient_id)
        out["coverage_stats"] = patient_coverage_stats(patient_id)
        out["patient_claims"] = list_claims(patient_id=patient_id)
        from app.billing_service import bootstrap_billing_state, patient_summary

        bootstrap_billing_state()
        out["billing"] = patient_summary(patient_id)
    else:
        out["claims"] = list_claims()

    if include_summary:
        out["summary"] = dashboard_summary()
    return out


def actuarial_reserves() -> dict:
    bootstrap_uhic_state()
    earned = sum(p.get("monthly_contribution_kes", 0) * 12 for p in st.uhic_policies)
    reported = sum(
        c.get("adjudicated_amount_kes") or (c.get("submitted_amount_kes") if c.get("status") != "denied" else 0) or 0
        for c in st.uhic_claims
    )
    triangle = [reported * 0.35, reported * 0.62, reported]
    return reserve_snapshot(
        earned_premium_kes=max(earned, 1),
        reported_claims_kes=reported,
        reported_triangle=triangle,
        case_reserves_kes=round(reported * 0.08, 2),
    )


def actuarial_forecast(months: int = 12) -> dict:
    bootstrap_uhic_state()
    fund_balance = 2_400_000_000.0
    monthly_burn = 185_000_000.0
    monthly_inflow = 210_000_000.0
    return {
        "eccif_projection": eccif_depletion_forecast(fund_balance, monthly_burn, monthly_inflow, months),
        "assumptions": {
            "opening_balance_kes": fund_balance,
            "monthly_burn_kes": monthly_burn,
            "monthly_inflow_kes": monthly_inflow,
        },
    }


def quote_premium(payload: dict) -> dict:
    scheme = str(payload.get("scheme_type", "SHIF")).upper()
    if scheme == "SHIF":
        sector = str(payload.get("sector", "formal")).lower()
        if sector == "informal":
            return national_contribution(
                sector="informal",
                declared_monthly_income_kes=float(payload.get("declared_monthly_income_kes", payload.get("gross_salary_kes", 0))),
            )
        return national_contribution(
            sector="formal",
            gross_salary_kes=float(payload.get("gross_salary_kes", 0)),
        )
    return {
        "scheme_type": scheme,
        **risk_rated_premium(
            base_rate_kes=float(payload.get("base_rate_kes", 3500)),
            age=int(payload.get("age", 35)),
            occupation_class=str(payload.get("occupation_class", "2")),
            prior_claims_count=int(payload.get("prior_claims_count", 0)),
            prior_claims_amount_kes=float(payload.get("prior_claims_amount_kes", 0)),
            facility_tier_factor=float(payload.get("facility_tier_factor", 1.0)),
        ),
    }


def provider_risk_scores() -> list[dict]:
    bootstrap_uhic_state()
    return list(st.uhic_provider_scores)


def fraud_trend() -> dict:
    bootstrap_uhic_state()
    flagged = [c for c in st.uhic_claims if c.get("fraud_score", 0) >= 55]
    return {
        "flagged_count": len(flagged),
        "avg_fraud_score": round(
            sum(c.get("fraud_score", 0) for c in st.uhic_claims) / max(len(st.uhic_claims), 1),
            1,
        ),
        "by_band": {
            "low": sum(1 for c in st.uhic_claims if c.get("fraud_band") == "low"),
            "medium": sum(1 for c in st.uhic_claims if c.get("fraud_band") == "medium"),
            "high": sum(1 for c in st.uhic_claims if c.get("fraud_band") == "high"),
            "critical": sum(1 for c in st.uhic_claims if c.get("fraud_band") == "critical"),
        },
    }


def coverage_for_patient(patient_id: str) -> dict | None:
    bootstrap_uhic_state()
    member = next((m for m in st.uhic_members if m.get("patient_id") == patient_id), None)
    if not member:
        return None
    policies = list_policies(member["member_id"])
    return {"member": member, "policies": policies, "eligible": member.get("status") == "active"}
