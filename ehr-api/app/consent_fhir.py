"""FHIR R5 Consent mapping for Phase 2 consent engine."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any


def consent_id(patient_id: str, facility_id: str, scope: str) -> str:
    return f"consent-{patient_id}-{facility_id}-{scope}".replace(" ", "-")


def row_to_fhir_consent(
    *,
    patient_id: str,
    facility_id: str,
    scope: str,
    active: bool,
    granted_at: datetime | None = None,
) -> dict[str, Any]:
    status = "active" if active else "inactive"
    return {
        "resourceType": "Consent",
        "id": consent_id(patient_id, facility_id, scope),
        "status": status,
        "scope": {
            "coding": [{"system": "http://terminology.hl7.org/CodeSystem/consentscope", "code": scope}],
        },
        "category": [{"coding": [{"code": "patientspecific"}]}],
        "patient": {"reference": f"Patient/{patient_id}"},
        "dateTime": (granted_at or datetime.now(timezone.utc)).isoformat(),
        "provision": {
            "type": "permit",
            "actor": [
                {
                    "role": {"text": "facility"},
                    "reference": {"identifier": {"system": "urn:unihealth:facility", "value": facility_id}},
                }
            ],
        },
        "meta": {"tag": [{"system": "urn:unihealth:consent-engine", "code": "phase2"}]},
    }


def parse_fhir_consent(resource: dict[str, Any]) -> tuple[str, str, str]:
    """Extract (patient_id, facility_id, scope) from a FHIR Consent resource."""
    if resource.get("resourceType") != "Consent":
        raise ValueError("resourceType must be Consent")

    patient_ref = resource.get("patient") or {}
    pref = patient_ref.get("reference") or patient_ref.get("id") or ""
    patient_id = pref.split("/")[-1] if pref else ""
    if not patient_id:
        raise ValueError("Consent.patient reference required")

    scope = "treatment"
    scope_obj = resource.get("scope") or {}
    codings = scope_obj.get("coding") or []
    if codings and codings[0].get("code"):
        scope = str(codings[0]["code"]).strip().lower()

    facility_id = ""
    provision = resource.get("provision") or {}
    for actor in provision.get("actor") or []:
        ident = (actor.get("reference") or {}).get("identifier") or {}
        if ident.get("value"):
            facility_id = str(ident["value"]).strip()
            break
    if not facility_id:
        meta = resource.get("meta") or {}
        for tag in meta.get("tag") or []:
            if tag.get("system") == "urn:unihealth:facility" and tag.get("code"):
                facility_id = str(tag["code"]).strip()
                break
    if not facility_id:
        raise ValueError("Consent.provision.actor facility identifier required")

    if resource.get("status") == "inactive":
        raise ValueError("Use revoke endpoint for inactive consent")

    return patient_id, facility_id, scope
