"""PostgreSQL persistence for UHIC members, claims, and sync metadata."""

from __future__ import annotations

import json
from typing import Any

from app.persistence._time import parse_ts, ts_to_iso
from app.store import has_postgres_pool, _require_pool


def _json_list(value: Any) -> list:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    if isinstance(value, str):
        try:
            parsed = json.loads(value)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []
    return []


def _member_row(row: dict[str, Any]) -> tuple:
    return (
        row["member_id"],
        row["patient_id"],
        row.get("household_id"),
        row.get("national_id"),
        row.get("scheme_type") or "SHIF",
        row.get("status") or "active",
        row.get("given_name"),
        row.get("family_name"),
        parse_ts(row.get("created_at")),
    )


def _policy_row(row: dict[str, Any]) -> tuple:
    eff_from = row.get("effective_from")
    eff_to = row.get("effective_to")
    return (
        row["policy_id"],
        row["member_id"],
        row.get("payer_type") or row.get("scheme_type") or "SHIF",
        row.get("benefit_package_id"),
        parse_ts(str(eff_from) + "T00:00:00Z") if eff_from and "T" not in str(eff_from) else parse_ts(eff_from),
        parse_ts(str(eff_to) + "T00:00:00Z") if eff_to and "T" not in str(eff_to) else parse_ts(eff_to),
        row.get("status") or "active",
        float(row.get("monthly_contribution_kes") or 0),
    )


def _claim_row(row: dict[str, Any]) -> tuple:
    adj = row.get("adjudicated_amount_kes")
    return (
        row["claim_id"],
        row["member_id"],
        row["patient_id"],
        row.get("encounter_id"),
        row.get("provider_id"),
        row.get("scheme_type") or "SHIF",
        row.get("status") or "submitted",
        float(row.get("submitted_amount_kes") or 0),
        float(adj) if adj is not None else None,
        int(row.get("fraud_score") or 0),
        row.get("fraud_band"),
        json.dumps(_json_list(row.get("fraud_reasons"))),
        parse_ts(row.get("submitted_at")),
        parse_ts(row.get("decided_at")),
        row.get("decision_note"),
        parse_ts(row.get("updated_at")),
    )


def _ledger_row(row: dict[str, Any]) -> tuple:
    return (
        row["ledger_id"],
        row["policy_id"],
        row["member_id"],
        float(row.get("amount_kes") or 0),
        row.get("channel"),
        row.get("remittance_ref"),
        bool(row.get("penalty_flag")),
        parse_ts(row.get("paid_at")),
    )


def _provider_row(row: dict[str, Any]) -> tuple:
    return (
        row["provider_id"],
        row.get("provider_name"),
        row.get("facility_tier"),
        int(row.get("fraud_score") or 0),
        json.dumps(_json_list(row.get("outlier_flags"))),
        float(row["rejection_rate_pct"]) if row.get("rejection_rate_pct") is not None else None,
        float(row["avg_claim_kes"]) if row.get("avg_claim_kes") is not None else None,
        parse_ts(row.get("last_review")),
    )


_MEMBER_UPSERT = """
INSERT INTO uhic_members (
    member_id, patient_id, household_id, national_id, scheme_type,
    status, given_name, family_name, created_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
ON CONFLICT (member_id) DO UPDATE SET
    status = EXCLUDED.status,
    given_name = EXCLUDED.given_name,
    family_name = EXCLUDED.family_name
"""

_POLICY_UPSERT = """
INSERT INTO uhic_policies (
    policy_id, member_id, payer_type, benefit_package_id,
    effective_from, effective_to, status, monthly_contribution_kes
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (policy_id) DO UPDATE SET
    status = EXCLUDED.status,
    monthly_contribution_kes = EXCLUDED.monthly_contribution_kes
"""

_CLAIM_UPSERT = """
INSERT INTO uhic_claims (
    claim_id, member_id, patient_id, encounter_id, provider_id, scheme_type,
    status, submitted_amount_kes, adjudicated_amount_kes, fraud_score, fraud_band,
    fraud_reasons, submitted_at, decided_at, decision_note, updated_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13, $14, $15, $16)
ON CONFLICT (claim_id) DO UPDATE SET
    status = EXCLUDED.status,
    adjudicated_amount_kes = EXCLUDED.adjudicated_amount_kes,
    fraud_score = EXCLUDED.fraud_score,
    fraud_band = EXCLUDED.fraud_band,
    fraud_reasons = EXCLUDED.fraud_reasons,
    decided_at = EXCLUDED.decided_at,
    decision_note = EXCLUDED.decision_note,
    updated_at = EXCLUDED.updated_at
"""

