"""Data access: Redis (hot) and PostgreSQL (warm)."""

import json
from typing import Optional

import asyncpg
import redis.asyncio as redis
from app.config import settings
from app.models import (
    AllergyIntolerance,
    Encounter,
    MedicationRequest,
    Observation,
    Patient,
    PatientSummary,
)

_pg_pool: asyncpg.Pool | None = None
_redis_client: redis.Redis | None = None


async def init_postgres_pool() -> None:
    """Initialize shared asyncpg connection pool once per process."""
    global _pg_pool
    if _pg_pool is None:
        _pg_pool = await asyncpg.create_pool(
            dsn=settings.postgres_dsn,
            min_size=2,
            max_size=20,
        )


async def close_postgres_pool() -> None:
    """Close pool during app shutdown."""
    global _pg_pool
    if _pg_pool is not None:
        await _pg_pool.close()
        _pg_pool = None


def _require_pool() -> asyncpg.Pool:
    if _pg_pool is None:
        raise RuntimeError("Postgres pool not initialized")
    return _pg_pool


async def init_redis_client() -> None:
    """Initialize shared Redis client once per process."""
    global _redis_client
    if _redis_client is None:
        _redis_client = redis.from_url(settings.redis_url, decode_responses=True)


async def close_redis_client() -> None:
    """Close Redis client during app shutdown."""
    global _redis_client
    if _redis_client is not None:
        await _redis_client.aclose()
        _redis_client = None


def _require_redis_client() -> redis.Redis:
    if _redis_client is None:
        raise RuntimeError("Redis client not initialized")
    return _redis_client


def _summary_to_json(s: PatientSummary) -> str:
    return s.model_dump_json()


def _json_to_summary(raw: str) -> PatientSummary:
    return PatientSummary.model_validate_json(raw)


async def get_summary_from_cache(patient_id: str) -> Optional[PatientSummary]:
    """Return cached patient summary if present. Sub-ms typically."""
    client = _require_redis_client()
    key = f"patient:{patient_id}:summary"
    raw = await client.get(key)
    if raw is None:
        return None
    try:
        return _json_to_summary(raw)
    except Exception:
        await client.delete(key)
        return None


async def set_summary_in_cache(patient_id: str, summary: PatientSummary) -> None:
    client = _require_redis_client()
    key = f"patient:{patient_id}:summary"
    await client.set(key, _summary_to_json(summary), ex=settings.cache_ttl_seconds)


async def get_summary_from_db(patient_id: str, encounters_limit: int) -> Optional[PatientSummary]:
    """Load patient + last N encounters from PostgreSQL."""
    pool = _require_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT id, nhi_number, family_name, given_name, birth_date, gender
            FROM patients WHERE id = $1
            """,
            patient_id,
        )
        if row is None:
            return None

        patient = Patient(
            id=str(row["id"]),
            nhi_number=str(row["nhi_number"]),
            family_name=str(row["family_name"]) if row["family_name"] else None,
            given_name=str(row["given_name"]) if row["given_name"] else None,
            birth_date=row["birth_date"],
            gender=str(row["gender"]) if row["gender"] else None,
        )

        rows = await conn.fetch(
            """
            SELECT id, patient_id, facility_id, facility_name, status, class_code, period_start, period_end
            FROM encounters
            WHERE patient_id = $1
            ORDER BY period_start DESC NULLS LAST, created_at DESC
            LIMIT $2
            """,
            patient_id,
            encounters_limit,
        )
        encounters = [
            Encounter(
                id=str(r["id"]),
                patient_id=str(r["patient_id"]),
                facility_id=str(r["facility_id"]),
                facility_name=str(r["facility_name"]) if r["facility_name"] else None,
                status=str(r["status"]),
                class_code=str(r["class_code"]) if r["class_code"] else None,
                period_start=r["period_start"],
                period_end=r["period_end"],
            )
            for r in rows
        ]

        return PatientSummary(patient=patient, encounters=encounters)


async def get_observations_from_cache(patient_id: str) -> Optional[list[Observation]]:
    client = _require_redis_client()
    key = f"patient:{patient_id}:observations"
    raw = await client.get(key)
    if raw is None:
        return None
    try:
        data = json.loads(raw)
        return [Observation.model_validate(item) for item in data]
    except Exception:
        await client.delete(key)
        return None


async def set_observations_in_cache(patient_id: str, observations: list[Observation]) -> None:
    client = _require_redis_client()
    key = f"patient:{patient_id}:observations"
    await client.set(
        key,
        json.dumps([o.model_dump(mode="json") for o in observations]),
        ex=settings.cache_ttl_seconds,
    )


async def get_observations_from_db(patient_id: str, limit: int) -> list[Observation]:
    pool = _require_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, patient_id, code, effective_time, value_text, unit
            FROM observations
            WHERE patient_id = $1
            ORDER BY effective_time DESC NULLS LAST, created_at DESC
            LIMIT $2
            """,
            patient_id,
            limit,
        )
        return [
            Observation(
                id=str(r["id"]),
                patient_id=str(r["patient_id"]),
                code=str(r["code"]) if r["code"] else None,
                effective_time=r["effective_time"],
                value_text=str(r["value_text"]) if r["value_text"] else None,
                unit=str(r["unit"]) if r["unit"] else None,
            )
            for r in rows
        ]


async def get_med_requests_from_cache(patient_id: str) -> Optional[list[MedicationRequest]]:
    client = _require_redis_client()
    key = f"patient:{patient_id}:med_requests"
    raw = await client.get(key)
    if raw is None:
        return None
    try:
        data = json.loads(raw)
        return [MedicationRequest.model_validate(item) for item in data]
    except Exception:
        await client.delete(key)
        return None


