"""Data access: Redis (hot) and PostgreSQL (warm)."""

import json
from typing import Optional

import redis.asyncio as redis
from app.config import settings
from app.models import Encounter, MedicationRequest, Observation, Patient, PatientSummary


def _summary_to_json(s: PatientSummary) -> str:
    return s.model_dump_json()


def _json_to_summary(raw: str) -> PatientSummary:
    return PatientSummary.model_validate_json(raw)


async def get_summary_from_cache(patient_id: str) -> Optional[PatientSummary]:
    """Return cached patient summary if present. Sub-ms typically."""
    client = redis.from_url(settings.redis_url, decode_responses=True)
    try:
        key = f"patient:{patient_id}:summary"
        raw = await client.get(key)
        if raw is None:
            return None
        return _json_to_summary(raw)
    finally:
        await client.aclose()


async def set_summary_in_cache(patient_id: str, summary: PatientSummary) -> None:
    client = redis.from_url(settings.redis_url, decode_responses=True)
    try:
        key = f"patient:{patient_id}:summary"
        await client.set(key, _summary_to_json(summary), ex=settings.cache_ttl_seconds)
    finally:
        await client.aclose()


async def get_summary_from_db(patient_id: str, encounters_limit: int) -> Optional[PatientSummary]:
    """Load patient + last N encounters from PostgreSQL."""
    import asyncpg

    conn = await asyncpg.connect(settings.postgres_dsn)
    try:
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
    finally:
        await conn.close()


async def get_observations_from_cache(patient_id: str) -> Optional[list[Observation]]:
    client = redis.from_url(settings.redis_url, decode_responses=True)
    try:
        key = f"patient:{patient_id}:observations"
        raw = await client.get(key)
        if raw is None:
            return None
        data = json.loads(raw)
        return [Observation.model_validate(item) for item in data]
    finally:
        await client.aclose()


async def set_observations_in_cache(patient_id: str, observations: list[Observation]) -> None:
    client = redis.from_url(settings.redis_url, decode_responses=True)
    try:
        key = f"patient:{patient_id}:observations"
        await client.set(
            key,
            json.dumps([o.model_dump(mode="json") for o in observations]),
            ex=settings.cache_ttl_seconds,
        )
    finally:
        await client.aclose()


async def get_observations_from_db(patient_id: str, limit: int) -> list[Observation]:
    import asyncpg

    conn = await asyncpg.connect(settings.postgres_dsn)
    try:
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
    finally:
        await conn.close()


async def get_med_requests_from_cache(patient_id: str) -> Optional[list[MedicationRequest]]:
    client = redis.from_url(settings.redis_url, decode_responses=True)
    try:
        key = f"patient:{patient_id}:med_requests"
        raw = await client.get(key)
        if raw is None:
            return None
        data = json.loads(raw)
        return [MedicationRequest.model_validate(item) for item in data]
    finally:
        await client.aclose()


async def set_med_requests_in_cache(patient_id: str, meds: list[MedicationRequest]) -> None:
    client = redis.from_url(settings.redis_url, decode_responses=True)
    try:
        key = f"patient:{patient_id}:med_requests"
        await client.set(
            key,
            json.dumps([m.model_dump(mode="json") for m in meds]),
            ex=settings.cache_ttl_seconds,
        )
    finally:
        await client.aclose()


async def get_med_requests_from_db(patient_id: str, limit: int) -> list[MedicationRequest]:
    import asyncpg

    conn = await asyncpg.connect(settings.postgres_dsn)
    try:
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
    finally:
        await conn.close()


async def patient_exists(patient_id: str) -> bool:
    """Return True if a row exists in patients (required before consents FK insert)."""
    import asyncpg

    conn = await asyncpg.connect(settings.postgres_dsn)
    try:
        row = await conn.fetchrow("SELECT 1 FROM patients WHERE id = $1", patient_id)
        return row is not None
    finally:
        await conn.close()


async def has_active_consent(patient_id: str, facility_id: str, scope: str) -> bool:
    """Return True if an active consent exists for patient/facility/scope."""
    import asyncpg

    conn = await asyncpg.connect(settings.postgres_dsn)
    try:
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
    finally:
        await conn.close()


async def grant_consent(patient_id: str, facility_id: str, scope: str) -> None:
    """Grant (activate) consent; creates a row and deactivates older rows for same key."""
    import asyncpg

    conn = await asyncpg.connect(settings.postgres_dsn)
    try:
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
    finally:
        await conn.close()


async def revoke_consent(patient_id: str, facility_id: str, scope: str) -> int:
    """Revoke consent; returns number of rows changed."""
    import asyncpg

    conn = await asyncpg.connect(settings.postgres_dsn)
    try:
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
    finally:
        await conn.close()
