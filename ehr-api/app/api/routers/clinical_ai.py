"""
Clinical AI assessment API — multi-provider LLM with rules fallback.

Endpoints:
  GET  /ai/clinical-assessment/context/{patient_id}
  POST /ai/clinical-assessment
  GET  /ai/clinical-assessment/history
  GET  /ai/clinical-assessment/providers
"""

from __future__ import annotations

import time
from collections import defaultdict

from fastapi import APIRouter, Body, HTTPException, Query, Request

from app.ai.clinical_assessment import run_clinical_assessment
from app.ai.clinical_context import build_clinical_context, validate_patient_id
from app.ai.llm_client import _sanitize_clinical_text
from app.analytics import emit_ai_event
from app.auth import require_role
from app.config import settings
from app.store import (
    get_med_requests_from_cache,
    get_med_requests_from_db,
    get_observations_from_cache,
    get_observations_from_db,
    insert_ai_audit_entry,
    insert_clinical_ai_assessment,
    list_clinical_ai_assessments,
    set_med_requests_in_cache,
    set_observations_in_cache,
)

router = APIRouter(prefix="/ai/clinical-assessment", tags=["ai"])

_rate_buckets: dict[str, list[float]] = defaultdict(list)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _check_rate_limit(ip: str) -> None:
    limit = max(1, int(settings.clinical_ai_rate_limit_per_min or 20))
    window = 60.0
    now = time.time()
    bucket = _rate_buckets[ip]
    _rate_buckets[ip] = [t for t in bucket if now - t < window]
    if len(_rate_buckets[ip]) >= limit:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {limit} clinical AI requests per minute",
        )
    _rate_buckets[ip].append(now)


async def _load_observations(patient_id: str, limit: int = 80):
    cached = await get_observations_from_cache(patient_id)
    if cached is not None:
        return cached
    try:
        obs = await get_observations_from_db(patient_id, limit)
        await set_observations_in_cache(patient_id, obs)
        return obs
    except Exception:
        return []


async def _load_medications(patient_id: str, limit: int = 30):
    cached = await get_med_requests_from_cache(patient_id)
    if cached is not None:
        return cached
    try:
        meds = await get_med_requests_from_db(patient_id, limit)
        await set_med_requests_in_cache(patient_id, meds)
        return meds
    except Exception:
        return []


def _audit(event: str, role: str, patient_id: str | None, payload: dict, model_version: str) -> str:
    audit_id = f"AUD-{int(time.time() * 1000)}"
    entry = {
        "audit_id": audit_id,
        "event": event,
        "role": role,
        "patient_id": patient_id,
        "model_version": model_version,
        "payload": payload,
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "feedback": None,
    }
    try:
        import asyncio
        asyncio.create_task(insert_ai_audit_entry(dict(entry)))
    except Exception:
        pass
    return audit_id


@router.get("/providers", summary="Configured clinical AI providers (no secrets).")
async def clinical_ai_providers(request: Request):
    require_role(request, ["doctor", "nurse", "admin"])
    configured: list[str] = ["rules"]
    if (settings.openai_api_key or "").strip():
        configured.append("openai")
    if (settings.anthropic_api_key or "").strip():
        configured.append("anthropic")
    if (settings.azure_openai_api_key or "").strip() and (settings.azure_openai_endpoint or "").strip():
        configured.append("azure_openai")
    if (settings.google_api_key or "").strip():
        configured.append("google")
    return {
        "default_provider": (settings.clinical_ai_provider or "rules").strip().lower(),
        "configured_providers": configured,
        "disclaimer": "Clinical decision support only — not a definitive diagnosis.",
    }


