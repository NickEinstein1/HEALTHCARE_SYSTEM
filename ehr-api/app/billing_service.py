"""
Billing, invoices, and M-Pesa payment orchestration.
"""

from __future__ import annotations

import json
import time
import uuid
from typing import Any

import app.state as st
from app.mpesa import (
    ACCOUNT_REF,
    PAYBILL,
    c2b_signature_valid,
    merchant_request_id,
    normalize_phone,
    parse_c2b_payload,
    simulate_stk_result,
    stk_checkout_id,
)
from app.config import settings

INVOICE_STATUSES = frozenset({"draft", "issued", "paid", "cancelled", "covered"})
PAYMENT_STATUSES = frozenset({"pending", "completed", "failed", "cancelled"})
PAYMENT_METHODS = frozenset({"mpesa", "cash", "bank", "mtiba", "payroll"})
PAYMENT_PURPOSES = frozenset({"contribution", "invoice", "bill", "wallet_topup"})
DEFAULT_CONTRIBUTION_KES = 500.0


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _display_date(ts: str | float | None = None) -> str:
    if isinstance(ts, (int, float)):
        t = time.gmtime(ts)
    else:
        try:
            if ts and "T" in str(ts):
                parts = str(ts).split("T")[0].split("-")
                if len(parts) == 3:
                    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                    return f"{int(parts[2])} {months[int(parts[1]) - 1]} {parts[0]}"
        except (ValueError, IndexError):
            pass
        t = time.gmtime()
    months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
    return f"{t.tm_mday} {months[t.tm_mon - 1]} {t.tm_year}"


def bootstrap_billing_state() -> None:
    if st.billing_invoices:
        return
    st.billing_invoices.extend([
        {
            "id": "INV-2026-001",
            "patient_id": "P001",
            "patient_name": "Wangui Njoroge",
            "facility_id": "FAC-A",
            "description": "Cardiology consult",
            "amount_kes": 0.0,
            "balance_kes": 0.0,
            "status": "covered",
            "issued_at": "2026-02-04T10:00:00Z",
            "due_at": None,
            "paid_at": "2026-02-04T10:05:00Z",
            "created_by_role": "billing",
        },
        {
            "id": "INV-2026-002",
            "patient_id": "P001",
            "patient_name": "Wangui Njoroge",
            "facility_id": "FAC-A",
            "description": "Monthly UniHealth contribution — March 2026",
            "amount_kes": DEFAULT_CONTRIBUTION_KES,
            "balance_kes": DEFAULT_CONTRIBUTION_KES,
            "status": "issued",
            "issued_at": "2026-02-28T08:00:00Z",
            "due_at": "2026-03-31T23:59:59Z",
            "paid_at": None,
            "created_by_role": "billing",
        },
    ])
    st.billing_payments.extend([
        {
            "id": "PAY-8840",
            "invoice_id": None,
            "patient_id": "P001",
            "patient_name": "Wangui Njoroge",
            "method": "mpesa",
            "purpose": "contribution",
            "amount_kes": DEFAULT_CONTRIBUTION_KES,
            "status": "completed",
            "mpesa_receipt": "QHR7X2K3LP",
            "phone": "254712345678",
            "recorded_by_role": "patient",
            "created_at": "2026-02-28T09:14:00Z",
            "completed_at": "2026-02-28T09:14:22Z",
        },
        {
            "id": "PAY-8839",
            "invoice_id": None,
            "patient_id": "P001",
            "patient_name": "Wangui Njoroge",
            "method": "payroll",
            "purpose": "contribution",
            "amount_kes": DEFAULT_CONTRIBUTION_KES,
            "status": "completed",
            "mpesa_receipt": None,
            "phone": None,
            "recorded_by_role": "billing",
            "created_at": "2026-01-28T11:00:00Z",
            "completed_at": "2026-01-28T11:00:00Z",
        },
    ])


def _find_invoice(invoice_id: str) -> dict | None:
    for row in st.billing_invoices:
        if row.get("id") == invoice_id:
            return row
    return None


def _find_mpesa(checkout_id: str) -> dict | None:
    for row in st.mpesa_transactions:
        if row.get("checkout_request_id") == checkout_id:
            return row
    return None


