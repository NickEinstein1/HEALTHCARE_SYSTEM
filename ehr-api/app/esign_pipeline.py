"""E-sign document upload, AI review, and multi-step verification pipeline."""

from __future__ import annotations

import hashlib
import re
import time
from typing import Any

from app.legal_documents import LEGAL_DISCLAIMER, _now_iso, verify_document

AI_DISCLAIMER = (
    "AI document review assists clinicians — it does not replace legal or clinical judgment."
)

VERIFICATION_STEPS = (
    {"id": "integrity", "label": "Document integrity check"},
    {"id": "patient_match", "label": "Patient identity match"},
    {"id": "content_review", "label": "AI content review"},
    {"id": "signature_chain", "label": "Signature chain validation"},
    {"id": "final_attestation", "label": "Final attestation & code issuance"},
)


def _content_text(doc: dict) -> str:
    ctx = doc.get("context") or {}
    if isinstance(ctx, dict):
        for key in ("upload_text", "extracted_text", "preview_text"):
            val = ctx.get(key)
            if isinstance(val, str) and val.strip():
                return val.strip()
    body = doc.get("body")
    return str(body or "").strip()


def create_uploaded_document(
    *,
    patient_id: str,
    facility_id: str,
    created_by_role: str,
    created_by_subject: str,
    filename: str,
    mime_type: str,
    content_text: str,
    content_data_url: str | None = None,
) -> dict[str, Any]:
    doc_id = f"LDOC-{int(time.time() * 1000)}"
    fname = (filename or "document").strip()[:200]
    mime = (mime_type or "application/octet-stream").strip()[:120]
    text = (content_text or "").strip()
    digest = hashlib.sha256(text.encode("utf-8") if text else fname.encode("utf-8")).hexdigest()

    return {
        "id": doc_id,
        "patient_id": patient_id,
        "encounter_id": None,
        "facility_id": (facility_id or "FAC-A").strip(),
        "doc_type": "uploaded",
        "template_version": "1.0",
        "title": fname,
        "body": text or f"Uploaded file: {fname}",
        "summary": f"Clinician-uploaded document ({mime})",
        "required_signers": ["clinician", "patient"],
        "status": "pending_signatures",
        "context": {
            "upload_filename": fname,
            "upload_mime": mime,
            "upload_text": text,
            "upload_data_url": content_data_url,
            "upload_sha256": digest,
            "uploaded_at": _now_iso(),
        },
        "signatures": [],
        "verification_code": None,
        "created_by_role": created_by_role,
        "created_by_subject": created_by_subject,
        "created_at": _now_iso(),
        "completed_at": None,
        "expires_at": None,
        "voided_at": None,
    }


def analyze_document(doc: dict) -> dict[str, Any]:
    text = _content_text(doc)
    doc_type = str(doc.get("doc_type") or "")
    ctx = dict(doc.get("context") or {})
    findings: list[dict[str, str]] = []
    flags: list[dict[str, str]] = []
    score = 72

    if len(text) < 40:
        flags.append({"severity": "HIGH", "code": "SHORT_DOC", "detail": "Document text is very short — verify full content was captured."})
        score -= 15
    else:
        findings.append({"type": "info", "detail": f"Captured {len(text)} characters of document text."})
        score += 8

    lower = text.lower()
    consent_phrases = ("consent", "authorise", "authorize", "procedure", "treatment", "signature")
    if any(p in lower for p in consent_phrases):
        findings.append({"type": "positive", "detail": "Consent-related language detected."})
        score += 10
    elif doc_type in ("surgical_consent", "emergency_consent", "poa"):
        flags.append({"severity": "MEDIUM", "code": "MISSING_CONSENT_LANG", "detail": "Expected consent language not found in body text."})
        score -= 8

    if re.search(r"\b\d{6,}\b", text):
        findings.append({"type": "info", "detail": "Numeric identifiers detected — confirm patient/facility IDs."})

    if doc_type == "uploaded":
        fname = str(ctx.get("upload_filename") or "")
        if fname.lower().endswith(".pdf"):
            findings.append({"type": "info", "detail": "PDF upload — text extraction may be partial; review original file."})
        score += 5

    signatures = doc.get("signatures") or []
    required = set(doc.get("required_signers") or [])
    signed = {str(s.get("signer_role") or "") for s in signatures}
    missing = sorted(required - signed)
    if missing:
        flags.append({"severity": "MEDIUM", "code": "PENDING_SIGS", "detail": f"Pending signatures: {', '.join(missing)}"})
    else:
        findings.append({"type": "positive", "detail": "All required signer roles are present."})
        score += 12

    score = max(0, min(100, score))
    analysis = {
        "analysis_id": f"EAI-{int(time.time() * 1000)}",
        "document_id": doc.get("id"),
        "summary": (
            "Document appears suitable for signing workflow."
            if score >= 75
            else "Review recommended before signing — see flags below."
        ),
        "confidence_pct": score,
        "findings": findings,
        "flags": flags,
        "recommended_actions": [
            "Open the document and confirm patient identity.",
            "Resolve any HIGH severity flags before collecting signatures.",
            "Initiate formal verification after signing is complete.",
        ],
        "analyzed_at": _now_iso(),
        "disclaimer": AI_DISCLAIMER,
    }
    ctx["ai_analysis"] = analysis
    doc["context"] = ctx
    return analysis