async def set_med_requests_in_cache(patient_id: str, meds: list[MedicationRequest]) -> None:
    client = _require_redis_client()
    key = f"patient:{patient_id}:med_requests"
    await client.set(
        key,
        json.dumps([m.model_dump(mode="json") for m in meds]),
        ex=settings.cache_ttl_seconds,
    )


async def get_med_requests_from_db(patient_id: str, limit: int) -> list[MedicationRequest]:
    pool = _require_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, patient_id, medication_code, status, authored_on, dosage_text
            FROM medication_requests
            WHERE patient_id = $1
            ORDER BY authored_on DESC NULLS LAST, created_at DESC
            LIMIT $2
            """,
            patient_id,
            limit,
        )
        return [
            MedicationRequest(
                id=str(r["id"]),
                patient_id=str(r["patient_id"]),
                medication_code=str(r["medication_code"]) if r["medication_code"] else None,
                status=str(r["status"]) if r["status"] else None,
                authored_on=r["authored_on"],
                dosage_text=str(r["dosage_text"]) if r["dosage_text"] else None,
            )
            for r in rows
        ]


async def get_allergies_from_cache(patient_id: str) -> Optional[list[AllergyIntolerance]]:
    client = _require_redis_client()
    key = f"patient:{patient_id}:allergies"
    raw = await client.get(key)
    if raw is None:
        return None
    data = json.loads(raw)
    return [AllergyIntolerance.model_validate(item) for item in data]


async def set_allergies_in_cache(patient_id: str, rows: list[AllergyIntolerance]) -> None:
    client = _require_redis_client()
    key = f"patient:{patient_id}:allergies"
    await client.set(
        key,
        json.dumps([a.model_dump(mode="json") for a in rows]),
        ex=settings.cache_ttl_seconds,
    )


async def get_allergies_from_db(patient_id: str, limit: int) -> list[AllergyIntolerance]:
    pool = _require_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT id, patient_id, code, substance_text, clinical_status, criticality, recorded_date
            FROM allergy_intolerances
            WHERE patient_id = $1
            ORDER BY recorded_date DESC NULLS LAST, created_at DESC
            LIMIT $2
            """,
            patient_id,
            limit,
        )
        return [
            AllergyIntolerance(
                id=str(r["id"]),
                patient_id=str(r["patient_id"]),
                code=str(r["code"]) if r["code"] else None,
                substance_text=str(r["substance_text"]) if r["substance_text"] else None,
                clinical_status=str(r["clinical_status"]) if r["clinical_status"] else None,
                criticality=str(r["criticality"]) if r["criticality"] else None,
                recorded_date=r["recorded_date"],
            )
            for r in rows
        ]


async def patient_exists(patient_id: str) -> bool:
    """Return True if a row exists in patients (required before consents FK insert)."""
    pool = _require_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow("SELECT 1 FROM patients WHERE id = $1", patient_id)
        return row is not None


async def has_active_consent(patient_id: str, facility_id: str, scope: str) -> bool:
    """Return True if an active consent exists for patient/facility/scope."""
    pool = _require_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT 1
            FROM consents
            WHERE patient_id = $1
              AND facility_id = $2
              AND scope = $3
              AND active = TRUE
            LIMIT 1
            """,
            patient_id,
            facility_id,
            scope,
        )
        return row is not None


async def grant_consent(patient_id: str, facility_id: str, scope: str) -> None:
    """Grant (activate) consent; creates a row and deactivates older rows for same key."""
    pool = _require_pool()
    async with pool.acquire() as conn:
        async with conn.transaction():
            await conn.execute(
                """
                UPDATE consents
                SET active = FALSE, revoked_at = NOW()
                WHERE patient_id = $1 AND facility_id = $2 AND scope = $3 AND active = TRUE
                """,
                patient_id,
                facility_id,
                scope,
            )
            await conn.execute(
                """
                INSERT INTO consents (patient_id, facility_id, scope, active)
                VALUES ($1, $2, $3, TRUE)
                """,
                patient_id,
                facility_id,
                scope,
            )


async def revoke_consent(patient_id: str, facility_id: str, scope: str) -> int:
    """Revoke consent; returns number of rows changed."""
    pool = _require_pool()
    async with pool.acquire() as conn:
        result = await conn.execute(
            """
            UPDATE consents
            SET active = FALSE, revoked_at = NOW()
            WHERE patient_id = $1 AND facility_id = $2 AND scope = $3 AND active = TRUE
            """,
            patient_id,
            facility_id,
            scope,
        )
        # asyncpg returns like: "UPDATE <n>"
        try:
            return int(result.split()[-1])
        except Exception:
            return 0


async def get_active_consent_by_resource_id(consent_resource_id: str) -> dict | None:
    """Lookup active consent row by FHIR logical id (consent-{patient}-{facility}-{scope})."""
    pool = _require_pool()
    async with pool.acquire() as conn:
        row = await conn.fetchrow(
            """
            SELECT patient_id, facility_id, scope, active, granted_at
            FROM consents
            WHERE active = TRUE
              AND ('consent-' || patient_id || '-' || facility_id || '-' || scope) = $1
            LIMIT 1
            """,
            consent_resource_id,
        )
        return dict(row) if row else None


async def list_active_consents_for_patient(patient_id: str) -> list[dict]:
    """Return active consent rows for FHIR Consent search."""
    pool = _require_pool()
    async with pool.acquire() as conn:
        rows = await conn.fetch(
            """
            SELECT patient_id, facility_id, scope, active, granted_at
            FROM consents
            WHERE patient_id = $1 AND active = TRUE
            ORDER BY granted_at DESC
            """,
            patient_id,
        )
        return [dict(r) for r in rows]
