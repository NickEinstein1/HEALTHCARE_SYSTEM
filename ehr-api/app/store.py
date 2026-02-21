"""Data access: Redis (hot) and PostgreSQL (warm)."""

import json
from typing import Optional

import redis.asyncio as redis
from app.config import settings
from app.models import Encounter, Patient, PatientSummary


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
