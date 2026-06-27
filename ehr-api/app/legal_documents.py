"""
Legal document e-signing — templates, state machine, verification.

Covers power of attorney, surgical consent, and emergency treatment consent.
"""

from __future__ import annotations

import hashlib
import json
import re
import time
from typing import Any

DOC_TYPES = frozenset({"poa", "surgical_consent", "emergency_consent", "uploaded"})
DOC_STATUSES = frozenset({"draft", "pending_signatures", "completed", "voided", "expired"})
SIGNER_ROLES = frozenset({"patient", "surrogate", "clinician", "witness"})

_PATIENT_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")

LEGAL_DISCLAIMER = (
    "Electronic signatures captured in UniHealth are legally attested records. "
    "Clinicians must verify identity before accepting surrogate or emergency signatures."
)

TEMPLATES: dict[str, dict[str, Any]] = {
    "poa": {
        "doc_type": "poa",
        "version": "1.0",
        "title": "Medical Power of Attorney",
        "summary": "Authorises a named agent to make healthcare decisions on your behalf.",
        "required_signers": ["patient", "witness"],
        "body": (
            "I hereby appoint the individual named below as my healthcare agent with authority "
            "to make medical decisions on my behalf when I am unable to communicate my wishes. "
            "This includes consent to treatment, access to records, and coordination with clinicians."
        ),
    },
    "surgical_consent": {
        "doc_type": "surgical_consent",
        "version": "1.0",
        "title": "Surgical Procedure Consent",
        "summary": "Informed consent for a planned surgical or invasive procedure.",
        "required_signers": ["patient", "clinician"],
        "body": (
            "I confirm that the nature, benefits, risks, alternatives, and expected recovery of the "
            "planned procedure have been explained. I consent to anaesthesia and the procedure as documented."
        ),
    },
    "emergency_consent": {
        "doc_type": "emergency_consent",
        "version": "1.0",
        "title": "Emergency Treatment Consent",
        "summary": "Consent under emergency grounds when immediate treatment is required.",
        "required_signers": ["clinician", "witness"],
        "body": (
            "Emergency treatment is required. The patient is unable to provide consent or a delay would "
            "pose serious risk. Treatment is authorised under emergency clinical grounds with documentation "
            "of incapacity and surrogate relationship where applicable."
        ),
    },
    "uploaded": {
        "doc_type": "uploaded",
        "version": "1.0",
        "title": "Uploaded Clinical Document",
        "summary": "Clinician-uploaded file for review, AI analysis, and e-signature.",
        "required_signers": ["clinician", "patient"],
        "body": "Uploaded document pending AI review and signature collection.",
    },
}


def validate_patient_id(patient_id: str) -> str:
    pid = (patient_id or "").strip()
    if not pid or not _PATIENT_ID_RE.match(pid):
        raise ValueError("Invalid patient_id")
    return pid


def validate_doc_type(doc_type: str) -> str:
    dt = (doc_type or "").strip().lower()
    if dt not in DOC_TYPES:
        raise ValueError(f"Unsupported doc_type: {doc_type}")
    return dt


def list_templates() -> list[dict[str, Any]]:
    return [dict(v) for v in TEMPLATES.values()]


def _now_iso() -> str:
    return time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())


def _signature_hash(document_id: str, signer_role: str, signer_name: str, method: str, ts: str) -> str:
    payload = f"{document_id}|{signer_role}|{signer_name}|{method}|{ts}"
    return hashlib.sha256(payload.encode("utf-8")).hexdigest()


def _verification_code(document_id: str, signatures: list[dict]) -> str:
    chain = "|".join(sorted(s.get("signature_hash", "") for s in signatures))
    return hashlib.sha256(f"{document_id}:{chain}".encode("utf-8")).hexdigest()[:16].upper()