_LEDGER_UPSERT = """
INSERT INTO uhic_premium_ledger (
    ledger_id, policy_id, member_id, amount_kes, channel,
    remittance_ref, penalty_flag, paid_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
ON CONFLICT (ledger_id) DO NOTHING
"""

_PROVIDER_UPSERT = """
INSERT INTO uhic_provider_scores (
    provider_id, provider_name, facility_tier, fraud_score, outlier_flags,
    rejection_rate_pct, avg_claim_kes, last_review
) VALUES ($1, $2, $3, $4, $5::jsonb, $6, $7, $8)
ON CONFLICT (provider_id) DO UPDATE SET
    fraud_score = EXCLUDED.fraud_score,
    outlier_flags = EXCLUDED.outlier_flags,
    rejection_rate_pct = EXCLUDED.rejection_rate_pct,
    avg_claim_kes = EXCLUDED.avg_claim_kes,
    last_review = EXCLUDED.last_review
"""


async def load_all() -> dict[str, Any]:
    empty: dict[str, Any] = {
        "members": [],
        "policies": [],
        "claims": [],
        "premium_ledger": [],
        "provider_scores": [],
        "claim_audit": [],
        "sync_version": 0,
        "sync_updated_at": None,
    }
    if not has_postgres_pool():
        return empty
    pool = _require_pool()
    async with pool.acquire() as conn:
        members = await conn.fetch("SELECT * FROM uhic_members ORDER BY created_at")
        policies = await conn.fetch("SELECT * FROM uhic_policies ORDER BY policy_id")
        claims = await conn.fetch(
            "SELECT * FROM uhic_claims ORDER BY submitted_at DESC NULLS LAST"
        )
        ledger = await conn.fetch("SELECT * FROM uhic_premium_ledger ORDER BY paid_at DESC")
        providers = await conn.fetch("SELECT * FROM uhic_provider_scores ORDER BY provider_id")
        audit = await conn.fetch(
            "SELECT * FROM uhic_claim_audit ORDER BY id ASC"
        )
        sync_row = await conn.fetchrow("SELECT sync_version, updated_at FROM uhic_sync_meta WHERE id = 1")

    def _date_only(val: Any) -> str | None:
        if val is None:
            return None
        if hasattr(val, "isoformat"):
            return val.isoformat()[:10]
        return str(val)[:10]

    return {
        "members": [
            {
                "member_id": r["member_id"],
                "patient_id": r["patient_id"],
                "household_id": r.get("household_id"),
                "national_id": r.get("national_id"),
                "scheme_type": r["scheme_type"],
                "status": r["status"],
                "given_name": r.get("given_name"),
                "family_name": r.get("family_name"),
                "created_at": ts_to_iso(r.get("created_at")),
            }
            for r in members
        ],
        "policies": [
            {
                "policy_id": r["policy_id"],
                "member_id": r["member_id"],
                "payer_type": r["payer_type"],
                "benefit_package_id": r.get("benefit_package_id"),
                "effective_from": _date_only(r.get("effective_from")),
                "effective_to": _date_only(r.get("effective_to")),
                "status": r["status"],
                "monthly_contribution_kes": float(r["monthly_contribution_kes"]),
            }
            for r in policies
        ],
        "claims": [
            {
                "claim_id": r["claim_id"],
                "member_id": r["member_id"],
                "patient_id": r["patient_id"],
                "encounter_id": r.get("encounter_id"),
                "provider_id": r.get("provider_id"),
                "scheme_type": r["scheme_type"],
                "status": r["status"],
                "submitted_amount_kes": float(r["submitted_amount_kes"]),
                "adjudicated_amount_kes": (
                    float(r["adjudicated_amount_kes"])
                    if r["adjudicated_amount_kes"] is not None
                    else None
                ),
                "fraud_score": int(r["fraud_score"]),
                "fraud_band": r.get("fraud_band"),
                "fraud_reasons": _json_list(r.get("fraud_reasons")),
                "submitted_at": ts_to_iso(r.get("submitted_at")),
                "decided_at": ts_to_iso(r.get("decided_at")),
                "decision_note": r.get("decision_note"),
                "updated_at": ts_to_iso(r.get("updated_at")),
            }
            for r in claims
        ],
        "premium_ledger": [
            {
                "ledger_id": r["ledger_id"],
                "policy_id": r["policy_id"],
                "member_id": r["member_id"],
                "amount_kes": float(r["amount_kes"]),
                "channel": r.get("channel"),
                "remittance_ref": r.get("remittance_ref"),
                "penalty_flag": bool(r.get("penalty_flag")),
                "paid_at": ts_to_iso(r.get("paid_at")),
            }
            for r in ledger
        ],
        "provider_scores": [
            {
                "provider_id": r["provider_id"],
                "provider_name": r.get("provider_name"),
                "facility_tier": r.get("facility_tier"),
                "fraud_score": int(r["fraud_score"]),
                "outlier_flags": _json_list(r.get("outlier_flags")),
                "rejection_rate_pct": (
                    float(r["rejection_rate_pct"])
                    if r["rejection_rate_pct"] is not None
                    else None
                ),
                "avg_claim_kes": (
                    float(r["avg_claim_kes"]) if r["avg_claim_kes"] is not None else None
                ),
                "last_review": ts_to_iso(r.get("last_review")),
            }
            for r in providers
        ],
        "claim_audit": [
            {
                "ts": ts_to_iso(r.get("ts")),
                "event": r["event"],
                "claim_id": r.get("claim_id"),
                "payload": r["payload"] if isinstance(r["payload"], dict) else json.loads(r["payload"] or "{}"),
                "hash": r["hash"],
                "prev_hash": r.get("prev_hash"),
            }
            for r in audit
        ],
        "sync_version": int(sync_row["sync_version"]) if sync_row else 0,
        "sync_updated_at": ts_to_iso(sync_row["updated_at"]) if sync_row else None,
    }


