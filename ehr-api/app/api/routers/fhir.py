import asyncpg
import time

from fastapi import APIRouter, Body, HTTPException, Header, Query, Response

from app.config import settings
from app.ingestion import send_encounter, send_medication_request, send_observation, send_patient
from app.models import MedicationRequest, Observation, PatientSummary
from app.store import (
    get_med_requests_from_cache,
    get_med_requests_from_db,
    get_observations_from_cache,
    get_observations_from_db,
    get_summary_from_cache,
    get_summary_from_db,
    grant_consent,
    has_active_consent,
    patient_exists,
    revoke_consent,
    set_med_requests_in_cache,
    set_observations_in_cache,
    set_summary_in_cache,
)

router = APIRouter()


@router.get(
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
    response: Response = None,
):
    start = time.perf_counter()
    facility_id = x_facility_id
    strict_consent = settings.consent_mode.lower() == "strict"
    if strict_consent and scope != "emergency" and facility_id:
        allowed = await has_active_consent(patient_id, facility_id, scope)
        if not allowed:
            raise HTTPException(status_code=403, detail="Consent denied")

    summary = await get_summary_from_cache(patient_id)
    if summary is not None:
        if response is not None:
            response.headers["X-Cache-Source"] = "redis-hit"
            response.headers["X-Endpoint-Latency-Ms"] = f"{((time.perf_counter() - start) * 1000.0):.2f}"
        if len(summary.encounters) > encounters:
            summary = PatientSummary(patient=summary.patient, encounters=summary.encounters[:encounters])
        return summary

    summary = await get_summary_from_db(patient_id, encounters)
    if summary is None:
        raise HTTPException(status_code=404, detail="Patient not found")

    await set_summary_in_cache(patient_id, summary)
    if response is not None:
        response.headers["X-Cache-Source"] = "postgres-miss"
        response.headers["X-Endpoint-Latency-Ms"] = f"{((time.perf_counter() - start) * 1000.0):.2f}"

    return summary


@router.post("/consent/grant", status_code=200, summary="Grant consent for (patient, facility, scope).")
async def consent_grant(payload: dict = Body(...)):
    patient_id = payload.get("patient_id")
    facility_id = payload.get("facility_id")
    scope = payload.get("scope", "treatment")
    if not patient_id or not facility_id:
        raise HTTPException(status_code=400, detail="patient_id and facility_id are required")
    if not await patient_exists(patient_id):
        raise HTTPException(
            status_code=404,
            detail=(
                "Patient not in database. Create P001 first: run edge consumer + "
                "scripts/produce_sample_events.py, or: source ehr-api/.venv/bin/activate && "
                "python scripts/seed_data.py"
            ),
        )
    try:
        await grant_consent(patient_id=patient_id, facility_id=facility_id, scope=scope)
    except asyncpg.UndefinedTableError:
        raise HTTPException(
            status_code=503,
            detail="Table 'consents' missing. Apply schema: PGPASSWORD=ehr_dev_password psql -U ehr -d ehr -h localhost -f ehr-api/schema.sql",
        )
    except asyncpg.ForeignKeyViolationError:
        raise HTTPException(status_code=404, detail="Patient not in database (foreign key). Seed or ingest patient first.")
    except asyncpg.PostgresError as e:
        raise HTTPException(status_code=400, detail=f"Database error: {e}")
    return {"status": "granted", "patient_id": patient_id, "facility_id": facility_id, "scope": scope}


@router.post("/consent/revoke", status_code=200, summary="Revoke consent for (patient, facility, scope).")
async def consent_revoke(payload: dict = Body(...)):
    patient_id = payload.get("patient_id")
    facility_id = payload.get("facility_id")
    scope = payload.get("scope", "treatment")
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


@router.post(
    "/fhir/r5/Patient",
    status_code=202,
    summary="Ingest patient (pilot EMR). Publishes to Kafka; consumer updates Postgres/Redis.",
)
async def ingest_patient(payload: dict = Body(...)):
    try:
        send_patient(payload)
        return {"status": "accepted", "resourceType": "Patient", "id": payload.get("id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ingestion failed: {e}")


@router.post(
    "/fhir/r5/Encounter",
    status_code=202,
    summary="Ingest encounter (pilot EMR). Publishes to Kafka; consumer updates Postgres/Redis.",
)
async def ingest_encounter(payload: dict = Body(...)):
    try:
        send_encounter(payload)
        return {"status": "accepted", "resourceType": "Encounter", "id": payload.get("id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ingestion failed: {e}")


@router.post(
    "/fhir/r5/Observation",
    status_code=202,
    summary="Ingest observation (pilot EMR/device). Publishes to Kafka; consumer updates Postgres/Redis.",
)
async def ingest_observation(payload: dict = Body(...)):
    try:
        send_observation(payload)
        return {"status": "accepted", "resourceType": "Observation", "id": payload.get("id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ingestion failed: {e}")


@router.post(
    "/fhir/r5/MedicationRequest",
    status_code=202,
    summary="Ingest MedicationRequest (pilot EMR). Publishes to Kafka; consumer updates Postgres/Redis.",
)
async def ingest_medication_request(payload: dict = Body(...)):
    try:
        send_medication_request(payload)
        return {"status": "accepted", "resourceType": "MedicationRequest", "id": payload.get("id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ingestion failed: {e}")


@router.get(
    "/fhir/r5/Patient/{patient_id}/observations",
    response_model=list[Observation],
    summary="Get patient observations (edge cache + warm store).",
)
async def patient_observations(
    patient_id: str,
    limit: int = Query(default=20, ge=1, le=200),
    x_facility_id: str | None = Header(default=None, alias="X-Facility-Id"),
    scope: str = Query(default="treatment", description="Consent scope: treatment|emergency"),
    response: Response = None,
):
    facility_id = x_facility_id
    strict_consent = settings.consent_mode.lower() == "strict"
    if strict_consent and scope != "emergency" and facility_id:
        allowed = await has_active_consent(patient_id, facility_id, scope)
        if not allowed:
            raise HTTPException(status_code=403, detail="Consent denied")

    cached = await get_observations_from_cache(patient_id)
    if cached is not None:
        if response is not None:
            response.headers["X-Cache-Source"] = "redis-hit"
        return cached[:limit]

    obs = await get_observations_from_db(patient_id, limit)
    await set_observations_in_cache(patient_id, obs)
    if response is not None:
        response.headers["X-Cache-Source"] = "postgres-miss"
    return obs


@router.get(
    "/fhir/r5/Patient/{patient_id}/medication-requests",
    response_model=list[MedicationRequest],
    summary="Get patient medication requests (edge cache + warm store).",
)
async def patient_med_requests(
    patient_id: str,
    limit: int = Query(default=20, ge=1, le=200),
    x_facility_id: str | None = Header(default=None, alias="X-Facility-Id"),
    scope: str = Query(default="treatment", description="Consent scope: treatment|emergency"),
    response: Response = None,
):
    facility_id = x_facility_id
    strict_consent = settings.consent_mode.lower() == "strict"
    if strict_consent and scope != "emergency" and facility_id:
        allowed = await has_active_consent(patient_id, facility_id, scope)
        if not allowed:
            raise HTTPException(status_code=403, detail="Consent denied")

    cached = await get_med_requests_from_cache(patient_id)
    if cached is not None:
        if response is not None:
            response.headers["X-Cache-Source"] = "redis-hit"
        return cached[:limit]

    meds = await get_med_requests_from_db(patient_id, limit)
    await set_med_requests_in_cache(patient_id, meds)
    if response is not None:
        response.headers["X-Cache-Source"] = "postgres-miss"
    return meds

