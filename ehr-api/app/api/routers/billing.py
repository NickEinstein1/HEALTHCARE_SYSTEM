"""
Billing and patient payment API.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException, Query, Request

from app.auth import require_bound_patient_id, require_role
from app.billing_service import (
    bootstrap_billing_state,
    create_invoice,
    get_invoice,
    initiate_stk_push,
    list_invoices,
    list_mpesa_transactions,
    list_payments,
    patient_summary,
    process_c2b,
    record_payment,
)
from app.persistence.runtime import PersistenceError

router = APIRouter(tags=["billing"])


def _patient_id_from_request(request: Request, role: str, query_pid: str | None) -> str:
    pid = require_bound_patient_id(request, role, query_pid=query_pid, required=True)
    assert pid is not None
    return pid


def _http_from_exc(exc: Exception) -> HTTPException:
    if isinstance(exc, PersistenceError):
        return HTTPException(status_code=503, detail=f"persistence unavailable: {exc}")
    if isinstance(exc, ValueError):
        return HTTPException(status_code=400, detail=str(exc))
    return HTTPException(status_code=500, detail=str(exc))


@router.get("/billing/invoices", summary="List invoices")
def billing_invoices_list(
    request: Request,
    patient_id: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    role = require_role(request, ["billing", "admin", "pharmacy", "patient"])
    bootstrap_billing_state()
    pid = patient_id
    if role == "patient":
        pid = _patient_id_from_request(request, role, patient_id)
    rows = list_invoices(patient_id=pid, status=status, limit=limit)
    return {"invoices": rows, "count": len(rows)}


@router.post("/billing/invoices", summary="Create invoice")
def billing_invoice_create(request: Request, payload: dict):
    require_role(request, ["billing", "admin", "pharmacy"])
    bootstrap_billing_state()
    try:
        row = create_invoice(payload, "billing")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return {"status": "created", "invoice": row}


@router.get("/billing/invoices/{invoice_id}", summary="Get invoice")
def billing_invoice_get(request: Request, invoice_id: str):
    role = require_role(request, ["billing", "admin", "pharmacy", "patient"])
    bootstrap_billing_state()
    row = get_invoice(invoice_id)
    if not row:
        raise HTTPException(status_code=404, detail="invoice not found")
    if role == "patient":
        pid = _patient_id_from_request(request, role, None)
        if row.get("patient_id") != pid:
            raise HTTPException(status_code=403, detail="forbidden")
    return {"invoice": row}


@router.get("/billing/payments", summary="List payments")
def billing_payments_list(
    request: Request,
    patient_id: str | None = Query(default=None),
    invoice_id: str | None = Query(default=None),
    limit: int = Query(default=100, ge=1, le=500),
):
    role = require_role(request, ["billing", "admin", "patient"])
    bootstrap_billing_state()
    pid = patient_id
    if role == "patient":
        pid = _patient_id_from_request(request, role, patient_id)
    rows = list_payments(patient_id=pid, invoice_id=invoice_id, limit=limit)
    return {"payments": rows, "count": len(rows)}


@router.post("/billing/payment", summary="Record payment (billing desk)")
def billing_payment_record(request: Request, payload: dict):
    role = require_role(request, ["billing", "admin"])
    bootstrap_billing_state()
    try:
        row = record_payment(payload, role)
    except (ValueError, PersistenceError) as exc:
        raise _http_from_exc(exc) from exc
    return {"status": "recorded", "payment": row}


@router.get("/billing/patient/summary", summary="Patient billing summary")
def billing_patient_summary(request: Request, patient_id: str | None = Query(default=None)):
    role = require_role(request, ["patient", "billing", "admin"])
    bootstrap_billing_state()
    pid = _patient_id_from_request(request, role, patient_id)
    return patient_summary(pid)


@router.post("/patient/payment", summary="Patient initiate M-Pesa payment")
def patient_payment(request: Request, payload: dict):
    role = require_role(request, ["patient"])
    bootstrap_billing_state()
    pid = _patient_id_from_request(request, role, payload.get("patient_id"))
    try:
        result = initiate_stk_push(
            patient_id=pid,
            amount_kes=payload.get("amount_kes"),
            purpose=str(payload.get("purpose") or "contribution"),
            invoice_id=payload.get("invoice_id"),
            phone=payload.get("phone"),
            initiated_by_role=role,
        )
    except (ValueError, PersistenceError) as exc:
        raise _http_from_exc(exc) from exc
    return {"status": "ok", **result}


@router.post("/payments/mpesa/stk-push", summary="Initiate M-Pesa STK Push")
def mpesa_stk_push(request: Request, payload: dict):
    role = require_role(request, ["patient", "billing", "admin"])
    bootstrap_billing_state()
    pid = str(payload.get("patient_id") or "").strip()
    if role == "patient":
        pid = _patient_id_from_request(request, role, pid or None)
    if not pid:
        raise HTTPException(status_code=400, detail="patient_id required")
    try:
        result = initiate_stk_push(
            patient_id=pid,
            amount_kes=payload.get("amount_kes"),
            purpose=str(payload.get("purpose") or "contribution"),
            invoice_id=payload.get("invoice_id"),
            phone=payload.get("phone"),
            initiated_by_role=role,
        )
    except (ValueError, PersistenceError) as exc:
        raise _http_from_exc(exc) from exc
    return {"status": "ok", **result}


@router.post("/payments/mpesa/c2b", summary="Safaricom C2B callback")
def mpesa_c2b(request: Request, payload: dict):
    bootstrap_billing_state()
    signature = request.headers.get("X-Mpesa-Signature")
    try:
        result = process_c2b(payload, signature=signature)
    except (ValueError, PersistenceError) as exc:
        raise _http_from_exc(exc) from exc
    return result


@router.get("/payments/mpesa/transactions", summary="List M-Pesa transactions")
def mpesa_transactions_list(
    request: Request,
    patient_id: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
):
    role = require_role(request, ["billing", "admin", "patient"])
    bootstrap_billing_state()
    pid = patient_id
    if role == "patient":
        pid = _patient_id_from_request(request, role, patient_id)
    rows = list_mpesa_transactions(patient_id=pid, limit=limit)
    return {"transactions": rows, "count": len(rows)}