def list_invoices(
    *,
    patient_id: str | None = None,
    status: str | None = None,
    limit: int = 100,
) -> list[dict]:
    rows = st.billing_invoices[:]
    if patient_id:
        rows = [r for r in rows if r.get("patient_id") == patient_id]
    if status:
        rows = [r for r in rows if r.get("status") == status]
    return rows[:limit]


def get_invoice(invoice_id: str) -> dict | None:
    return _find_invoice(invoice_id)


def create_invoice(payload: dict[str, Any], created_by_role: str) -> dict:
    patient_id = str(payload.get("patient_id") or "").strip()
    if not patient_id:
        raise ValueError("patient_id required")
    amount = float(payload.get("amount_kes") or 0)
    inv_id = str(payload.get("id") or f"INV-{time.strftime('%Y')}-{uuid.uuid4().hex[:4].upper()}")
    row = {
        "id": inv_id,
        "patient_id": patient_id,
        "patient_name": str(payload.get("patient_name") or patient_id),
        "facility_id": str(payload.get("facility_id") or "FAC-A"),
        "description": str(payload.get("description") or "Clinical service"),
        "amount_kes": amount,
        "balance_kes": amount,
        "status": str(payload.get("status") or "issued"),
        "issued_at": _now_iso(),
        "due_at": payload.get("due_at"),
        "paid_at": None,
        "created_by_role": created_by_role,
    }
    st.billing_invoices.insert(0, row)
    return row


def list_payments(
    *,
    patient_id: str | None = None,
    invoice_id: str | None = None,
    limit: int = 100,
) -> list[dict]:
    rows = st.billing_payments[:]
    if patient_id:
        rows = [r for r in rows if r.get("patient_id") == patient_id]
    if invoice_id:
        rows = [r for r in rows if r.get("invoice_id") == invoice_id]
    return rows[:limit]


def _apply_payment_to_invoice(invoice: dict, amount_kes: float) -> None:
    balance = max(0.0, float(invoice.get("balance_kes") or 0) - amount_kes)
    invoice["balance_kes"] = balance
    if balance <= 0:
        invoice["status"] = "paid"
        invoice["paid_at"] = _now_iso()
    elif invoice.get("status") == "draft":
        invoice["status"] = "issued"


def record_payment(payload: dict[str, Any], recorded_by_role: str) -> dict:
    method = str(payload.get("method") or "mpesa").strip().lower()
    if method not in PAYMENT_METHODS:
        raise ValueError(f"Unsupported payment method: {method}")
    amount = float(payload.get("amount_kes") or 0)
    if amount <= 0:
        raise ValueError("amount_kes must be positive")
    patient_id = str(payload.get("patient_id") or "").strip()
    if not patient_id:
        raise ValueError("patient_id required")
    invoice_id = payload.get("invoice_id")
    invoice = _find_invoice(str(invoice_id)) if invoice_id else None
    if invoice and invoice.get("patient_id") != patient_id:
        raise ValueError("invoice does not belong to patient")
    pay_id = str(payload.get("id") or f"PAY-{uuid.uuid4().hex[:4].upper()}")
    now = _now_iso()
    row = {
        "id": pay_id,
        "invoice_id": invoice.get("id") if invoice else None,
        "patient_id": patient_id,
        "patient_name": str(payload.get("patient_name") or invoice.get("patient_name") if invoice else patient_id),
        "method": method,
        "purpose": str(payload.get("purpose") or ("invoice" if invoice else "contribution")),
        "amount_kes": amount,
        "status": str(payload.get("status") or "completed"),
        "mpesa_receipt": payload.get("mpesa_receipt"),
        "phone": payload.get("phone"),
        "recorded_by_role": recorded_by_role,
        "created_at": now,
        "completed_at": now if row_status_completed(str(payload.get("status") or "completed")) else None,
    }
    st.billing_payments.insert(0, row)
    if invoice:
        _apply_payment_to_invoice(invoice, amount)
    return row


def row_status_completed(status: str) -> bool:
    return status == "completed"


