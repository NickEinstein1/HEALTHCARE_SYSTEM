"""Data access: Redis (hot) and PostgreSQL (warm)."""

import json
import time
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


def has_postgres_pool() -> bool:
    return _pg_pool is not None


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
    if _redis_client is None:
        return None
    client = _redis_client
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
    if _redis_client is None:
        return
    client = _redis_client
    key = f"patient:{patient_id}:summary"
    await client.set(key, _summary_to_json(summary), ex=settings.cache_ttl_seconds)


async def delete_summary_cache(patient_id: str) -> None:
    """Invalidate cached patient summary after profile/demographics update."""
    try:
        client = _require_redis_client()
        await client.delete(f"patient:{patient_id}:summary")
    except Exception:
        pass


async def update_patient_demographics(
    patient_id: str,
    *,
    given_name: str | None = None,
    family_name: str | None = None,
) -> None:
    """Update FHIR patient name fields in PostgreSQL when portal profile is saved."""
    pool = _require_pool()
    async with pool.acquire() as conn:
        await conn.execute(
            """
            UPDATE patients
            SET given_name = COALESCE(NULLIF($2, ''), given_name),
                family_name = COALESCE(NULLIF($3, ''), family_name),
                updated_at = NOW()
            WHERE id = $1
            """,
            patient_id,
            given_name or "",
            family_name or "",
        )


async def get_summary_from_db(patient_id: str, encounters_limit: int) -> Optional[PatientSummary]:
    """Load patient + last N encounters from PostgreSQL."""
    if _pg_pool is None:
        return None
    pool = _pg_pool
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
    if _redis_client is None:
        return None
    client = _redis_client
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
    if _redis_client is None:
        return
    client = _redis_client
    key = f"patient:{patient_id}:observations"
    await client.set(
        key,
        json.dumps([o.model_dump(mode="json") for o in observations]),
        ex=settings.cache_ttl_seconds,
    )


async def get_observations_from_db(patient_id: str, limit: int) -> list[Observation]:
    if _pg_pool is None:
        return []
    pool = _pg_pool
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


# ---------------------------------------------------------------------------
# Phase 3 AI Assist pilot — durable anomalies (optional; requires Postgres pool)
# ---------------------------------------------------------------------------

async def insert_ai_anomalies(anomalies: list[dict]) -> int:
    """
    Best-effort insert of anomaly rows.
    Returns number of rows inserted (0 if Postgres not initialized).
    """
    if not anomalies or _pg_pool is None:
        return 0
    pool = _require_pool()
    inserted = 0
    async with pool.acquire() as conn:
        for a in anomalies:
            try:
                await conn.execute(
                    """
                    INSERT INTO ai_anomalies (
                      id, patient_id, metric, value, severity, msg, type,
                      model_version, generated_at, acknowledged,
                      ack_by, ack_ts, ack_note, payload_json
                    ) VALUES (
                      $1,$2,$3,$4,$5,$6,$7,
                      $8,$9,$10,
                      $11,$12,$13,$14
                    )
                    ON CONFLICT (id) DO NOTHING
                    """,
                    str(a.get("id") or ""),
                    str(a.get("patient_id") or ""),
                    str(a.get("metric") or ""),
                    float(a.get("value")) if isinstance(a.get("value"), (int, float)) else None,
                    str(a.get("severity") or ""),
                    str(a.get("msg") or a.get("detail") or ""),
                    str(a.get("type") or ""),
                    str(a.get("model_version") or ""),
                    a.get("generated_at"),
                    bool(a.get("acknowledged") or False),
                    a.get("ack_by"),
                    a.get("ack_ts"),
                    a.get("ack_note"),
                    json.dumps(a),
                )
                inserted += 1
            except Exception:
                continue
    return inserted