def create_document(
    *,
    patient_id: str,
    doc_type: str,
    facility_id: str,
    created_by_role: str,
    created_by_subject: str,
    context: dict | None = None,
    encounter_id: str | None = None,
) -> dict[str, Any]:
    pid = validate_patient_id(patient_id)
    dt = validate_doc_type(doc_type)
    template = TEMPLATES[dt]
    doc_id = f"LDOC-{int(time.time() * 1000)}"
    ctx = dict(context or {})
    expires_at = None
    if dt == "emergency_consent":
        expires_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime(time.time() + 72 * 3600))

    return {
        "id": doc_id,
        "patient_id": pid,
        "encounter_id": (encounter_id or "").strip() or None,
        "facility_id": (facility_id or "FAC-A").strip(),
        "doc_type": dt,
        "template_version": template["version"],
        "title": template["title"],
        "body": template["body"],
        "summary": template["summary"],
        "required_signers": list(template["required_signers"]),
        "status": "pending_signatures",
        "context": ctx,
        "signatures": [],
        "verification_code": None,
        "created_by_role": created_by_role,
        "created_by_subject": created_by_subject,
        "created_at": _now_iso(),
        "completed_at": None,
        "expires_at": expires_at,
        "voided_at": None,
    }


def _signed_roles(signatures: list[dict]) -> set[str]:
    return {str(s.get("signer_role") or "") for s in signatures}


def add_signature(
    document: dict,
    *,
    signer_role: str,
    signer_name: str,
    signer_subject: str,
    signature_method: str,
    attestation: str,
    witness_for: str | None = None,
) -> dict[str, Any]:
    role = (signer_role or "").strip().lower()
    if role not in SIGNER_ROLES:
        raise ValueError("Invalid signer_role")
    name = (signer_name or "").strip()
    if len(name) < 2 or len(name) > 120:
        raise ValueError("signer_name must be 2–120 characters")
    if not (attestation or "").strip():
        raise ValueError("attestation required")

    status = str(document.get("status") or "")
    if status in ("completed", "voided", "expired"):
        raise ValueError(f"Document is {status}")

    if role in _signed_roles(document.get("signatures") or []):
        raise ValueError(f"Role {role} has already signed")

    ts = _now_iso()
    method = (signature_method or "typed").strip().lower()[:32]
    sig_hash = _signature_hash(str(document["id"]), role, name, method, ts)
    sig = {
        "id": f"LSIG-{int(time.time() * 1000)}",
        "signer_role": role,
        "signer_name": name,
        "signer_subject": (signer_subject or "")[:128],
        "signature_method": method,
        "attestation": (attestation or "").strip()[:500],
        "witness_for": witness_for,
        "signed_at": ts,
        "signature_hash": sig_hash,
    }
    signatures = list(document.get("signatures") or [])
    signatures.append(sig)
    document["signatures"] = signatures

    required = set(document.get("required_signers") or [])
    if required.issubset(_signed_roles(signatures)):
        document["status"] = "completed"
        document["completed_at"] = ts
        document["verification_code"] = _verification_code(str(document["id"]), signatures)
    else:
        document["status"] = "pending_signatures"

    return sig


def verify_document(document: dict) -> dict[str, Any]:
    signatures = list(document.get("signatures") or [])
    valid_chain = True
    verified_sigs: list[dict] = []
    for s in signatures:
        expected = _signature_hash(
            str(document["id"]),
            str(s.get("signer_role") or ""),
            str(s.get("signer_name") or ""),
            str(s.get("signature_method") or ""),
            str(s.get("signed_at") or ""),
        )
        ok = expected == s.get("signature_hash")
        valid_chain = valid_chain and ok
        verified_sigs.append({**s, "hash_valid": ok})

    code = document.get("verification_code")
    expected_code = _verification_code(str(document["id"]), signatures) if signatures else None
    code_valid = bool(code and expected_code and code == expected_code)

    return {
        "document_id": document.get("id"),
        "status": document.get("status"),
        "valid": valid_chain and document.get("status") == "completed" and code_valid,
        "hash_chain_valid": valid_chain,
        "verification_code": code,
        "verification_code_valid": code_valid,
        "signatures": verified_sigs,
        "required_signers": document.get("required_signers") or [],
        "signed_roles": sorted(_signed_roles(signatures)),
        "disclaimer": LEGAL_DISCLAIMER,
    }


def void_document(document: dict, *, reason: str) -> dict[str, Any]:
    if document.get("status") == "completed":
        raise ValueError("Cannot void a completed document")
    document["status"] = "voided"
    document["voided_at"] = _now_iso()
    document["void_reason"] = (reason or "").strip()[:300]
    return document


def document_audit_payload(document: dict, event: str) -> dict:
    return {
        "event": event,
        "document_id": document.get("id"),
        "patient_id": document.get("patient_id"),
        "doc_type": document.get("doc_type"),
        "status": document.get("status"),
        "signature_count": len(document.get("signatures") or []),
    }
