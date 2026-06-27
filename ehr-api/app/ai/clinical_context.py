"""
Aggregate clinical context for AI assessment from triage, observations, and incidents.
"""

from __future__ import annotations

import re
from typing import Any

from app.ai.patient_fhir import (
    clinical_features_from_fhir,
    medication_names_from_requests,
    observations_to_vitals_and_labs,
)
from app.models import MedicationRequest, Observation
from app.state import nurse_incidents, patient_aliases, walkin_visits

_PATIENT_ID_RE = re.compile(r"^[A-Za-z0-9._-]{1,64}$")

_SYMPTOM_CODES = frozenset({
    "chief-complaint", "chief_complaint", "symptoms", "symptom",
    "pain", "notes", "nurse-notes", "nurse_notes", "triage-notes",
    "history", "presenting-complaint", "hpi", "assessment", "progress-note",
})


def validate_patient_id(patient_id: str) -> str:
    pid = (patient_id or "").strip()
    if not pid or not _PATIENT_ID_RE.match(pid):
        raise ValueError("Invalid patient_id")
    return pid


def resolve_patient_identifiers(patient_id: str) -> set[str]:
    """FHIR id, UHID, MRN aliases used to correlate triage and incidents."""
    pid = validate_patient_id(patient_id)
    ids = {pid, pid.upper(), pid.lower()}
    for alias in patient_aliases:
        mrn = str(alias.get("mrn") or "").strip()
        uhid = str(alias.get("uhid") or "").strip()
        if pid in (mrn, uhid) or pid.upper() in (mrn.upper(), uhid.upper()):
            if mrn:
                ids.add(mrn)
            if uhid:
                ids.add(uhid)
    return {x for x in ids if x}


def _observation_text(obs: Observation) -> str | None:
    code = (obs.code or "").strip().lower()
    text = (obs.value_text or "").strip()
    if text:
        return f"{code or 'observation'}: {text}"
    return None


def _is_symptom_or_note_code(code: str) -> bool:
    c = (code or "").strip().lower()
    if not c:
        return False
    if c in _SYMPTOM_CODES:
        return True
    return any(token in c for token in ("complaint", "symptom", "note", "pain", "triage"))


async def build_clinical_context(
    *,
    patient_id: str,
    observations: list[Observation],
    medications: list[MedicationRequest],
    scenario_assessment: str = "",
    sickness_notes: str = "",
    incident_ids: list[str] | None = None,
) -> dict[str, Any]:
    ids = resolve_patient_identifiers(patient_id)

    vitals, labs = observations_to_vitals_and_labs(observations, apply_defaults=False)
    features, _ = clinical_features_from_fhir(observations, medications)
    med_names = medication_names_from_requests(medications)

    triage_rows: list[dict[str, Any]] = []
    for visit in walkin_visits:
        uhid = str(visit.get("uhid") or "")
        if uhid and uhid in ids:
            triage_rows.append({
                "walkin_id": visit.get("id"),
                "chief_complaint": visit.get("chief_complaint") or visit.get("complaint"),
                "triage_level": visit.get("triage_level"),
                "facility_id": visit.get("facility_id"),
                "registered_at": visit.get("created_at"),
            })

    symptom_notes: list[str] = []
    for obs in observations:
        code = (obs.code or "").strip()
        line = _observation_text(obs)
        if line and _is_symptom_or_note_code(code):
            symptom_notes.append(line)

    incidents: list[dict[str, Any]] = []
    wanted_incidents = {str(x).strip() for x in (incident_ids or []) if str(x).strip()}
    for inc in nurse_incidents:
        inc_pid = str(inc.get("patient_id") or "").strip()
        inc_id = str(inc.get("id") or "").strip()
        if wanted_incidents and inc_id not in wanted_incidents:
            continue
        if not wanted_incidents and inc_pid and inc_pid not in ids:
            continue
        if wanted_incidents or inc_pid in ids:
            incidents.append({
                "id": inc_id,
                "type": inc.get("type"),
                "severity": inc.get("severity"),
                "status": inc.get("status"),
                "notes": inc.get("notes"),
            })

    return {
        "patient_id": patient_id,
        "identifiers_matched": sorted(ids),
        "triage": triage_rows,
        "symptom_observations": symptom_notes,
        "vitals": vitals,
        "labs": labs,
        "clinical_features": features,
        "medications": med_names,
        "incidents": incidents,
        "doctor_scenario_assessment": (scenario_assessment or "").strip(),
        "doctor_sickness_notes": (sickness_notes or "").strip(),
    }


def context_to_prompt(context: dict[str, Any]) -> str:
    """Serialize context for LLM — clinical data only, no executable instructions."""
    lines = [
        "Clinical data bundle for differential diagnosis support.",
        f"Patient identifier: {context.get('patient_id')}",
    ]
    if context.get("doctor_scenario_assessment"):
        lines.append(f"Doctor scenario assessment: {context['doctor_scenario_assessment']}")
    if context.get("doctor_sickness_notes"):
        lines.append(f"Doctor sickness / condition notes: {context['doctor_sickness_notes']}")

    triage = context.get("triage") or []
    if triage:
        lines.append("Nurse triage / walk-in chief complaints:")
        for row in triage:
            lines.append(
                f"- level {row.get('triage_level')}: {row.get('chief_complaint') or 'not recorded'}"
            )

    symptoms = context.get("symptom_observations") or []
    if symptoms:
        lines.append("Documented symptoms and nursing notes:")
        for s in symptoms[:40]:
            lines.append(f"- {s}")

    vitals = context.get("vitals") or {}
    if vitals:
        lines.append("Vitals: " + ", ".join(f"{k}={v}" for k, v in sorted(vitals.items())))

    labs = context.get("labs") or {}
    if labs:
        lines.append("Labs: " + ", ".join(f"{k}={v}" for k, v in sorted(labs.items())))

    meds = context.get("medications") or []
    if meds:
        lines.append("Medications: " + ", ".join(meds[:30]))

    incidents = context.get("incidents") or []
    if incidents:
        lines.append("Incident reports:")
        for inc in incidents[:20]:
            lines.append(
                f"- [{inc.get('severity')}] {inc.get('type')}: {inc.get('notes') or 'no notes'}"
            )

    return "\n".join(lines)
