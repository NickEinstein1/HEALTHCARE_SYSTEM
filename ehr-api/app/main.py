"""
UniHealth EHR Phase 1 - Edge FHIR gateway.

Target: P95 < 50 ms for GET /fhir/r5/Patient/{id}/summary
Strategy: Redis (hot) first; on miss, PostgreSQL (warm) then backfill cache.
Pilot EMRs POST Patient/Encounter to Kafka via ingestion API.
"""

import asyncpg
import time
from collections import defaultdict

from fastapi import Body, FastAPI, HTTPException, Header, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import PlainTextResponse

from app.config import settings
from app.ingestion import send_encounter, send_medication_request, send_observation, send_patient
from app.models import MedicationRequest, Observation, PatientSummary
from app.store import (
    close_postgres_pool,
    close_redis_client,
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
    init_postgres_pool,
    init_redis_client,
    patient_exists,
    revoke_consent,
)

app = FastAPI(
    title="UniHealth EHR Edge Gateway",
    description="Phase 1: Patient + recent encounters with <50ms P95",
    version="0.1.0",
)

# Lightweight in-memory metrics for Phase 1 validation.
_metrics_counts = defaultdict(int)
_metrics_latency_sum_ms = defaultdict(float)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def on_startup() -> None:
    await init_postgres_pool()
    await init_redis_client()


@app.on_event("shutdown")
async def on_shutdown() -> None:
    await close_redis_client()
    await close_postgres_pool()


@app.middleware("http")
async def metrics_middleware(request: Request, call_next):
    start = time.perf_counter()
    path = request.url.path
    method = request.method
    try:
        response = await call_next(request)
        status = response.status_code
    except Exception:
        status = 500
        _metrics_counts[(method, path, status)] += 1
        raise
    finally:
        elapsed_ms = (time.perf_counter() - start) * 1000.0
        _metrics_latency_sum_ms[(method, path)] += elapsed_ms
        _metrics_counts[(method, path, "requests")] += 1
    response.headers["X-Request-Latency-Ms"] = f"{elapsed_ms:.2f}"
    _metrics_counts[(method, path, status)] += 1
    return response


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.get("/metrics/json", summary="Simple in-memory metrics (Phase 1)")
async def metrics_json():
    rows = []
    for key, req_count in _metrics_counts.items():
        if len(key) == 3 and key[2] == "requests":
            method, path, _ = key
            total_ms = _metrics_latency_sum_ms[(method, path)]
            avg_ms = (total_ms / req_count) if req_count else 0.0
            status_counts = {
                str(k[2]): v
                for k, v in _metrics_counts.items()
                if len(k) == 3 and k[0] == method and k[1] == path and k[2] != "requests"
            }
            rows.append(
                {
                    "method": method,
                    "path": path,
                    "requests": req_count,
                    "avg_latency_ms": round(avg_ms, 2),
                    "status_counts": status_counts,
                }
            )
    return {"routes": sorted(rows, key=lambda r: (r["path"], r["method"]))}


@app.get("/metrics/prometheus", response_class=PlainTextResponse, summary="Prometheus-style metrics")
async def metrics_prometheus():
    lines = []
    for key, req_count in _metrics_counts.items():
        if len(key) == 3 and key[2] == "requests":
            method, path, _ = key
            safe_path = path.replace('"', '\\"')
            lines.append(
                f'unihealth_http_requests_total{{method="{method}",path="{safe_path}"}} {req_count}'
            )
            total_ms = _metrics_latency_sum_ms[(method, path)]
            lines.append(
                f'unihealth_http_latency_ms_sum{{method="{method}",path="{safe_path}"}} {total_ms:.2f}'
            )
    for key, cnt in _metrics_counts.items():
        if len(key) == 3 and key[2] != "requests":
            method, path, status = key
            safe_path = path.replace('"', '\\"')
            lines.append(
                f'unihealth_http_status_total{{method="{method}",path="{safe_path}",status="{status}"}} {cnt}'
            )
    return "\n".join(lines) + "\n"


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
    response: Response = None,
):
    start = time.perf_counter()
    facility_id = x_facility_id
    strict_consent = settings.consent_mode.lower() == "strict"
    # Phase 1: simple consent enforcement. Emergency bypass is allowed but can be audited later.
    if strict_consent and scope != "emergency" and facility_id:
        allowed = await has_active_consent(patient_id, facility_id, scope)
        if not allowed:
            raise HTTPException(status_code=403, detail="Consent denied")

    # 1. Try Redis (hot path)
    summary = await get_summary_from_cache(patient_id)
    if summary is not None:
        if response is not None:
            response.headers["X-Cache-Source"] = "redis-hit"
            response.headers["X-Endpoint-Latency-Ms"] = f"{((time.perf_counter() - start) * 1000.0):.2f}"
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
    if response is not None:
        response.headers["X-Cache-Source"] = "postgres-miss"
        response.headers["X-Endpoint-Latency-Ms"] = f"{((time.perf_counter() - start) * 1000.0):.2f}"

    return summary


# ----- Consent (Phase 1) -----


@app.post(
    "/consent/grant",
    status_code=200,
    summary="Grant consent for (patient, facility, scope).",
)
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
        raise HTTPException(
            status_code=404,
            detail="Patient not in database (foreign key). Seed or ingest patient first.",
        )
    except asyncpg.PostgresError as e:
        raise HTTPException(status_code=400, detail=f"Database error: {e}")
    return {"status": "granted", "patient_id": patient_id, "facility_id": facility_id, "scope": scope}


@app.post(
    "/consent/revoke",
    status_code=200,
    summary="Revoke consent for (patient, facility, scope).",
)
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


# ----- Pilot EMR ingestion (POST → Kafka) -----


@app.post(
    "/fhir/r5/Patient",
    status_code=202,
    summary="Ingest patient (pilot EMR). Publishes to Kafka; consumer updates Postgres/Redis.",
)
async def ingest_patient(payload: dict = Body(...)):
    """Accept FHIR-style Patient JSON. Required: id. Optional: nhi_number, family_name, given_name, birth_date, gender."""
    try:
        send_patient(payload)
        return {"status": "accepted", "resourceType": "Patient", "id": payload.get("id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ingestion failed: {e}")


@app.post(
    "/fhir/r5/Encounter",
    status_code=202,
    summary="Ingest encounter (pilot EMR). Publishes to Kafka; consumer updates Postgres/Redis.",
)
async def ingest_encounter(payload: dict = Body(...)):
    """Accept FHIR-style Encounter JSON. Required: id, patient_id (or subject.reference). Optional: facility_id, facility_name, status, class_code, period."""
    try:
        send_encounter(payload)
        return {"status": "accepted", "resourceType": "Encounter", "id": payload.get("id")}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Ingestion failed: {e}")


@app.post(
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


@app.post(
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