def patient_summary(patient_id: str) -> dict[str, Any]:
    invoices = list_invoices(patient_id=patient_id)
    payments = list_payments(patient_id=patient_id)
    contributions = [p for p in payments if p.get("purpose") == "contribution"]
    total_contrib = sum(float(p.get("amount_kes") or 0) for p in contributions if p.get("status") == "completed")
    outstanding = [
        inv for inv in invoices
        if inv.get("status") in ("issued", "draft") and float(inv.get("balance_kes") or 0) > 0
    ]
    outstanding_total = sum(float(inv.get("balance_kes") or 0) for inv in outstanding)
    next_due = DEFAULT_CONTRIBUTION_KES if outstanding_total <= 0 else outstanding_total
    return {
        "patient_id": patient_id,
        "paybill": PAYBILL,
        "account_ref": ACCOUNT_REF,
        "currency": "KES",
        "contribution_amount_kes": DEFAULT_CONTRIBUTION_KES,
        "total_contributions_kes": total_contrib,
        "outstanding_total_kes": outstanding_total,
        "next_payment_kes": next_due,
        "membership_status": "up_to_date" if outstanding_total <= 0 else "payment_due",
        "mtiba_balance_kes": 3200.0,
        "invoices": invoices,
        "payments": payments,
        "contributions": [
            {
                "date": _display_date(p.get("completed_at") or p.get("created_at")),
                "method": (p.get("method") or "mpesa").upper().replace("MPESA", "M-PESA"),
                "amount_kes": p.get("amount_kes"),
                "amount": f"Ksh {int(float(p.get('amount_kes') or 0)):,}",
                "status": "Cleared" if p.get("status") == "completed" else str(p.get("status")),
                "mpesa_receipt": p.get("mpesa_receipt"),
            }
            for p in contributions
        ],
        "transactions": [
            {
                "date": _display_date(p.get("completed_at") or p.get("created_at")),
                "type": (p.get("purpose") or "payment").replace("_", " ").title(),
                "amount_kes": p.get("amount_kes"),
                "amount": f"Ksh {int(float(p.get('amount_kes') or 0)):,}",
                "method": p.get("method"),
                "status": p.get("status"),
            }
            for p in payments[:20]
        ],
        "bills": [
            {
                "date": _display_date(inv.get("issued_at")),
                "desc": inv.get("description"),
                "amount_kes": inv.get("amount_kes"),
                "amount": (
                    "Ksh 0" if float(inv.get("amount_kes") or 0) == 0
                    else f"Ksh {int(float(inv.get('amount_kes') or 0)):,}"
                ),
                "status": "Covered" if inv.get("status") == "covered" else (
                    "Paid" if inv.get("status") == "paid" else "Outstanding"
                ),
                "invoice_id": inv.get("id"),
                "balance_kes": inv.get("balance_kes"),
            }
            for inv in invoices
        ],
    }


