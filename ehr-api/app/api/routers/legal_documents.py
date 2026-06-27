"""
Legal document e-signing API.

Endpoints:
  GET  /esign/templates
  GET  /esign/documents
  POST /esign/documents
  GET  /esign/documents/{id}
  POST /esign/documents/{id}/sign
  POST /esign/documents/{id}/void
  POST /esign/documents/{id}/verify/initiate
  GET  /esign/documents/{id}/verify/process
  GET  /esign/documents/{id}/view
  POST /esign/documents/upload
  POST /esign/documents/{id}/analyze
"""

from __future__ import annotations

import json
import time
from typing import Any

from fastapi import APIRouter, Body, HTTPException, Query, Request

import app.state as st
from app.auth import require_role
from app.esign_pipeline import (
    analyze_document,
    create_uploaded_document,
    document_view_payload,
    initiate_verification_process,
)
from app.legal_documents import (
    LEGAL_DISCLAIMER,
    add_signature,
    create_document,
    document_audit_payload,
    list_templates,
    validate_doc_type,
    validate_patient_id,
    verify_document,
    void_document,
)
from app.store import (
    get_legal_document,
    insert_legal_document,
    insert_legal_document_audit,
    list_legal_documents,
    update_legal_document,
)

router = APIRouter(prefix="/esign", tags=["esign-documents"])