async def has_data() -> bool:
    if not has_postgres_pool():
        return False
    pool = _require_pool()
    async with pool.acquire() as conn:
        n = await conn.fetchval("SELECT COUNT(*)::int FROM uhic_members")
    return int(n or 0) > 0


async def upsert_member(row: dict[str, Any]) -> None:
    if not has_postgres_pool():
        return
    pool = _require_pool()
    async with pool.acquire() as conn:
        await conn.execute(_MEMBER_UPSERT, *_member_row(row))


async def upsert_policy(row: dict[str, Any]) -> None:
    if not has_postgres_pool():
        return
    pool = _require_pool()
    async with pool.acquire() as conn:
        await conn.execute(_POLICY_UPSERT, *_policy_row(row))


async def upsert_claim(row: dict[str, Any]) -> None:
    if not has_postgres_pool():
        return
    pool = _require_pool()
    async with pool.acquire() as conn:
        await conn.execute(_CLAIM_UPSERT, *_claim_row(row))


async def upsert_ledger(row: dict[str, Any]) -> None:
    if not has_postgres_pool():
        return
    pool = _require_pool()
    async with pool.acquire() as conn:
        await conn.execute(_LEDGER_UPSERT, *_ledger_row(row))


async def upsert_provider(row: dict[str, Any]) -> None:
    if not has_postgres_pool():
        return
    pool = _require_pool()
    async with pool.acquire() as conn:
        await conn.execute(_PROVIDER_UPSERT, *_provider_row(row))


async def append_audit(entry: dict[str, Any]) -> None:
    if not has_postgres_pool():
        return
    payload = entry.get("payload") or {}
    if not isinstance(payload, dict):
        payload = {"value": payload}
    pool = _require_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO uhic_claim_audit (ts, event, claim_id, payload, hash, prev_hash)
            VALUES ($1, $2, $3, $4::jsonb, $5, $6)
            """,
            parse_ts(entry.get("ts")),
            entry.get("event"),
            entry.get("claim_id"),
            json.dumps(payload),
            entry.get("hash"),
            entry.get("prev_hash"),
        )


async def upsert_sync_meta(version: int, updated_at: str | None) -> None:
    if not has_postgres_pool():
        return
    pool = _require_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            INSERT INTO uhic_sync_meta (id, sync_version, updated_at)
            VALUES (1, $1, $2)
            ON CONFLICT (id) DO UPDATE SET
                sync_version = EXCLUDED.sync_version,
                updated_at = EXCLUDED.updated_at
            """,
            int(version),
            parse_ts(updated_at),
        )


async def save_all(
    *,
    members: list[dict[str, Any]],
    policies: list[dict[str, Any]],
    claims: list[dict[str, Any]],
    premium_ledger: list[dict[str, Any]],
    provider_scores: list[dict[str, Any]],
    claim_audit: list[dict[str, Any]],
    sync_version: int,
    sync_updated_at: str | None,
) -> None:
    if not has_postgres_pool():
        return
    for row in members:
        await upsert_member(row)
    for row in policies:
        await upsert_policy(row)
    for row in claims:
        await upsert_claim(row)
    for row in premium_ledger:
        await upsert_ledger(row)
    for row in provider_scores:
        await upsert_provider(row)
    for entry in claim_audit:
        await append_audit(entry)
    await upsert_sync_meta(sync_version, sync_updated_at)
