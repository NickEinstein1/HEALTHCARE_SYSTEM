"""PostgreSQL persistence for billing invoices, payments, and M-Pesa transactions."""

from __future__ import annotations

import json
from typing import Any

from app.persistence._time import parse_ts, ts_to_iso
from app.store import has_postgres_pool, _require_pool


def _invoice_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "patient_id": row["patient_id"],
        "patient_name": row.get("patient_name"),
        "facility_id": row.get("facility_id") or "FAC-A",
        "encounter_id": row.get("encounter_id"),
        "claim_id": row.get("claim_id"),
        "description": row["description"],
        "amount_kes": float(row.get("amount_kes") or 0),
        "balance_kes": float(row.get("balance_kes") or 0),
        "status": row.get("status") or "issued",
        "issued_at": parse_ts(row.get("issued_at")),
        "due_at": parse_ts(row.get("due_at")),
        "paid_at": parse_ts(row.get("paid_at")),
        "created_by_role": row.get("created_by_role") or "billing",
    }


def _payment_row(row: dict[str, Any]) -> dict[str, Any]:
    return {
        "id": row["id"],
        "invoice_id": row.get("invoice_id"),
        "patient_id": row["patient_id"],
        "patient_name": row.get("patient_name"),
        "method": row["method"],
        "purpose": row["purpose"],
        "amount_kes": float(row.get("amount_kes") or 0),
        "status": row.get("status") or "pending",
        "mpesa_receipt": row.get("mpesa_receipt"),
        "phone": row.get("phone"),
        "recorded_by_role": row.get("recorded_by_role") or "billing",
        "created_at": parse_ts(row.get("created_at")),
        "completed_at": parse_ts(row.get("completed_at")),
    }


def _mpesa_row(row: dict[str, Any]) -> dict[str, Any]:
    raw = row.get("raw_json")
    if isinstance(raw, dict):
        raw = json.dumps(raw)
    return {
        "id": row["id"],
        "checkout_request_id": row.get("checkout_request_id"),
        "merchant_request_id": row.get("merchant_request_id"),
        "payment_id": row.get("payment_id"),
        "patient_id": row["patient_id"],
        "invoice_id": row.get("invoice_id"),
        "purpose": row["purpose"],
        "amount_kes": float(row.get("amount_kes") or 0),
        "phone": row.get("phone"),
        "status": row.get("status") or "pending",
        "mpesa_receipt": row.get("mpesa_receipt"),
        "initiated_by_role": row.get("initiated_by_role") or "patient",
        "result_desc": row.get("result_desc"),
        "raw_json": raw,
        "created_at": parse_ts(row.get("created_at")),
        "completed_at": parse_ts(row.get("completed_at")),
    }


def _record_invoice(rec: Any) -> dict[str, Any]:
    return {
        "id": rec["id"],
        "patient_id": rec["patient_id"],
        "patient_name": rec.get("patient_name"),
        "facility_id": rec.get("facility_id"),
        "encounter_id": rec.get("encounter_id"),
        "claim_id": rec.get("claim_id"),
        "description": rec["description"],
        "amount_kes": float(rec["amount_kes"]),
        "balance_kes": float(rec["balance_kes"]),
        "status": rec["status"],
        "issued_at": ts_to_iso(rec.get("issued_at")),
        "due_at": ts_to_iso(rec.get("due_at")),
        "paid_at": ts_to_iso(rec.get("paid_at")),
        "created_by_role": rec.get("created_by_role"),
        "updated_at": ts_to_iso(rec.get("updated_at")),
    }


def _record_payment(rec: Any) -> dict[str, Any]:
    return {
        "id": rec["id"],
        "invoice_id": rec.get("invoice_id"),
        "patient_id": rec["patient_id"],
        "patient_name": rec.get("patient_name"),
        "method": rec["method"],
        "purpose": rec["purpose"],
        "amount_kes": float(rec["amount_kes"]),
        "status": rec["status"],
        "mpesa_receipt": rec.get("mpesa_receipt"),
        "phone": rec.get("phone"),
        "recorded_by_role": rec.get("recorded_by_role"),
        "created_at": ts_to_iso(rec.get("created_at")),
        "completed_at": ts_to_iso(rec.get("completed_at")),
    }