def _audit(document_id: str, event: str, role: str, subject: str, payload: dict) -> None:
    entry = {
        "audit_id": f"LDAUD-{int(time.time() * 1000)}",
        "document_id": document_id,
        "event": event,
        "role": role,
        "subject": subject,
        "payload": payload,
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
    st.legal_document_audit.insert(0, entry)
    if len(st.legal_document_audit) > 500:
        st.legal_document_audit[:] = st.legal_document_audit[:500]
    try:
        import asyncio
        asyncio.create_task(insert_legal_document_audit(entry))
    except Exception:
        pass


def _subject_from_request(request: Request, role: str) -> str:
    return (request.headers.get("X-UniHealth-Subject") or role).strip()[:128]


def _ensure_patient_access(role: str, actor_patient_id: str | None, document_patient_id: str) -> None:
    if role == "patient" and actor_patient_id and actor_patient_id != document_patient_id:
        raise HTTPException(status_code=403, detail="Patients may only access their own documents")


@router.get("/templates", summary="List legal document templates.")
async def legal_templates(request: Request):
    require_role(request, ["doctor", "nurse", "admin", "patient"])
    return {"templates": list_templates(), "disclaimer": LEGAL_DISCLAIMER}


@router.get("/documents", summary="List legal documents.")
async def legal_documents_list(
    request: Request,
    patient_id: str | None = Query(default=None),
    doc_type: str | None = Query(default=None),
    status: str | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
):
    role = require_role(request, ["doctor", "nurse", "admin", "patient"])
    pid = None
    if patient_id:
        try:
            pid = validate_patient_id(patient_id)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid patient_id")
    if role == "patient":
        header_pid = request.headers.get("X-Patient-Id", "").strip()
        if header_pid:
            pid = validate_patient_id(header_pid)
        if not pid:
            raise HTTPException(status_code=400, detail="patient_id required for patient role")

    dt = None
    if doc_type:
        try:
            dt = validate_doc_type(doc_type)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid doc_type")

    rows = await list_legal_documents(
        patient_id=pid,
        doc_type=dt,
        status=(status or "").strip() or None,
        limit=limit,
    )
    return {"documents": rows, "count": len(rows)}


@router.post("/documents", summary="Create a legal signing envelope.")
async def legal_document_create(request: Request, payload: dict = Body(...)):
    role = require_role(request, ["doctor", "nurse", "admin", "patient"])
    patient_id = str(payload.get("patient_id") or "").strip()
    try:
        pid = validate_patient_id(patient_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid patient_id")

    if role == "patient":
        header_pid = request.headers.get("X-Patient-Id", "").strip()
        if header_pid and header_pid != pid:
            raise HTTPException(status_code=403, detail="Patients may only create documents for themselves")

    try:
        doc_type = validate_doc_type(str(payload.get("doc_type") or ""))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    if role == "patient" and doc_type != "poa":
        raise HTTPException(status_code=403, detail="Patients may only initiate Power of Attorney documents")

    context = payload.get("context")
    if context is not None and not isinstance(context, dict):
        raise HTTPException(status_code=400, detail="context must be an object")

    doc = create_document(
        patient_id=pid,
        doc_type=doc_type,
        facility_id=str(payload.get("facility_id") or "FAC-A"),
        created_by_role=role,
        created_by_subject=_subject_from_request(request, role),
        context=context,
        encounter_id=str(payload.get("encounter_id") or "").strip() or None,
    )
    await insert_legal_document(doc)
    _audit(doc["id"], "created", role, _subject_from_request(request, role), document_audit_payload(doc, "created"))
    return {"status": "created", "document": doc, "disclaimer": LEGAL_DISCLAIMER}


@router.get("/documents/{document_id}", summary="Get one legal document.")
async def legal_document_get(request: Request, document_id: str):
    role = require_role(request, ["doctor", "nurse", "admin", "patient"])
    doc = await get_legal_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    header_pid = request.headers.get("X-Patient-Id", "").strip() or None
    _ensure_patient_access(role, header_pid, str(doc.get("patient_id") or ""))
    return {"document": doc}


@router.post("/documents/{document_id}/sign", summary="Capture an electronic signature.")
async def legal_document_sign(request: Request, document_id: str, payload: dict = Body(...)):
    role = require_role(request, ["doctor", "nurse", "admin", "patient"])
    doc = await get_legal_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    header_pid = request.headers.get("X-Patient-Id", "").strip() or None
    _ensure_patient_access(role, header_pid, str(doc.get("patient_id") or ""))

    signer_role = str(payload.get("signer_role") or role).strip().lower()
    if role == "patient" and signer_role not in ("patient", "surrogate"):
        raise HTTPException(status_code=403, detail="Patients may only sign as patient or surrogate")
    if role in ("doctor", "nurse") and signer_role not in ("clinician", "witness"):
        if signer_role in ("patient", "surrogate"):
            pass  # staff may witness patient signing session
        elif signer_role != "clinician":
            signer_role = "clinician"

    try:
        sig = add_signature(
            doc,
            signer_role=signer_role,
            signer_name=str(payload.get("signer_name") or ""),
            signer_subject=_subject_from_request(request, role),
            signature_method=str(payload.get("signature_method") or "typed"),
            attestation=str(payload.get("attestation") or ""),
            witness_for=str(payload.get("witness_for") or "").strip() or None,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    await update_legal_document(doc)
    _audit(document_id, "signed", role, _subject_from_request(request, role), {
        **document_audit_payload(doc, "signed"),
        "signer_role": signer_role,
    })

    if doc.get("status") == "completed" and doc.get("doc_type") == "emergency_consent":
        try:
            from app.store import grant_consent
            await grant_consent(str(doc["patient_id"]), str(doc.get("facility_id") or "FAC-A"), "emergency")
        except Exception:
            pass

    return {
        "status": "signed",
        "signature": sig,
        "document": doc,
        "verification": verify_document(doc) if doc.get("status") == "completed" else None,
    }


@router.post("/documents/{document_id}/void", summary="Void an incomplete document.")
async def legal_document_void(request: Request, document_id: str, payload: dict = Body(default={})):
    role = require_role(request, ["doctor", "nurse", "admin"])
    doc = await get_legal_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    try:
        void_document(doc, reason=str(payload.get("reason") or ""))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    await update_legal_document(doc)
    _audit(document_id, "voided", role, _subject_from_request(request, role), document_audit_payload(doc, "voided"))
    return {"status": "voided", "document": doc}


@router.get("/documents/{document_id}/verify", summary="Verify signature chain and completion.")
async def legal_document_verify(request: Request, document_id: str):
    require_role(request, ["doctor", "nurse", "admin", "patient"])
    doc = await get_legal_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return verify_document(doc)


@router.post("/documents/upload", summary="Upload a document for AI review and e-signing.")
async def legal_document_upload(request: Request, payload: dict = Body(...)):
    role = require_role(request, ["doctor", "nurse", "admin", "patient"])
    try:
        pid = validate_patient_id(str(payload.get("patient_id") or ""))
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid patient_id")

    if role == "patient":
        header_pid = request.headers.get("X-Patient-Id", "").strip()
        if header_pid and header_pid != pid:
            raise HTTPException(status_code=403, detail="Patients may only upload for themselves")

    filename = str(payload.get("filename") or "document.txt").strip()
    mime_type = str(payload.get("mime_type") or "text/plain").strip()
    content_text = str(payload.get("content_text") or "").strip()
    content_data_url = str(payload.get("content_data_url") or "").strip() or None
    if not content_text and not content_data_url:
        raise HTTPException(status_code=400, detail="content_text or content_data_url required")

    doc = create_uploaded_document(
        patient_id=pid,
        facility_id=str(payload.get("facility_id") or "FAC-A"),
        created_by_role=role,
        created_by_subject=_subject_from_request(request, role),
        filename=filename,
        mime_type=mime_type,
        content_text=content_text,
        content_data_url=content_data_url,
    )
    await insert_legal_document(doc)
    _audit(doc["id"], "uploaded", role, _subject_from_request(request, role), document_audit_payload(doc, "uploaded"))
    return {"status": "uploaded", "document": doc, "disclaimer": LEGAL_DISCLAIMER}


@router.post("/documents/{document_id}/analyze", summary="Run AI analysis on document content.")
async def legal_document_analyze(request: Request, document_id: str):
    role = require_role(request, ["doctor", "nurse", "admin", "patient"])
    doc = await get_legal_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    header_pid = request.headers.get("X-Patient-Id", "").strip() or None
    _ensure_patient_access(role, header_pid, str(doc.get("patient_id") or ""))
    analysis = analyze_document(doc)
    await update_legal_document(doc)
    _audit(document_id, "analyzed", role, _subject_from_request(request, role), {"analysis_id": analysis.get("analysis_id")})
    return {"status": "analyzed", "analysis": analysis, "document": doc}


@router.get("/documents/{document_id}/view", summary="View document content for in-app preview.")
async def legal_document_view(request: Request, document_id: str):
    role = require_role(request, ["doctor", "nurse", "admin", "patient"])
    doc = await get_legal_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    header_pid = request.headers.get("X-Patient-Id", "").strip() or None
    _ensure_patient_access(role, header_pid, str(doc.get("patient_id") or ""))
    return document_view_payload(doc)


@router.post("/documents/{document_id}/verify/initiate", summary="Initiate multi-step verification process.")
async def legal_document_verify_initiate(request: Request, document_id: str):
    role = require_role(request, ["doctor", "nurse", "admin"])
    doc = await get_legal_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    process = initiate_verification_process(doc)
    await update_legal_document(doc)
    _audit(document_id, "verify_initiated", role, _subject_from_request(request, role), {
        "process_status": process.get("status"),
    })
    return {"status": "initiated", "process": process, "document": doc}


@router.get("/documents/{document_id}/verify/process", summary="Get verification process state.")
async def legal_document_verify_process(request: Request, document_id: str):
    require_role(request, ["doctor", "nurse", "admin", "patient"])
    doc = await get_legal_document(document_id)
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    ctx = doc.get("context") or {}
    process = ctx.get("verification_process")
    if not process:
        return {"status": "not_started", "process": None}
    return {"status": "ok", "process": process}