def initiate_stk_push(
    *,
    patient_id: str,
    amount_kes: float | None,
    purpose: str,
    invoice_id: str | None,
    phone: str | None,
    initiated_by_role: str,
) -> dict[str, Any]:
    purpose_norm = (purpose or "contribution").strip().lower()
    if purpose_norm not in PAYMENT_PURPOSES:
        raise ValueError(f"Unsupported purpose: {purpose_norm}")
    invoice = None
    if invoice_id:
        invoice = _find_invoice(invoice_id)
        if not invoice:
            raise ValueError("invoice not found")
        if invoice.get("patient_id") != patient_id:
            raise ValueError("invoice does not belong to patient")
        amount = float(invoice.get("balance_kes") or invoice.get("amount_kes") or 0)
    elif amount_kes is not None:
        amount = float(amount_kes)
    else:
        amount = DEFAULT_CONTRIBUTION_KES if purpose_norm == "contribution" else 0.0
    if amount <= 0:
        raise ValueError("amount_kes must be positive")
    phone_norm = normalize_phone(phone or "254712345678")
    checkout_id = stk_checkout_id()
    merchant_id = merchant_request_id()
    txn = {
        "id": f"MPESA-{uuid.uuid4().hex[:8].upper()}",
        "checkout_request_id": checkout_id,
        "merchant_request_id": merchant_id,
        "patient_id": patient_id,
        "invoice_id": invoice.get("id") if invoice else None,
        "purpose": purpose_norm,
        "amount_kes": amount,
        "phone": phone_norm,
        "status": "pending",
        "mpesa_receipt": None,
        "initiated_by_role": initiated_by_role,
        "created_at": _now_iso(),
        "completed_at": None,
        "result_desc": None,
    }
    st.mpesa_transactions.insert(0, txn)
    message = (
        f"M-PESA STK Push sent to {phone_norm}. Enter your M-PESA PIN to complete. "
        f"Paybill {PAYBILL} · Account {ACCOUNT_REF} · Amount Ksh {int(amount):,}"
    )
    if settings.mpesa_simulate:
        result = simulate_stk_result(amount, phone_norm)
        txn["status"] = "completed"
        txn["mpesa_receipt"] = result["MpesaReceiptNumber"]
        txn["completed_at"] = _now_iso()
        txn["result_desc"] = result["ResultDesc"]
        payment = record_payment(
            {
                "patient_id": patient_id,
                "patient_name": invoice.get("patient_name") if invoice else patient_id,
                "invoice_id": invoice.get("id") if invoice else None,
                "amount_kes": amount,
                "method": "mpesa",
                "purpose": purpose_norm,
                "mpesa_receipt": result["MpesaReceiptNumber"],
                "phone": phone_norm,
                "status": "completed",
            },
            initiated_by_role,
        )
        txn["payment_id"] = payment["id"]
        message = (
            f"M-PESA payment confirmed. Receipt {result['MpesaReceiptNumber']} · "
            f"Ksh {int(amount):,} · Paybill {PAYBILL}"
        )
    return {
        "status": txn["status"],
        "checkout_request_id": checkout_id,
        "merchant_request_id": merchant_id,
        "amount_kes": amount,
        "phone": phone_norm,
        "paybill": PAYBILL,
        "account_ref": ACCOUNT_REF,
        "purpose": purpose_norm,
        "invoice_id": txn.get("invoice_id"),
        "mpesa_receipt": txn.get("mpesa_receipt"),
        "payment_id": txn.get("payment_id"),
        "message": message,
        "simulated": settings.mpesa_simulate,
    }


def process_c2b(payload: dict[str, Any], signature: str | None = None) -> dict[str, Any]:
    if not c2b_signature_valid(payload, signature):
        raise ValueError("invalid C2B signature")
    parsed = parse_c2b_payload(payload)
    amount = float(parsed["amount_kes"] or 0)
    if amount <= 0:
        raise ValueError("invalid amount")
    patient_id = str(payload.get("patient_id") or "P001").strip()
    bill_ref = parsed["bill_ref_number"]
    purpose = "contribution"
    invoice_id = None
    if bill_ref.upper().startswith("INV-"):
        invoice_id = bill_ref.upper()
        purpose = "invoice"
    payment = record_payment(
        {
            "patient_id": patient_id,
            "amount_kes": amount,
            "method": "mpesa",
            "purpose": purpose,
            "invoice_id": invoice_id,
            "mpesa_receipt": parsed["trans_id"],
            "phone": parsed["msisdn"],
            "status": "completed",
        },
        "mpesa_c2b",
    )
    txn = {
        "id": f"MPESA-{uuid.uuid4().hex[:8].upper()}",
        "checkout_request_id": None,
        "merchant_request_id": None,
        "patient_id": patient_id,
        "invoice_id": invoice_id,
        "purpose": purpose,
        "amount_kes": amount,
        "phone": parsed["msisdn"],
        "status": "completed",
        "mpesa_receipt": parsed["trans_id"],
        "initiated_by_role": "mpesa_c2b",
        "created_at": _now_iso(),
        "completed_at": _now_iso(),
        "result_desc": "C2B confirmed",
        "payment_id": payment["id"],
        "raw_json": json.dumps(parsed.get("raw") or {}),
    }
    st.mpesa_transactions.insert(0, txn)
    return {"status": "ok", "payment": payment, "transaction": txn}


def list_mpesa_transactions(*, patient_id: str | None = None, limit: int = 50) -> list[dict]:
    rows = st.mpesa_transactions[:]
    if patient_id:
        rows = [r for r in rows if r.get("patient_id") == patient_id]
    return rows[:limit]
