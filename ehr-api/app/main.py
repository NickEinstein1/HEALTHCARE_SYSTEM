"""
UniHealth EHR Phase 1 - Edge FHIR gateway.

Target: P95 < 50 ms for GET /fhir/r5/Patient/{id}/summary
Strategy: Redis (hot) first; on miss, PostgreSQL (warm) then backfill cache.
"""

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.models import PatientSummary
from app.store import get_summary_from_cache, get_summary_from_db, set_summary_in_cache

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
):
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