def _record_mpesa(rec: Any) -> dict[str, Any]:
    return {
        "id": rec["id"],
        "checkout_request_id": rec.get("checkout_request_id"),
        "merchant_request_id": rec.get("merchant_request_id"),
        "payment_id": rec.get("payment_id"),
        "patient_id": rec["patient_id"],
        "invoice_id": rec.get("invoice_id"),
        "purpose": rec["purpose"],
        "amount_kes": float(rec["amount_kes"]),
        "phone": rec.get("phone"),
        "status": rec["status"],
        "mpesa_receipt": rec.get("mpesa_receipt"),
        "initiated_by_role": rec.get("initiated_by_role"),
        "result_desc": rec.get("result_desc"),
        "raw_json": rec.get("raw_json"),
        "created_at": ts_to_iso(rec.get("created_at")),
        "completed_at": ts_to_iso(rec.get("completed_at")),
    }


_INVOICE_UPSERT = """
INSERT INTO billing_invoices (
    id, patient_id, patient_name, facility_id, encounter_id, claim_id,
    description, amount_kes, balance_kes, status, issued_at, due_at, paid_at,
    created_by_role, updated_at
) VALUES (
    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW()
)
ON CONFLICT (id) DO UPDATE SET
    patient_name = EXCLUDED.patient_name,
    facility_id = EXCLUDED.facility_id,
    encounter_id = EXCLUDED.encounter_id,
    claim_id = EXCLUDED.claim_id,
    description = EXCLUDED.description,
    amount_kes = EXCLUDED.amount_kes,
    balance_kes = EXCLUDED.balance_kes,
    status = EXCLUDED.status,
    issued_at = EXCLUDED.issued_at,
    due_at = EXCLUDED.due_at,
    paid_at = EXCLUDED.paid_at,
    updated_at = NOW()
"""

_PAYMENT_UPSERT = """
INSERT INTO billing_payments (
    id, invoice_id, patient_id, patient_name, method, purpose,
    amount_kes, status, mpesa_receipt, phone, recorded_by_role,
    created_at, completed_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
ON CONFLICT (id) DO UPDATE SET
    invoice_id = EXCLUDED.invoice_id,
    status = EXCLUDED.status,
    mpesa_receipt = EXCLUDED.mpesa_receipt,
    phone = EXCLUDED.phone,
    completed_at = EXCLUDED.completed_at
"""

_MPESA_UPSERT = """
INSERT INTO mpesa_transactions (
    id, checkout_request_id, merchant_request_id, payment_id,
    patient_id, invoice_id, purpose, amount_kes, phone, status,
    mpesa_receipt, initiated_by_role, result_desc, raw_json,
    created_at, completed_at
) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
ON CONFLICT (id) DO UPDATE SET
    payment_id = EXCLUDED.payment_id,
    status = EXCLUDED.status,
    mpesa_receipt = EXCLUDED.mpesa_receipt,
    result_desc = EXCLUDED.result_desc,
    completed_at = EXCLUDED.completed_at
"""


async def load_all() -> dict[str, list[dict[str, Any]]]:
    if not has_postgres_pool():
        return {"invoices": [], "payments": [], "mpesa_transactions": []}
    pool = _require_pool()
    async with pool.acquire() as conn:
        inv_rows = await conn.fetch(
            "SELECT * FROM billing_invoices ORDER BY issued_at DESC NULLS LAST"
        )
        pay_rows = await conn.fetch(
            "SELECT * FROM billing_payments ORDER BY created_at DESC NULLS LAST"
        )
        mpesa_rows = await conn.fetch(
            "SELECT * FROM mpesa_transactions ORDER BY created_at DESC NULLS LAST"
        )
    return {
        "invoices": [_record_invoice(r) for r in inv_rows],
        "payments": [_record_payment(r) for r in pay_rows],
        "mpesa_transactions": [_record_mpesa(r) for r in mpesa_rows],
    }


