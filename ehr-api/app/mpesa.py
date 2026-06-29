"""
Safaricom M-Pesa integration (Daraja).

Pilot mode simulates STK Push and C2B callbacks when ``EHR_MPESA_SIMULATE`` is true
(default). Set ``EHR_MPESA_SIMULATE=false`` and supply Daraja credentials for live traffic.
"""

from __future__ import annotations

import hashlib
import secrets
import time
from typing import Any

from app.config import settings

PAYBILL = "400100"
ACCOUNT_REF = "UniHealth Health"
CURRENCY = "KES"


def normalize_phone(phone: str) -> str:
    digits = "".join(c for c in (phone or "") if c.isdigit())
    if digits.startswith("254") and len(digits) == 12:
        return digits
    if digits.startswith("0") and len(digits) == 10:
        return "254" + digits[1:]
    if len(digits) == 9:
        return "254" + digits
    return digits


def mpesa_ref() -> str:
    return secrets.token_hex(4).upper()[:10]


def stk_checkout_id() -> str:
    return f"ws_CO_{int(time.time())}{secrets.token_hex(3)}"


def merchant_request_id() -> str:
    return f"mr_{secrets.token_hex(8)}"


def simulate_stk_result(amount_kes: float, phone: str) -> dict[str, Any]:
    ref = mpesa_ref()
    return {
        "ResultCode": 0,
        "ResultDesc": "The service request is processed successfully.",
        "CheckoutRequestID": stk_checkout_id(),
        "MerchantRequestID": merchant_request_id(),
        "MpesaReceiptNumber": ref,
        "Amount": amount_kes,
        "PhoneNumber": normalize_phone(phone),
        "TransactionDate": time.strftime("%Y%m%d%H%M%S", time.gmtime()),
    }


def parse_c2b_payload(payload: dict[str, Any]) -> dict[str, Any]:
    """Normalize Safaricom C2B validation/confirmation body."""
    amount_raw = payload.get("TransAmount") or payload.get("amount") or payload.get("amount_kes") or 0
    try:
        amount = float(amount_raw)
    except (TypeError, ValueError):
        amount = 0.0
    return {
        "transaction_type": str(payload.get("TransactionType") or payload.get("transaction_type") or "Pay Bill"),
        "trans_id": str(payload.get("TransID") or payload.get("trans_id") or mpesa_ref()),
        "trans_time": str(payload.get("TransTime") or payload.get("trans_time") or ""),
        "amount_kes": amount,
        "business_short_code": str(payload.get("BusinessShortCode") or payload.get("paybill") or PAYBILL),
        "bill_ref_number": str(payload.get("BillRefNumber") or payload.get("account_ref") or ACCOUNT_REF),
        "msisdn": normalize_phone(str(payload.get("MSISDN") or payload.get("phone") or "")),
        "first_name": str(payload.get("FirstName") or payload.get("first_name") or ""),
        "middle_name": str(payload.get("MiddleName") or payload.get("middle_name") or ""),
        "last_name": str(payload.get("LastName") or payload.get("last_name") or ""),
        "raw": payload,
    }


def c2b_signature_valid(payload: dict[str, Any], signature: str | None) -> bool:
    if settings.mpesa_simulate:
        return True
    secret = (settings.mpesa_c2b_passkey or "").strip()
    if not secret or not signature:
        return False
    trans_id = str(payload.get("TransID") or payload.get("trans_id") or "")
    expected = hashlib.sha256(f"{trans_id}{secret}".encode()).hexdigest()
    return secrets.compare_digest(expected, signature.strip())
