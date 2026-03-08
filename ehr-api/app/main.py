"""
UniHealth EHR Phase 1 - Edge FHIR gateway.

Target: P95 < 50 ms for GET /fhir/r5/Patient/{id}/summary
Strategy: Redis (hot) first; on miss, PostgreSQL (warm) then backfill cache.
Pilot EMRs POST Patient/Encounter to Kafka via ingestion API.
"""

from fastapi import FastAPI, HTTPException, Query, Header
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.ingestion import send_encounter, send_medication_request, send_observation, send_patient
from app.models import MedicationRequest, Observation, PatientSummary
from app.store import (
    get_summary_from_cache,
    get_summary_from_db,
    get_med_requests_from_cache,
    get_med_requests_from_db,
    get_observations_from_cache,
    get_observations_from_db,
    set_summary_in_cache,
    set_med_requests_in_cache,
    set_observations_in_cache,
    grant_consent,
    has_active_consent,
    revoke_consent,
)

app = FastAPI(
    title="UniHealth EHR Edge Gateway",
    description="Phase 1: Patient + recent encounters with <50ms P95",
    version="0.1.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get(
    "/fhir/r5/Patient/{patient_id}/summary",
    response_model=PatientSummary,
    summary="Patient + recent encounters (edge-first, <50ms target)",
)
async def patient_summary(
    patient_id: str,
    encounters: int = Query(
        default=5,
        ge=1,
        le=20,
        description="Number of recent encounters to return",
    ),
    x_facility_id: str | None = Header(default=None, alias="X-Facility-Id"),
    scope: str = Query(default="treatment", description="Consent scope: treatment|emergency"),
):
    facility_id = x_facility_id
    # Phase 1: simple consent enforcement. Emergency bypass is allowed but can be audited later.
    if scope != "emergency" and facility_id:
        allowed = await has_active_consent(patient_id, facility_id, scope)
        if not allowed and settings.consent_mode.lower() == "strict":
            raise HTTPException(status_code=403, detail="Consent denied")

    # 1. Try Redis (hot path)
    summary = await get_summary_from_cache(patient_id)
    if summary is not None:
        # Trim encounters to requested count if cache had more
        if len(summary.encounters) > encounters:
            summary = PatientSummary(
                patient=summary.patient,
                encounters=summary.encounters[:encounters],
            )
        return summary

    # 2. Fallback: PostgreSQL (warm)
    summary = await get_summary_from_db(patient_id, encounters)
    if summary is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    # 3. Backfill cache for next time
    await set_summary_in_cache(patient_id, summary)

    return summary


# ----- Consent (Phase 1) -----


@app.post(
    "/consent/grant",
    status_code=200,
    summary="Grant consent for (patient, facility, scope).",
)
async def consent_grant(body: dict):
    patient_id = body.get("patient_id")
    facility_id = body.get("facility_id")
    scope = body.get("scope", "treatment")
    if not patient_id or not facility_id:
        raise HTTPException(status_code=400, detail="patient_id and facility_id are required")
    await grant_consent(patient_id=patient_id, facility_id=facility_id, scope=scope)
    return {"status": "granted", "patient_id": patient_id, "facility_id": facility_id, "scope": scope}


@app.post(
    "/consent/revoke",
    status_code=200,
    summary="Revoke consent for (patient, facility, scope).",
)
async def consent_revoke(body: dict):
    patient_id = body.get("patient_id")
    facility_id = body.get("facility_id")
    scope = body.get("scope", "treatment")
    if not patient_id or not facility_id:
        raise HTTPException(status_code=400, detail="patient_id and facility_id are required")
    changed = await revoke_consent(patient_id=patient_id, facility_id=facility_id, scope=scope)
    return {
        "status": "revoked",
        "patient_id": patient_id,
        "facility_id": facility_id,
        "scope": scope,
        "rows_changed": changed,
    }


# ----- Pilot EMR ingestion (POST → Kafka) -----


@app.post(
    "/fhir/r5/Patient",
    status_code=202,
    summary="Ingest patient (pilot EMR). Publishes to Kafka; consumer updates Postgres/Redis.",
)
async def ingest_patient(body: dict):
    """Accept FHIR-style Patient JSON. Required: id. Optional: nhi_number, family_name, given_name, birth_date, gender."""
    try:
        send_patient(body)
        return {"status": "accepted", "resourceType": "Patient", "id": body.get("id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ingestion failed: {e}")


@app.post(
    "/fhir/r5/Encounter",
    status_code=202,
    summary="Ingest encounter (pilot EMR). Publishes to Kafka; consumer updates Postgres/Redis.",
)
async def ingest_encounter(body: dict):
    """Accept FHIR-style Encounter JSON. Required: id, patient_id (or subject.reference). Optional: facility_id, facility_name, status, class_code, period."""
    try:
        send_encounter(body)
        return {"status": "accepted", "resourceType": "Encounter", "id": body.get("id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ingestion failed: {e}")


@app.post(
    "/fhir/r5/Observation",
    status_code=202,
    summary="Ingest observation (pilot EMR/device). Publishes to Kafka; consumer updates Postgres/Redis.",
)
async def ingest_observation(body: dict):
    try:
        send_observation(body)
        return {"status": "accepted", "resourceType": "Observation", "id": body.get("id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ingestion failed: {e}")


@app.post(
    "/fhir/r5/MedicationRequest",
    status_code=202,
    summary="Ingest MedicationRequest (pilot EMR). Publishes to Kafka; consumer updates Postgres/Redis.",
)
async def ingest_medication_request(body: dict):
    try:
        send_medication_request(body)
        return {"status": "accepted", "resourceType": "MedicationRequest", "id": body.get("id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ingestion failed: {e}")


@app.get(
    "/fhir/r5/Patient/{patient_id}/observations",
    response_model=list[Observation],
    summary="Get patient observations (edge cache + warm store).",
)
async def patient_observations(
    patient_id: str,
    limit: int = Query(default=20, ge=1, le=200),
    x_facility_id: str | None = Header(default=None, alias="X-Facility-Id"),
    scope: str = Query(default="treatment", description="Consent scope: treatment|emergency"),
):
    facility_id = x_facility_id
    if scope != "emergency" and facility_id:
        allowed = await has_active_consent(patient_id, facility_id, scope)
        if not allowed and settings.consent_mode.lower() == "strict":
            raise HTTPException(status_code=403, detail="Consent denied")

    cached = await get_observations_from_cache(patient_id)
    if cached is not None:
        return cached[:limit]

    obs = await get_observations_from_db(patient_id, limit)
    await set_observations_in_cache(patient_id, obs)
    return obs


@app.get(
    "/fhir/r5/Patient/{patient_id}/medication-requests",
    response_model=list[MedicationRequest],
    summary="Get patient medication requests (edge cache + warm store).",
)
async def patient_med_requests(
    patient_id: str,
    limit: int = Query(default=20, ge=1, le=200),
    x_facility_id: str | None = Header(default=None, alias="X-Facility-Id"),
    scope: str = Query(default="treatment", description="Consent scope: treatment|emergency"),
):
    facility_id = x_facility_id
    if scope != "emergency" and facility_id:
        allowed = await has_active_consent(patient_id, facility_id, scope)
        if not allowed and settings.consent_mode.lower() == "strict":
            raise HTTPException(status_code=403, detail="Consent denied")

    cached = await get_med_requests_from_cache(patient_id)
    if cached is not None:
        return cached[:limit]

    meds = await get_med_requests_from_db(patient_id, limit)
    await set_med_requests_in_cache(patient_id, meds)
    return meds