@router.get("/context/{patient_id}", summary="Preview aggregated triage + symptom context.")
async def clinical_ai_context(
    request: Request,
    patient_id: str,
    scenario_assessment: str = Query(default=""),
    sickness_notes: str = Query(default=""),
):
    _check_rate_limit(_client_ip(request))
    require_role(request, ["doctor", "nurse", "admin"])
    try:
        pid = validate_patient_id(patient_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid patient_id")

    observations = await _load_observations(pid)
    medications = await _load_medications(pid)
    context = await build_clinical_context(
        patient_id=pid,
        observations=observations,
        medications=medications,
        scenario_assessment=_sanitize_clinical_text(scenario_assessment),
        sickness_notes=_sanitize_clinical_text(sickness_notes),
    )
    return {
        "patient_id": pid,
        "context": context,
        "disclaimer": "Preview only — run POST /ai/clinical-assessment for AI synthesis.",
    }


@router.post("", summary="Run clinical AI assessment (LLM or rules fallback).")
async def clinical_ai_assess(request: Request, payload: dict = Body(...)):
    _check_rate_limit(_client_ip(request))
    role = require_role(request, ["doctor", "nurse"])

    patient_id = str(payload.get("patient_id") or "").strip()
    try:
        pid = validate_patient_id(patient_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid patient_id")

    scenario = _sanitize_clinical_text(str(payload.get("scenario_assessment") or ""))
    sickness = _sanitize_clinical_text(str(payload.get("sickness_notes") or ""))
    incident_ids = payload.get("incident_ids")
    if incident_ids is not None and not isinstance(incident_ids, list):
        raise HTTPException(status_code=400, detail="incident_ids must be an array")
    incident_list = [str(x).strip() for x in (incident_ids or []) if str(x).strip()][:20]

    provider_override = str(payload.get("provider") or "").strip().lower() or None
    allowed = {"rules", "openai", "anthropic", "azure_openai", "azure", "google", "gemini"}
    if provider_override and provider_override not in allowed:
        raise HTTPException(status_code=400, detail="Unsupported provider")

    if not scenario and not sickness:
        observations = await _load_observations(pid)
        medications = await _load_medications(pid)
        ctx = await build_clinical_context(
            patient_id=pid,
            observations=observations,
            medications=medications,
        )
        has_data = bool(
            ctx.get("triage")
            or ctx.get("symptom_observations")
            or ctx.get("incidents")
            or ctx.get("clinical_features")
        )
        if not has_data:
            raise HTTPException(
                status_code=400,
                detail="Provide scenario_assessment or sickness_notes, or ensure triage/symptom data exists",
            )

    observations = await _load_observations(pid)
    medications = await _load_medications(pid)

    result = await run_clinical_assessment(
        patient_id=pid,
        observations=observations,
        medications=medications,
        scenario_assessment=scenario,
        sickness_notes=sickness,
        incident_ids=incident_list or None,
        provider_override=provider_override,
    )

    audit_id = _audit(
        "clinical_assessment",
        role,
        pid,
        {
            "provider": result.get("provider"),
            "n_differentials": len(result.get("differential_diagnoses") or []),
            "llm_error": result.get("llm_error"),
        },
        str(result.get("model_version") or ""),
    )
    result["audit_id"] = audit_id

    await insert_clinical_ai_assessment({
        "assessment_id": result["assessment_id"],
        "patient_id": pid,
        "role": role,
        "provider": result.get("provider"),
        "model_version": result.get("model_version"),
        "request": {
            "scenario_assessment_len": len(scenario),
            "sickness_notes_len": len(sickness),
            "incident_ids": incident_list,
            "requested_provider": provider_override or settings.clinical_ai_provider,
        },
        "response": {
            "summary": result.get("summary"),
            "differential_count": len(result.get("differential_diagnoses") or []),
            "red_flag_count": len(result.get("red_flags") or []),
        },
        "audit_id": audit_id,
        "created_at": result.get("generated_at"),
    })

    try:
        emit_ai_event(
            "clinical_assessment",
            role=role,
            patient_id=pid,
            dimensions={"provider": result.get("provider")},
        )
    except Exception:
        pass

    return result


@router.get("/history", summary="Recent clinical AI assessments for a patient.")
async def clinical_ai_history(
    request: Request,
    patient_id: str = Query(...),
    limit: int = Query(default=10, ge=1, le=50),
):
    _check_rate_limit(_client_ip(request))
    require_role(request, ["doctor", "nurse", "admin"])
    try:
        pid = validate_patient_id(patient_id)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid patient_id")
    rows = await list_clinical_ai_assessments(pid, limit=limit)
    return {"patient_id": pid, "assessments": rows}