async def has_data() -> bool:
    if not has_postgres_pool():
        return False
    pool = _require_pool()
    async with pool.acquire() as conn:
        n = await conn.fetchval("SELECT COUNT(*)::int FROM billing_invoices")
    return int(n or 0) > 0


async def upsert_invoice(row: dict[str, Any]) -> None:
    if not has_postgres_pool():
        return
    pool = _require_pool()
    async with pool.acquire() as conn:
        await _exec_invoice(conn, row)


async def upsert_payment(row: dict[str, Any]) -> None:
    if not has_postgres_pool():
        return
    pool = _require_pool()
    async with pool.acquire() as conn:
        await _exec_payment(conn, row)


async def upsert_mpesa(row: dict[str, Any]) -> None:
    if not has_postgres_pool():
        return
    pool = _require_pool()
    async with pool.acquire() as conn:
        await _exec_mpesa(conn, row)


async def _exec_invoice(conn: Any, row: dict[str, Any]) -> None:
    data = _invoice_row(row)
    await conn.execute(
        _INVOICE_UPSERT,
        data["id"],
        data["patient_id"],
        data["patient_name"],
        data["facility_id"],
        data["encounter_id"],
        data["claim_id"],
        data["description"],
        data["amount_kes"],
        data["balance_kes"],
        data["status"],
        data["issued_at"],
        data["due_at"],
        data["paid_at"],
        data["created_by_role"],
    )


async def _exec_payment(conn: Any, row: dict[str, Any]) -> None:
    data = _payment_row(row)
    await conn.execute(
        _PAYMENT_UPSERT,
        data["id"],
        data["invoice_id"],
        data["patient_id"],
        data["patient_name"],
        data["method"],
        data["purpose"],
        data["amount_kes"],
        data["status"],
        data["mpesa_receipt"],
        data["phone"],
        data["recorded_by_role"],
        data["created_at"],
        data["completed_at"],
    )


async def _exec_mpesa(conn: Any, row: dict[str, Any]) -> None:
    data = _mpesa_row(row)
    receipt = data.get("mpesa_receipt")
    if receipt:
        existing = await conn.fetchval(
            "SELECT id FROM mpesa_transactions WHERE mpesa_receipt = $1 LIMIT 1",
            receipt,
        )
        if existing:
            await conn.execute(
                """
                UPDATE mpesa_transactions SET
                    payment_id = $2,
                    status = $3,
                    result_desc = $4,
                    completed_at = $5
                WHERE id = $1
                """,
                existing,
                data.get("payment_id"),
                data["status"],
                data.get("result_desc"),
                data.get("completed_at"),
            )
            return
    await conn.execute(
        _MPESA_UPSERT,
        data["id"],
        data["checkout_request_id"],
        data["merchant_request_id"],
        data["payment_id"],
        data["patient_id"],
        data["invoice_id"],
        data["purpose"],
        data["amount_kes"],
        data["phone"],
        data["status"],
        data["mpesa_receipt"],
        data["initiated_by_role"],
        data["result_desc"],
        data["raw_json"],
        data["created_at"],
        data["completed_at"],
    )


async def persist_payment_bundle(
    *,
    invoice: dict[str, Any] | None = None,
    payment: dict[str, Any] | None = None,
    mpesa: dict[str, Any] | None = None,
) -> None:
    """Atomically write invoice + payment + optional M-Pesa txn."""
    if not has_postgres_pool():
        return
    if not invoice and not payment and not mpesa:
        return
    pool = _require_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            if invoice is not None:
                await _exec_invoice(conn, invoice)
            if payment is not None:
                await _exec_payment(conn, payment)
            if mpesa is not None:
                await _exec_mpesa(conn, mpesa)


async def save_all(
    invoices: list[dict[str, Any]],
    payments: list[dict[str, Any]],
    mpesa_transactions: list[dict[str, Any]],
) -> None:
    if not has_postgres_pool():
        return
    for row in invoices:
        await upsert_invoice(row)
    for row in payments:
        await upsert_payment(row)
    for row in mpesa_transactions:
        await upsert_mpesa(row)