def _step_result(step_id: str, doc: dict, analysis: dict | None) -> dict[str, Any]:
    ctx = doc.get("context") or {}
    if step_id == "integrity":
        digest = ctx.get("upload_sha256") or hashlib.sha256(_content_text(doc).encode("utf-8")).hexdigest()
        ok = bool(digest)
        return {"id": step_id, "status": "passed" if ok else "failed", "detail": f"SHA-256: {digest[:16]}…" if ok else "No content hash"}

    if step_id == "patient_match":
        pid = str(doc.get("patient_id") or "")
        ok = bool(re.match(r"^[A-Za-z0-9._-]{1,64}$", pid))
        return {"id": step_id, "status": "passed" if ok else "failed", "detail": f"Patient ID {pid} validated" if ok else "Invalid patient ID"}

    if step_id == "content_review":
        if not analysis:
            return {"id": step_id, "status": "skipped", "detail": "No AI analysis on file — run Analyze first"}
        high = [f for f in analysis.get("flags") or [] if str(f.get("severity")).upper() == "HIGH"]
        ok = len(high) == 0
        return {
            "id": step_id,
            "status": "passed" if ok else "warning",
            "detail": f"AI confidence {analysis.get('confidence_pct', 0)}% — {len(high)} high-severity flag(s)",
        }

    if step_id == "signature_chain":
        v = verify_document(doc)
        ok = v.get("hash_chain_valid") and doc.get("status") == "completed"
        return {
            "id": step_id,
            "status": "passed" if ok else ("warning" if v.get("hash_chain_valid") else "failed"),
            "detail": "Signature chain valid" if v.get("hash_chain_valid") else "Signature hashes invalid",
        }

    if step_id == "final_attestation":
        v = verify_document(doc)
        ok = bool(v.get("valid"))
        return {
            "id": step_id,
            "status": "passed" if ok else "pending",
            "detail": f"Verification code: {v.get('verification_code') or 'pending completion'}",
        }

    return {"id": step_id, "status": "skipped", "detail": "Unknown step"}


def initiate_verification_process(doc: dict) -> dict[str, Any]:
    ctx = dict(doc.get("context") or {})
    analysis = ctx.get("ai_analysis") if isinstance(ctx.get("ai_analysis"), dict) else None
    steps = [_step_result(s["id"], doc, analysis) for s in VERIFICATION_STEPS]
    passed = sum(1 for s in steps if s["status"] == "passed")
    warnings = sum(1 for s in steps if s["status"] == "warning")
    failed = sum(1 for s in steps if s["status"] == "failed")

    if failed:
        overall = "failed"
    elif warnings or any(s["status"] == "pending" for s in steps):
        overall = "incomplete"
    elif passed == len(steps):
        overall = "verified"
    else:
        overall = "in_progress"

    process = {
        "status": overall,
        "initiated_at": _now_iso(),
        "steps": steps,
        "passed_count": passed,
        "warning_count": warnings,
        "failed_count": failed,
        "verification": verify_document(doc),
        "disclaimer": LEGAL_DISCLAIMER,
    }
    ctx["verification_process"] = process
    doc["context"] = ctx
    return process


def document_view_payload(doc: dict) -> dict[str, Any]:
    ctx = doc.get("context") or {}
    return {
        "document_id": doc.get("id"),
        "title": doc.get("title"),
        "doc_type": doc.get("doc_type"),
        "filename": ctx.get("upload_filename"),
        "mime_type": ctx.get("upload_mime"),
        "text_content": _content_text(doc),
        "data_url": ctx.get("upload_data_url"),
        "body": doc.get("body"),
    }