async def list_ai_anomalies(
    patient_id: str | None = None,
    severity: str | None = None,
    ack: bool | None = None,
    limit: int = 50,
) -> list[dict]:
    if _pg_pool is None:
        return []
    pool = _require_pool()
    q = [
        "SELECT payload_json FROM ai_anomalies WHERE 1=1",
    ]
    args: list = []
    n = 0
    if patient_id:
        n += 1
        q.append(f"AND patient_id = ${n}")
        args.append(patient_id)
    if severity:
        n += 1
        q.append(f"AND UPPER(severity) = UPPER(${n})")
        args.append(severity)
    if ack is not None:
        n += 1
        q.append(f"AND acknowledged = ${n}")
        args.append(bool(ack))
    n += 1
    q.append("ORDER BY generated_at DESC NULLS LAST, created_at DESC")
    q.append(f"LIMIT ${n}")
    args.append(int(limit))
    sql = "\n".join(q)
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *args)
    out: list[dict] = []
    for r in rows:
        try:
            out.append(json.loads(r["payload_json"]))
        except Exception:
            continue
    return out


async def acknowledge_ai_anomaly(anomaly_id: str, role: str, note: str = "") -> bool:
    if _pg_pool is None:
        return False
    pool = _require_pool()
    ack_ts = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
    async with pool.acquire() as conn:
        res = await conn.execute(
            """
            UPDATE ai_anomalies
            SET acknowledged = TRUE,
                ack_by = $2,
                ack_ts = $3,
                ack_note = $4,
                payload_json = jsonb_set(
                  jsonb_set(
                    jsonb_set(
                      jsonb_set(payload_json::jsonb, '{acknowledged}', 'true'::jsonb, true),
                      '{ack_by}', to_jsonb($2::text), true
                    ),
                    '{ack_ts}', to_jsonb($3::text), true
                  ),
                  '{ack_note}', to_jsonb($4::text), true
                )::text
            WHERE id = $1
            """,
            anomaly_id,
            role,
            ack_ts,
            note or "",
        )
    # asyncpg returns "UPDATE <n>"
    try:
        return int(str(res).split()[-1]) > 0
    except Exception:
        return False


async def insert_ai_audit_entry(entry: dict) -> bool:
    """
    Best-effort insert of a single audit entry.
    Returns True if inserted (False if Postgres not initialized or insert fails).
    """
    if not entry or _pg_pool is None:
        return False
    try:
        pool = _require_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO ai_audit_log (
                  audit_id, event, role, patient_id, model_version,
                  payload_json, ts, feedback_json
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
                ON CONFLICT (audit_id) DO NOTHING
                """,
                str(entry.get("audit_id") or ""),
                str(entry.get("event") or ""),
                str(entry.get("role") or ""),
                entry.get("patient_id"),
                entry.get("model_version"),
                json.dumps(entry.get("payload") or {}),
                entry.get("ts"),
                json.dumps(entry.get("feedback")) if entry.get("feedback") else None,
            )
        return True
    except Exception:
        return False


async def list_ai_audit_entries(event: str | None = None, limit: int = 100) -> list[dict]:
    if _pg_pool is None:
        return []
    pool = _require_pool()
    limit = max(1, min(int(limit), 500))
    args: list = []
    n = 0
    where = "WHERE 1=1"
    if event:
        n += 1
        where += f" AND event = ${n}"
        args.append(event)
    n += 1
    args.append(limit)
    sql = f"""
      SELECT audit_id, event, role, patient_id, model_version, payload_json, ts, feedback_json
      FROM ai_audit_log
      {where}
      ORDER BY ts DESC NULLS LAST, created_at DESC
      LIMIT ${n}
    """
    async with pool.acquire() as conn:
        rows = await conn.fetch(sql, *args)
    out: list[dict] = []
    for r in rows:
        try:
            payload = json.loads(r["payload_json"]) if r["payload_json"] else {}
        except Exception:
            payload = {}
        try:
            feedback = json.loads(r["feedback_json"]) if r["feedback_json"] else None
        except Exception:
            feedback = None
        out.append(
            {
                "audit_id": r["audit_id"],
                "event": r["event"],
                "role": r["role"],
                "patient_id": r["patient_id"],
                "model_version": r["model_version"],
                "payload": payload,
                "ts": r["ts"],
                "feedback": feedback,
            }
        )
    return out


async def set_ai_audit_feedback(
    audit_id: str,
    feedback: dict,
) -> bool:
    if _pg_pool is None:
        return False
    pool = _require_pool()
    try:
        async with pool.acquire() as conn:
            res = await conn.execute(
                """
                UPDATE ai_audit_log
                SET feedback_json = $2
                WHERE audit_id = $1
                """,
                audit_id,
                json.dumps(feedback),
            )
        try:
            return int(str(res).split()[-1]) > 0
        except Exception:
            return False
    except Exception:
        return False


async def get_med_requests_from_cache(patient_id: str) -> Optional[list[MedicationRequest]]:
    if _redis_client is None:
        return None
    client = _redis_client
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
    if _redis_client is None:
        return
    client = _redis_client
    key = f"patient:{patient_id}:med_requests"
    await client.set(
        key,
        json.dumps([m.model_dump(mode="json") for m in meds]),
        ex=settings.cache_ttl_seconds,
    )


async def get_med_requests_from_db(patient_id: str, limit: int) -> list[MedicationRequest]:
    if _pg_pool is None:
        return []
    pool = _pg_pool
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


async def upsert_ml_facility_labels(rows: list[dict]) -> int:
    """Insert or update facility-confirmed ML labels. Requires Postgres."""
    pool = _require_pool()
    n = 0
    async with pool.acquire() as conn:
        for raw in rows:
            if not isinstance(raw, dict):
                raise ValueError("each label row must be an object")
            pid = str(raw.get("patient_id") or "").strip()
            fid = str(raw.get("facility_id") or "").strip()
            if not pid or not fid:
                raise ValueError("patient_id and facility_id required on each row")
            det = raw.get("outcome_deterioration_7d")
            readm = raw.get("outcome_readmission_30d")
            icu = raw.get("outcome_icu_transfer_30d")
            if det is None and readm is None and icu is None:
                raise ValueError("at least one outcome_* field required")
            eff = raw.get("effective_day") or raw.get("export_day_bucket")
            label_source = str(raw.get("label_source") or "facility_csv_v1")[:64]
            await conn.execute(
                """
                INSERT INTO ml_patient_outcome_labels (
                    patient_id, facility_id,
                    outcome_readmission_30d, outcome_deterioration_7d, outcome_icu_transfer_30d,
                    effective_day, label_source
                )
                VALUES ($1, $2, $3, $4, $5, COALESCE($6::date, CURRENT_DATE), $7)
                ON CONFLICT (patient_id, facility_id, effective_day)
                DO UPDATE SET
                    outcome_readmission_30d = COALESCE(EXCLUDED.outcome_readmission_30d, ml_patient_outcome_labels.outcome_readmission_30d),
                    outcome_deterioration_7d = COALESCE(EXCLUDED.outcome_deterioration_7d, ml_patient_outcome_labels.outcome_deterioration_7d),
                    outcome_icu_transfer_30d = COALESCE(EXCLUDED.outcome_icu_transfer_30d, ml_patient_outcome_labels.outcome_icu_transfer_30d),
                    label_source = EXCLUDED.label_source
                """,
                pid,
                fid,
                int(readm) if readm is not None else None,
                int(det) if det is not None else None,
                int(icu) if icu is not None else None,
                str(eff) if eff else None,
                label_source,
            )
            n += 1
    return n


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


async def insert_clinical_ai_assessment(row: dict) -> bool:
    """Persist a clinical AI assessment. Falls back to in-memory ring buffer."""
    import app.state as st

    if not row:
        return False
    if _pg_pool is None:
        st.clinical_ai_assessments.insert(0, dict(row))
        if len(st.clinical_ai_assessments) > 200:
            st.clinical_ai_assessments[:] = st.clinical_ai_assessments[:200]
        return True
    try:
        pool = _require_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO clinical_ai_assessments (
                  assessment_id, patient_id, role, provider, model_version,
                  request_json, response_json, audit_id, created_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,COALESCE($9::timestamptz, NOW()))
                ON CONFLICT (assessment_id) DO NOTHING
                """,
                str(row.get("assessment_id") or ""),
                str(row.get("patient_id") or ""),
                str(row.get("role") or ""),
                str(row.get("provider") or ""),
                row.get("model_version"),
                json.dumps(row.get("request") or {}),
                json.dumps(row.get("response") or {}),
                row.get("audit_id"),
                row.get("created_at"),
            )
        return True
    except Exception:
        st.clinical_ai_assessments.insert(0, dict(row))
        if len(st.clinical_ai_assessments) > 200:
            st.clinical_ai_assessments[:] = st.clinical_ai_assessments[:200]
        return False


async def list_clinical_ai_assessments(patient_id: str, limit: int = 20) -> list[dict]:
    import app.state as st

    limit = max(1, min(int(limit), 100))
    if _pg_pool is None:
        rows = [
            r for r in st.clinical_ai_assessments
            if str(r.get("patient_id") or "") == patient_id
        ]
        return rows[:limit]
    try:
        pool = _require_pool()
        async with pool.acquire() as conn:
            db_rows = await conn.fetch(
                """
                SELECT assessment_id, patient_id, role, provider, model_version,
                       request_json, response_json, audit_id, created_at
                FROM clinical_ai_assessments
                WHERE patient_id = $1
                ORDER BY created_at DESC
                LIMIT $2
                """,
                patient_id,
                limit,
            )
        out: list[dict] = []
        for r in db_rows:
            try:
                request = json.loads(r["request_json"]) if r["request_json"] else {}
            except Exception:
                request = {}
            try:
                response = json.loads(r["response_json"]) if r["response_json"] else {}
            except Exception:
                response = {}
            out.append({
                "assessment_id": r["assessment_id"],
                "patient_id": r["patient_id"],
                "role": r["role"],
                "provider": r["provider"],
                "model_version": r["model_version"],
                "request": request,
                "response": response,
                "audit_id": r["audit_id"],
                "created_at": r["created_at"].isoformat() if r.get("created_at") else None,
            })
        return out
    except Exception:
        rows = [
            r for r in st.clinical_ai_assessments
            if str(r.get("patient_id") or "") == patient_id
        ]
        return rows[:limit]


def _serialize_legal_doc(doc: dict) -> dict:
    return dict(doc)


async def insert_legal_document(doc: dict) -> bool:
    import app.state as st
    if not doc:
        return False
    st.legal_documents.insert(0, _serialize_legal_doc(doc))
    if len(st.legal_documents) > 500:
        st.legal_documents[:] = st.legal_documents[:500]
    if _pg_pool is None:
        return True
    try:
        pool = _require_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO legal_documents (
                  id, patient_id, encounter_id, facility_id, doc_type, template_version,
                  title, body, summary, required_signers, status, context_json,
                  verification_code, created_by_role, created_by_subject, signatures_json,
                  created_at, completed_at, expires_at
                ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,
                          COALESCE($17::timestamptz, NOW()), $18::timestamptz, $19::timestamptz)
                ON CONFLICT (id) DO NOTHING
                """,
                str(doc.get("id") or ""),
                str(doc.get("patient_id") or ""),
                doc.get("encounter_id"),
                str(doc.get("facility_id") or "FAC-A"),
                str(doc.get("doc_type") or ""),
                str(doc.get("template_version") or "1.0"),
                str(doc.get("title") or ""),
                str(doc.get("body") or ""),
                doc.get("summary"),
                json.dumps(doc.get("required_signers") or []),
                str(doc.get("status") or "pending_signatures"),
                json.dumps(doc.get("context") or {}),
                doc.get("verification_code"),
                str(doc.get("created_by_role") or ""),
                doc.get("created_by_subject"),
                json.dumps(doc.get("signatures") or []),
                doc.get("created_at"),
                doc.get("completed_at"),
                doc.get("expires_at"),
            )
        return True
    except Exception:
        return False


async def update_legal_document(doc: dict) -> bool:
    import app.state as st
    doc_id = str(doc.get("id") or "")
    for i, row in enumerate(st.legal_documents):
        if str(row.get("id")) == doc_id:
            st.legal_documents[i] = _serialize_legal_doc(doc)
            break
    if _pg_pool is None:
        return True
    try:
        pool = _require_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                UPDATE legal_documents SET
                  status = $2,
                  signatures_json = $3,
                  verification_code = $4,
                  completed_at = $5::timestamptz,
                  voided_at = $6::timestamptz,
                  void_reason = $7,
                  context_json = $8
                WHERE id = $1
                """,
                doc_id,
                str(doc.get("status") or ""),
                json.dumps(doc.get("signatures") or []),
                doc.get("verification_code"),
                doc.get("completed_at"),
                doc.get("voided_at"),
                doc.get("void_reason"),
                json.dumps(doc.get("context") or {}),
            )
        return True
    except Exception:
        return False


async def get_legal_document(document_id: str) -> dict | None:
    import app.state as st
    for row in st.legal_documents:
        if str(row.get("id")) == document_id:
            return dict(row)
    if _pg_pool is None:
        return None
    try:
        pool = _require_pool()
        async with pool.acquire() as conn:
            row = await conn.fetchrow(
                """
                SELECT id, patient_id, encounter_id, facility_id, doc_type, template_version,
                       title, body, summary, required_signers, status, context_json,
                       verification_code, created_by_role, created_by_subject, signatures_json,
                       created_at, completed_at, expires_at, voided_at, void_reason
                FROM legal_documents WHERE id = $1
                """,
                document_id,
            )
        if not row:
            return None
        try:
            signatures = json.loads(row["signatures_json"]) if row["signatures_json"] else []
        except Exception:
            signatures = []
        try:
            required = json.loads(row["required_signers"]) if row["required_signers"] else []
        except Exception:
            required = []
        try:
            context = json.loads(row["context_json"]) if row["context_json"] else {}
        except Exception:
            context = {}
        return {
            "id": row["id"],
            "patient_id": row["patient_id"],
            "encounter_id": row["encounter_id"],
            "facility_id": row["facility_id"],
            "doc_type": row["doc_type"],
            "template_version": row["template_version"],
            "title": row["title"],
            "body": row["body"],
            "summary": row["summary"],
            "required_signers": required,
            "status": row["status"],
            "context": context,
            "verification_code": row["verification_code"],
            "created_by_role": row["created_by_role"],
            "created_by_subject": row["created_by_subject"],
            "signatures": signatures,
            "created_at": row["created_at"].isoformat() if row.get("created_at") else None,
            "completed_at": row["completed_at"].isoformat() if row.get("completed_at") else None,
            "expires_at": row["expires_at"].isoformat() if row.get("expires_at") else None,
            "voided_at": row["voided_at"].isoformat() if row.get("voided_at") else None,
            "void_reason": row.get("void_reason"),
        }
    except Exception:
        return None


async def list_legal_documents(
    *,
    patient_id: str | None = None,
    doc_type: str | None = None,
    status: str | None = None,
    limit: int = 50,
) -> list[dict]:
    import app.state as st
    limit = max(1, min(int(limit), 200))
    rows = st.legal_documents[:]
    if patient_id:
        rows = [r for r in rows if str(r.get("patient_id") or "") == patient_id]
    if doc_type:
        rows = [r for r in rows if str(r.get("doc_type") or "") == doc_type]
    if status:
        rows = [r for r in rows if str(r.get("status") or "") == status]
    if rows:
        return [dict(r) for r in rows[:limit]]
    if _pg_pool is None:
        return []
    try:
        pool = _require_pool()
        args: list = []
        where = "WHERE 1=1"
        n = 0
        if patient_id:
            n += 1
            where += f" AND patient_id = ${n}"
            args.append(patient_id)
        if doc_type:
            n += 1
            where += f" AND doc_type = ${n}"
            args.append(doc_type)
        if status:
            n += 1
            where += f" AND status = ${n}"
            args.append(status)
        n += 1
        args.append(limit)
        sql = f"""
          SELECT id FROM legal_documents
          {where}
          ORDER BY created_at DESC NULLS LAST
          LIMIT ${n}
        """
        async with pool.acquire() as conn:
            db_rows = await conn.fetch(sql, *args)
        out: list[dict] = []
        for row in db_rows:
            doc = await get_legal_document(str(row["id"]))
            if doc:
                out.append(doc)
        return out
    except Exception:
        return []


async def insert_legal_document_audit(entry: dict) -> bool:
    if not entry or _pg_pool is None:
        return False
    try:
        pool = _require_pool()
        async with pool.acquire() as conn:
            await conn.execute(
                """
                INSERT INTO legal_document_audit_log (
                  audit_id, document_id, event, role, subject, payload_json, ts
                ) VALUES ($1,$2,$3,$4,$5,$6,COALESCE($7::timestamptz, NOW()))
                ON CONFLICT (audit_id) DO NOTHING
                """,
                str(entry.get("audit_id") or ""),
                str(entry.get("document_id") or ""),
                str(entry.get("event") or ""),
                str(entry.get("role") or ""),
                entry.get("subject"),
                json.dumps(entry.get("payload") or {}),
                entry.get("ts"),
            )
        return True
    except Exception:
        return False
