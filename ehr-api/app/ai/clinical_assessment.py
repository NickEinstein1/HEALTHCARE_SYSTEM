"""
Clinical AI assessment orchestration — LLM providers with rules-based fallback.
"""

from __future__ import annotations

import time
from typing import Any

from app.ai.clinical_context import build_clinical_context, context_to_prompt
from app.ai.llm_client import LlmClientError, complete_clinical_json, _sanitize_clinical_text
from app.ai.models import MODEL_VERSION as RULES_MODEL_VERSION, diagnosis_hints
from app.config import settings
from app.models import MedicationRequest, Observation

CLINICAL_AI_DISCLAIMER = (
    "AI-generated clinical decision support only. Not a diagnosis. "
    "Licensed clinician must verify all findings before treatment decisions."
)

RULES_FALLBACK_VERSION = f"rules-fallback+{RULES_MODEL_VERSION}"


def _clamp_confidence(value: Any) -> int:
    try:
        n = int(float(value))
    except (TypeError, ValueError):
        return 50
    return max(0, min(100, n))


def _normalize_llm_result(raw: dict[str, Any]) -> dict[str, Any]:
    diffs_in = raw.get("differential_diagnoses") or raw.get("differentials") or []
    differentials: list[dict[str, Any]] = []
    if isinstance(diffs_in, list):
        for item in diffs_in[:12]:
            if not isinstance(item, dict):
                continue
            name = str(item.get("name") or item.get("diagnosis") or "").strip()
            if not name:
                continue
            differentials.append({
                "name": name,
                "icd10": str(item.get("icd10") or item.get("icd_10") or "").strip() or "—",
                "confidence": _clamp_confidence(item.get("confidence")),
                "rationale": str(item.get("rationale") or item.get("reason") or "").strip()[:500],
            })

    red_flags = raw.get("red_flags") or []
    if not isinstance(red_flags, list):
        red_flags = []
    workup = raw.get("recommended_workup") or raw.get("workup") or []
    if not isinstance(workup, list):
        workup = []

    return {
        "summary": str(raw.get("summary") or "").strip()[:4000],
        "symptom_synthesis": str(raw.get("symptom_synthesis") or "").strip()[:2000],
        "differential_diagnoses": differentials,
        "red_flags": [str(x).strip()[:300] for x in red_flags if str(x).strip()][:20],
        "recommended_workup": [str(x).strip()[:300] for x in workup if str(x).strip()][:20],
    }


def _rules_fallback(context: dict[str, Any]) -> dict[str, Any]:
    features = dict(context.get("clinical_features") or {})
    meds = list(context.get("medications") or [])
    rules = diagnosis_hints(features, meds)

    triage_bits = [
        str(t.get("chief_complaint") or "").strip()
        for t in (context.get("triage") or [])
        if str(t.get("chief_complaint") or "").strip()
    ]
    symptom_bits = list(context.get("symptom_observations") or [])[:8]
    scenario = context.get("doctor_scenario_assessment") or ""
    sickness = context.get("doctor_sickness_notes") or ""

    synthesis_parts = [*triage_bits, *symptom_bits]
    if scenario:
        synthesis_parts.append(scenario)
    if sickness:
        synthesis_parts.append(sickness)

    summary = (
        "Rules-based synthesis of available triage complaints, documented symptoms, vitals, and labs. "
        + ("; ".join(synthesis_parts[:6]) if synthesis_parts else "Limited symptom narrative available.")
    )

    differentials = [
        {
            "name": d["diagnosis"],
            "icd10": d.get("icd10") or "—",
            "confidence": int(d.get("confidence") or 0),
            "rationale": d.get("rationale") or "",
        }
        for d in (rules.get("differentials") or [])
    ]

    red_flags: list[str] = []
    vitals = context.get("vitals") or {}
    if float(vitals.get("spo2", 100)) <= 92:
        red_flags.append("SpO₂ ≤92% — assess airway and oxygenation urgently.")
    if float(vitals.get("sbp", 120)) <= 90:
        red_flags.append("Systolic BP ≤90 — evaluate for shock.")
    if float(vitals.get("hr", 70)) >= 130:
        red_flags.append("Heart rate ≥130 — evaluate haemodynamic instability.")

    workup: list[str] = []
    if not differentials:
        workup.append("Expand history and repeat focused examination.")
        workup.append("Order targeted labs/imaging based on presenting complaint.")
    else:
        workup.append("Confirm top differentials with targeted labs and imaging.")
        workup.append("Reconcile with nurse triage findings and incident reports.")

    return {
        "summary": summary[:4000],
        "symptom_synthesis": "; ".join(synthesis_parts)[:2000],
        "differential_diagnoses": differentials,
        "red_flags": red_flags,
        "recommended_workup": workup,
        "drug_interactions": rules.get("drug_interactions") or [],
    }


async def run_clinical_assessment(
    *,
    patient_id: str,
    observations: list[Observation],
    medications: list[MedicationRequest],
    scenario_assessment: str = "",
    sickness_notes: str = "",
    incident_ids: list[str] | None = None,
    provider_override: str | None = None,
) -> dict[str, Any]:
    scenario = _sanitize_clinical_text(scenario_assessment)
    sickness = _sanitize_clinical_text(sickness_notes)

    context = await build_clinical_context(
        patient_id=patient_id,
        observations=observations,
        medications=medications,
        scenario_assessment=scenario,
        sickness_notes=sickness,
        incident_ids=incident_ids,
    )

    provider = (provider_override or settings.clinical_ai_provider or "rules").strip().lower()
    prompt = context_to_prompt(context)

    used_provider = "rules"
    model_version = RULES_FALLBACK_VERSION
    llm_error: str | None = None
    assessment: dict[str, Any]

    if provider != "rules":
        try:
            raw, used_provider, model_version = await complete_clinical_json(
                provider=provider,
                user_prompt=prompt,
            )
            assessment = _normalize_llm_result(raw)
            rules_merge = _rules_fallback(context)
            if not assessment["differential_diagnoses"]:
                assessment["differential_diagnoses"] = rules_merge["differential_diagnoses"]
            if not assessment["red_flags"]:
                assessment["red_flags"] = rules_merge["red_flags"]
            assessment["drug_interactions"] = rules_merge.get("drug_interactions") or []
        except LlmClientError as exc:
            llm_error = str(exc)
            assessment = _rules_fallback(context)
            used_provider = "rules"
            model_version = RULES_FALLBACK_VERSION
    else:
        assessment = _rules_fallback(context)

    return {
        "assessment_id": f"CAI-{int(time.time() * 1000)}",
        "patient_id": patient_id,
        "provider": used_provider,
        "model_version": model_version,
        "requested_provider": provider,
        "llm_error": llm_error,
        "context_snapshot": {
            "triage_count": len(context.get("triage") or []),
            "symptom_note_count": len(context.get("symptom_observations") or []),
            "incident_count": len(context.get("incidents") or []),
            "has_scenario": bool(scenario),
            "has_sickness_notes": bool(sickness),
            "identifiers_matched": context.get("identifiers_matched") or [],
        },
        "summary": assessment.get("summary") or "",
        "symptom_synthesis": assessment.get("symptom_synthesis") or "",
        "differential_diagnoses": assessment.get("differential_diagnoses") or [],
        "red_flags": assessment.get("red_flags") or [],
        "recommended_workup": assessment.get("recommended_workup") or [],
        "drug_interactions": assessment.get("drug_interactions") or [],
        "disclaimer": CLINICAL_AI_DISCLAIMER,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }
