"""
UniHealth Phase 3 — AI Assist Router
=====================================
Endpoints
  GET  /ai/status                  — model health + connection stats
  POST /ai/diagnosis-hints         — differential diagnosis from features
  POST /ai/anomaly-check           — single-patient deterioration check
  POST /ai/news2                   — compute NEWS2 EWS from raw vitals
  GET  /ai/anomalies               — list active (unacknowledged) anomalies
  POST /ai/anomalies/{id}/ack      — clinician acknowledges an anomaly
  GET  /ai/patients                — list simulated patients
  GET  /ai/patients/{sim_id}/vitals — time-series vitals for one patient
  GET  /ai/patients/{sim_id}/baselines — mean/SD/n baseline for z-score path
  GET  /ai/patients/{sim_id}/labs  — lab results for one patient
  GET  /ai/wards                   — current ward occupancy
  GET  /ai/wards/{ward_id}/forecast — 48-h bed demand forecast (clinician read)
  GET  /ai/wards/{ward_id}/history — hourly census ring buffer (trainer input; clinician read)
  POST /ai/wards/{ward_id}/census-snapshot — append census + refresh ward forecast
  POST /ai/wards/recompute-forecasts — rebuild all forecasts from histories (admin)
  POST /ai/integration/wards/{ward_id}/census-snapshot — automation census entry (secret-gated when configured)
  POST /ai/integration/hl7/adt — raw HL7 ADT ±1 census heuristic (same secret gate)
  GET  /ai/audit                   — AI recommendation audit trail (admin only)
  POST /ai/audit/{hint_id}/feedback — clinician feedback on a diagnosis hint
  GET  /ai/simulate/trigger-alert  — dev: inject a test critical alert
  WS   /ws/alerts/{role}           — real-time alert stream (role-scoped)

Security
  - All REST endpoints validate X-UniHealth-Role header (role-gating).
  - WebSocket: ``?token=`` OIDC access token (or dev shared secret when ``EHR_WS_ALLOW_DEV_TOKENS``).
  - All AI recommendations are KDPA-logged to ai_audit_log.
  - Optional integration census: ``EHR_AI_CENSUS_INTEGRATION_SECRET`` + header ``X-AI-Census-Secret``.
  - Integration idempotency: JSON ``idempotency_key`` or HL7 ``MSH-10`` replay (~seven-day TTL). Optional ``EHR_INTEGRATION_IDEMPOTENCY_REDIS`` shares replays across workers via ``EHR_REDIS_URL``.
"""

from __future__ import annotations

import time
from collections import defaultdict
from typing import Optional

from fastapi import APIRouter, Body, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from fastapi.requests import Request

import app.state as st
from app.config import settings
from app.ai.baselines import resolve_baseline_from_vitals
from app.ai.models import MODEL_VERSION, anomaly_check, compute_news2, diagnosis_hints
from app.ai.metrics import increment as ai_metric_increment, snapshot as ai_metrics_snapshot
from app.ai.risk_score import compute_deterioration_risk
from app.ai.patient_fhir import (
    build_patient_alerts,
    build_patient_insights,
    clinical_features_from_fhir,
    merge_clinical_features,
    observations_to_vitals_and_labs,
)
from app.ai.store_helpers import (
    filter_memory_anomalies,
    memory_anomalies_for_merge,
    merge_anomaly_lists,
)
from app.analytics import emit_ai_event
from app.store import (
    acknowledge_ai_anomaly,
    get_med_requests_from_cache,
    get_med_requests_from_db,
    get_observations_from_cache,
    get_observations_from_db,
    get_summary_from_db,
    has_postgres_pool,
    upsert_ml_facility_labels,
    insert_ai_anomalies,
    insert_ai_audit_entry,
    list_ai_audit_entries,
    list_ai_anomalies,
    set_ai_audit_feedback,
    set_med_requests_in_cache,
    set_observations_in_cache,
)
from app.ai.integration_dedupe import remember_response, replay_if_recent
from app.ai.hl7_adt_stub import (
    apply_adt_delta_to_snapshot,
    extract_adt_trigger,
    extract_msh10_message_control_id,
    parse_hl7_adt_message,
    pv1_assigned_location_field,
    resolve_ward_id,
    validate_hl7_message,
)
from app.ai.ward_history import append_ward_census_snapshot, recompute_all_forecasts
from app.ai.ws_manager import alert_manager
from app.auth import WsAuthError, require_role, resolve_ws_role

router = APIRouter(prefix="/ai")

# ── in-memory rate limiter (60 req/min per IP) ─────────────────────────
_rate_buckets: dict[str, list[float]] = defaultdict(list)
_RATE_LIMIT = 60
_RATE_WINDOW = 60.0


def _check_rate_limit(ip: str) -> None:
    now = time.time()
    bucket = _rate_buckets[ip]
    # evict old timestamps
    _rate_buckets[ip] = [t for t in bucket if now - t < _RATE_WINDOW]
    if len(_rate_buckets[ip]) >= _RATE_LIMIT:
        raise HTTPException(
            status_code=429,
            detail=f"Rate limit exceeded: {_RATE_LIMIT} AI requests per {int(_RATE_WINDOW)}s",
        )
    _rate_buckets[ip].append(now)


def _client_ip(request: Request) -> str:
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


def _require_ai_integration_secret(request: Request) -> None:
    """Raise 404 when disabled, 401 on bad credential (opaque to scanners)."""
    secret = (settings.ai_census_integration_secret or "").strip()
    if not secret:
        raise HTTPException(status_code=404, detail="Not Found")
    if request.headers.get("X-AI-Census-Secret", "").strip() != secret:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ── AI audit logger ─────────────────────────────────────────────────────
def _audit(event: str, role: str, patient_id: str | None, payload: dict) -> str:
    audit_id = f"AUD-{int(time.time() * 1000)}"
    entry = {
        "audit_id":     audit_id,
        "event":        event,
        "role":         role,
        "patient_id":   patient_id,
        "model_version": MODEL_VERSION,
        "payload":      payload,
        "ts":           time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "feedback":     None,
    }
    # Best-effort durability (does not fail requests if Postgres isn't enabled).
    try:
        import asyncio
        asyncio.create_task(insert_ai_audit_entry(dict(entry)))
    except Exception:
        pass
    # In-memory ring buffer for dev/tests; Postgres is authoritative when pool is up.
    if not has_postgres_pool():
        st.ai_audit_log.insert(0, entry)
        if len(st.ai_audit_log) > 500:
            st.ai_audit_log[:] = st.ai_audit_log[:500]
    else:
        st.ai_audit_log.insert(0, entry)
        if len(st.ai_audit_log) > 100:
            st.ai_audit_log[:] = st.ai_audit_log[:100]
    return audit_id


# ══════════════════════════════════════════════════════════════════
# REST ENDPOINTS
# ══════════════════════════════════════════════════════════════════

@router.get("/status", summary="AI engine health and connection status.")
async def ai_status():
    return {
        "status":          "operational",
        "model_version":   MODEL_VERSION,
        "model_type":      "clinical-v2-rules+news2+zscore; beds=ols-diurnal-ar-v1",
        "ws_connections":  alert_manager.status(),
        "active_anomalies": len([a for a in st.ai_anomalies if not a.get("acknowledged")]),
        "audit_log_count": len(st.ai_audit_log),
        "simulated_patients": len(st.sim_patients),
        "postgres_enabled": has_postgres_pool(),
        "metrics":         ai_metrics_snapshot(),
        "ts":              time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }


@router.post("/diagnosis-hints", summary="Differential diagnosis (FHIR + optional feature override).")
async def get_diagnosis_hints(request: Request, payload: dict = Body(...)):
    _check_rate_limit(_client_ip(request))
    role = require_role(request, ["doctor", "nurse", "admin"])

    features_in = payload.get("features", {})
    medications_in = payload.get("medications", [])
    patient_id = str(payload.get("patient_id") or "").strip() or None
    use_fhir = payload.get("use_fhir", True)

    if not isinstance(features_in, dict):
        raise HTTPException(status_code=400, detail="'features' must be an object")
    if not isinstance(medications_in, list):
        raise HTTPException(status_code=400, detail="'medications' must be an array")

    features: dict[str, float] = {}
    medications: list[str] = [str(m) for m in medications_in if m]

    if patient_id and use_fhir:
        observations = await _load_patient_observations(patient_id)
        med_rows = await _load_patient_medications(patient_id)
        fhir_features, fhir_meds = clinical_features_from_fhir(observations, med_rows)
        features = merge_clinical_features(fhir_features, features_in)
        if not medications and fhir_meds:
            medications = fhir_meds
        elif fhir_meds:
            medications = list(dict.fromkeys([*medications, *fhir_meds]))
    else:
        features = merge_clinical_features({}, features_in)

    result = diagnosis_hints(features, medications)
    result["features_used"] = features
    result["fhir_enriched"] = bool(patient_id and use_fhir)
    ai_metric_increment("diagnosis_hints")

    audit_id = _audit(
        "diagnosis_hints",
        role,
        patient_id,
        {
            "features_keys": list(features.keys()),
            "n_differentials": len(result["differentials"]),
            "fhir_enriched": result["fhir_enriched"],
        },
    )
    try:
        emit_ai_event(
            "diagnosis_hints",
            role=role,
            patient_id=patient_id,
            dimensions={"n_differentials": len(result["differentials"])},
        )
    except Exception:
        pass
    result["audit_id"] = audit_id
    return result


@router.post("/anomaly-check", summary="Run anomaly detection on a single vital/lab set.")
async def run_anomaly_check(request: Request, payload: dict = Body(...)):
    _check_rate_limit(_client_ip(request))
    role       = require_role(request, ["doctor", "nurse", "lab", "admin"])
    patient_id = str(payload.get("patient_id", "unknown"))
    vitals = payload.get("vitals", {}) if isinstance(payload.get("vitals"), dict) else {}
    labs = payload.get("labs") if isinstance(payload.get("labs"), dict) else None
    use_fhir = payload.get("use_fhir", True)

    if use_fhir and patient_id and patient_id != "unknown":
        observations = await _load_patient_observations(patient_id)
        v_fhir, l_fhir = observations_to_vitals_and_labs(observations, apply_defaults=False)
        vitals = {**v_fhir, **vitals}
        if labs is None:
            labs = l_fhir
        else:
            labs = {**l_fhir, **labs}

    # Series-derived baselines (always refreshed from vital history when enabled)
    use_series = payload.get("use_series_baseline", True)
    baseline: dict = {}
    if use_series:
        baseline.update(resolve_baseline_from_vitals(patient_id, st.sim_vitals))
    seed_bl = st.sim_baselines.get(patient_id)
    if isinstance(seed_bl, dict) and seed_bl:
        for mk, mv in seed_bl.items():
            if mk not in baseline and isinstance(mv, dict):
                baseline[mk] = dict(mv)
    pb = payload.get("baseline")
    if isinstance(pb, dict):
        baseline.update(pb)

    anomalies = anomaly_check(patient_id, vitals, labs, baseline or None)

    # Persist new anomalies and broadcast via WebSocket
    new_count = 0
    # Insert into Postgres if available (best-effort, does not replace in-memory simulator).
    try:
        await insert_ai_anomalies(anomalies)
    except Exception:
        pass
    for ano in anomalies:
        existing_ids = {a["id"] for a in st.ai_anomalies}
        if ano["id"] not in existing_ids:
            st.ai_anomalies.insert(0, ano)
            new_count += 1
            # fire-and-forget broadcast (non-blocking)
            import asyncio
            asyncio.create_task(alert_manager.broadcast_alert(ano))

    ai_metric_increment("anomaly_check", len(anomalies))
    _audit("anomaly_check", role, patient_id, {"n_anomalies": len(anomalies)})
    try:
        emit_ai_event(
            "anomaly_check",
            role=role,
            patient_id=patient_id,
            value=len(anomalies),
            dimensions={"new_alerts": new_count},
        )
    except Exception:
        pass
    return {"anomalies": anomalies, "new_alerts_fired": new_count}


@router.post("/news2", summary="Compute NEWS2 Early Warning Score from vitals.")
async def compute_ews(request: Request, payload: dict = Body(...)):
    _check_rate_limit(_client_ip(request))
    require_role(request, ["doctor", "nurse", "admin"])

    try:
        result = compute_news2(
            rr    = int(payload.get("rr",   16)),
            spo2  = int(payload.get("spo2", 98)),
            sbp   = int(payload.get("sbp",  120)),
            hr    = int(payload.get("hr",   75)),
            temp  = float(payload.get("temp", 37.0)),
            gcs   = int(payload.get("gcs",  15)),
        )
    except (TypeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid vitals: {e}")

    return result


async def _load_patient_observations(patient_id: str, limit: int = 50):
    cached = await get_observations_from_cache(patient_id)
    if cached is not None:
        return cached
    try:
        obs = await get_observations_from_db(patient_id, limit)
        await set_observations_in_cache(patient_id, obs)
        return obs
    except Exception:
        return []


async def _load_patient_medications(patient_id: str, limit: int = 20):
    cached = await get_med_requests_from_cache(patient_id)
    if cached is not None:
        return cached
    try:
        meds = await get_med_requests_from_db(patient_id, limit)
        await set_med_requests_in_cache(patient_id, meds)
        return meds
    except Exception:
        return []


@router.post("/patient/insights", summary="Patient-safe insights from FHIR vitals/labs + NEWS2.")
async def patient_insights(request: Request, payload: dict = Body(...)):
    _check_rate_limit(_client_ip(request))
    require_role(request, ["patient"])

    patient_id = str(payload.get("patient_id") or "").strip()
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id required")

    vitals = payload.get("vitals") or {}
    if not isinstance(vitals, dict):
        raise HTTPException(status_code=400, detail="'vitals' must be an object")

    observations = await _load_patient_observations(patient_id)
    medications = await _load_patient_medications(patient_id)

    try:
        insights, news2 = build_patient_insights(
            patient_id,
            observations,
            medications,
            vitals_override=vitals,
        )
    except (TypeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid clinical data: {e}")

    audit_id = _audit(
        "patient_insights",
        "patient",
        patient_id,
        {
            "news2_score": news2.get("score"),
            "risk": news2.get("risk"),
            "observation_count": len(observations),
            "insight_count": len(insights),
        },
    )

    ai_metric_increment("patient_insights")
    return {"insights": insights, "news2": news2, "audit_id": audit_id}


@router.post("/risk-score", summary="Pilot deterioration risk band (rules; Tier C entry).")
async def post_risk_score(request: Request, payload: dict = Body(...)):
    if not settings.ai_risk_score_enabled:
        raise HTTPException(status_code=404, detail="Not Found")
    _check_rate_limit(_client_ip(request))
    role = require_role(request, ["doctor", "nurse", "admin"])

    patient_id = str(payload.get("patient_id") or "").strip()
    if not patient_id:
        raise HTTPException(status_code=400, detail="patient_id required")

    features_in = payload.get("features") or {}
    use_fhir = payload.get("use_fhir", True)
    if not isinstance(features_in, dict):
        raise HTTPException(status_code=400, detail="'features' must be an object")

    observations: list = []
    medications: list = []
    if use_fhir:
        observations = await _load_patient_observations(patient_id)
        medications = await _load_patient_medications(patient_id)

    gender: str | None = None
    birth_date = None
    encounter_class = "unknown"
    try:
        summary = await get_summary_from_db(patient_id, encounters_limit=1)
        if summary:
            gender = summary.patient.gender
            birth_date = summary.patient.birth_date
            if summary.encounters:
                encounter_class = summary.encounters[0].class_code or "unknown"
    except Exception:
        pass

    try:
        result = compute_deterioration_risk(
            patient_id,
            observations,
            medications,
            features_override=features_in if features_in else None,
            patient_gender=gender,
            patient_birth_date=birth_date,
            encounter_class=encounter_class,
        )
    except (TypeError, ValueError) as e:
        raise HTTPException(status_code=400, detail=f"Invalid clinical data: {e}")

    result["fhir_enriched"] = bool(use_fhir and observations)
    audit_id = _audit(
        "risk_score",
        role,
        patient_id,
        {"risk_band": result.get("risk_band"), "active_alerts": result.get("active_alerts")},
    )
    ai_metric_increment("risk_score")
    try:
        emit_ai_event(
            "risk_score",
            role=role,
            patient_id=patient_id,
            dimensions={"risk_band": result.get("risk_band")},
        )
    except Exception:
        pass
    result["audit_id"] = audit_id
    return result


@router.get("/patient/alerts", summary="Patient-safe alerts (read-only) for this patient.")
async def patient_alerts(
    request: Request,
    patient_id: str = Query(...),
    limit: int = Query(default=10, ge=1, le=50),
):
    _check_rate_limit(_client_ip(request))
    require_role(request, ["patient"])

    pid = patient_id.strip()
    if not pid:
        raise HTTPException(status_code=400, detail="patient_id required")

    observations = await _load_patient_observations(pid)
    durable: list[dict] = []
    if has_postgres_pool():
        try:
            durable = await list_ai_anomalies(patient_id=pid, limit=limit)
        except Exception:
            durable = []
    memory = memory_anomalies_for_merge(st.ai_anomalies, patient_id=pid)
    stored = merge_anomaly_lists(durable, memory, limit=limit * 2)
    out = build_patient_alerts(pid, observations, stored, limit=limit)
    ai_metric_increment("patient_alerts")

    _audit(
        "patient_alerts",
        "patient",
        pid,
        {"returned": len(out), "observation_count": len(observations)},
    )
    return {"alerts": out}


@router.get("/anomalies", summary="List active anomaly alerts.")
async def list_anomalies(
    request: Request,
    patient_id: Optional[str] = Query(default=None),
    severity: Optional[str]   = Query(default=None),
    ack: Optional[bool]       = Query(default=None),
    limit: int                = Query(default=50, ge=1, le=200),
):
    require_role(request, ["doctor", "nurse", "admin"])
    ai_metric_increment("anomalies_list")
    if has_postgres_pool():
        try:
            durable = await list_ai_anomalies(
                patient_id=patient_id, severity=severity, ack=ack, limit=limit,
            )
        except Exception:
            durable = []
        memory = memory_anomalies_for_merge(st.ai_anomalies, patient_id=patient_id)
        if severity or ack is not None:
            memory = filter_memory_anomalies(memory, severity=severity, ack=ack)
        return merge_anomaly_lists(durable, memory, limit=limit)
    rows = filter_memory_anomalies(
        st.ai_anomalies, patient_id=patient_id, severity=severity, ack=ack,
    )
    return rows[:limit]


@router.post("/anomalies/{anomaly_id}/ack", summary="Acknowledge an anomaly alert.")
async def acknowledge_anomaly(anomaly_id: str, request: Request, payload: dict = Body(default={})):
    role = require_role(request, ["doctor", "nurse", "admin"])
    note = str(payload.get("note", "") or "")
    # Attempt durable ack first.
    try:
        if await acknowledge_ai_anomaly(anomaly_id, role, note=note):
            _audit("anomaly_ack", role, None, {"anomaly_id": anomaly_id, "store": "postgres"})
            return {"status": "acknowledged", "anomaly_id": anomaly_id}
    except Exception:
        pass
    for a in st.ai_anomalies:
        if a.get("id") == anomaly_id:
            a["acknowledged"]   = True
            a["ack_by"]         = role
            a["ack_ts"]         = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
            a["ack_note"]       = note
            _audit("anomaly_ack", role, a.get("patient_id"), {"anomaly_id": anomaly_id})
            return {"status": "acknowledged", "anomaly_id": anomaly_id}
    raise HTTPException(status_code=404, detail="Anomaly not found")


@router.get("/patients", summary="List simulated patients (Phase 3 test data).")
async def list_sim_patients(
    request: Request,
    ward_id:  Optional[str] = Query(default=None),
    icd10:    Optional[str] = Query(default=None),
    limit:    int           = Query(default=50, ge=1, le=100),
):
    require_role(request, ["doctor", "nurse", "admin"])
    rows = list(st.sim_patients)
    if ward_id:
        rows = [p for p in rows if p.get("ward_id") == ward_id]
    if icd10:
        rows = [p for p in rows if p.get("icd10") == icd10]

    # Attach latest NEWS2 score to each patient
    for p in rows:
        sid = p.get("sim_id", "")
        vitals_series = st.sim_vitals.get(sid, [])
        if vitals_series:
            latest = vitals_series[-1]
            ews = compute_news2(
                rr   = latest.get("rr",   16),
                spo2 = latest.get("spo2", 98),
                sbp  = latest.get("sbp",  120),
                hr   = latest.get("hr",   75),
                temp = latest.get("temp", 37.0),
                gcs  = latest.get("gcs",  15),
            )
            p["news2_score"] = ews["score"]
            p["news2_risk"]  = ews["risk"]
        else:
            p["news2_score"] = None
            p["news2_risk"]  = "UNKNOWN"

    return rows[:limit]


@router.get("/patients/{sim_id}/vitals", summary="Vital-sign time series for a patient.")
async def get_patient_vitals(
    sim_id: str, request: Request,
    limit: int = Query(default=24, ge=1, le=100),
):
    require_role(request, ["doctor", "nurse", "admin"])
    vitals = st.sim_vitals.get(sim_id)
    if vitals is None:
        raise HTTPException(status_code=404, detail=f"Patient {sim_id} not found in simulation data")
    return vitals[-limit:]


@router.get("/patients/{sim_id}/baselines", summary="Per-metric baseline mean/σ from vital time-series (z-score anchor).")
async def get_patient_baselines(sim_id: str, request: Request):
    require_role(request, ["doctor", "nurse", "admin", "lab"])
    bl = resolve_baseline_from_vitals(sim_id, st.sim_vitals)
    # locate canonical vitals bucket (alias match)
    n_read = len(st.sim_vitals.get(sim_id, []))
    if n_read == 0:
        for k in st.sim_vitals:
            if k.strip().upper() == sim_id.strip().upper():
                n_read = len(st.sim_vitals[k])
                break
    return {
        "patient_id":    sim_id,
        "baseline":      bl,
        "reading_count": n_read,
        "model_version": MODEL_VERSION,
    }


@router.get("/patients/{sim_id}/labs", summary="Lab results for a simulated patient.")
async def get_patient_labs(sim_id: str, request: Request):
    require_role(request, ["doctor", "nurse", "lab", "admin"])
    patient = next((p for p in st.sim_patients if p.get("sim_id") == sim_id), None)
    if not patient:
        raise HTTPException(status_code=404, detail=f"Patient {sim_id} not found")
    from app.ai.simulator import _labs_for
    labs = _labs_for(patient.get("icd10", ""))
    # attach patient context (de-identified: sim_id only, no PII)
    return {
        "sim_id":   sim_id,
        "panel":    "Admission Bloods",
        "results":  labs,
        "ts":       patient.get("admitted_at"),
    }


@router.get("/wards", summary="Current ward occupancy across all wards.")
async def get_wards(request: Request):
    require_role(request, ["doctor", "nurse", "admin"])
    return list(st.sim_ward_state.values())


@router.get("/wards/{ward_id}/forecast", summary="48-hour bed demand forecast for a ward.")
async def get_ward_forecast(
    ward_id: str, request: Request,
    hours: int = Query(default=24, ge=1, le=48),
):
    require_role(request, ["doctor", "nurse", "admin"])
    forecast = st.sim_bed_forecast.get(ward_id)
    if not forecast:
        raise HTTPException(status_code=404, detail=f"Ward {ward_id} not found")
    return forecast[:hours]


@router.get("/wards/{ward_id}/history", summary="Hourly ward census snapshots used to train bed forecasts.")
async def get_ward_history(
    ward_id: str,
    request: Request,
    limit: int = Query(default=168, ge=8, le=720),
):
    require_role(request, ["doctor", "nurse", "admin"])
    if ward_id not in st.sim_ward_state:
        raise HTTPException(status_code=404, detail=f"Ward {ward_id} not found")
    rows = st.sim_ward_occ_history.get(ward_id)
    if rows is None:
        raise HTTPException(status_code=404, detail=f"Ward {ward_id} has no census history")
    tail = sorted(rows, key=lambda r: float(r["ts_epoch"]))[-limit:]
    out: list[dict] = []
    for r in tail:
        ts_ep = float(r["ts_epoch"])
        out.append({
            **r,
            "ts_iso": time.strftime("%Y-%m-%d %H:%M:%SZ", time.gmtime(ts_ep)),
        })
    return out


@router.post("/wards/{ward_id}/census-snapshot", summary="Record ward occupancy (hour bucket) and refresh ML forecast.")
async def post_ward_census_snapshot(
    ward_id: str,
    request: Request,
    payload: dict = Body(...),
):
    role = require_role(request, ["nurse", "admin"])
    if "occupied" not in payload:
        raise HTTPException(status_code=400, detail="'occupied' is required")
    try:
        occ = int(payload["occupied"])
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="'occupied' must be an integer")
    src = str(payload.get("source", "manual_entry")).strip() or "manual_entry"
    try:
        result = append_ward_census_snapshot(ward_id, occ, source=src)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Ward {ward_id} not found")
    _audit("ward_census_snapshot", role, None, {"ward_id": ward_id, "occupied": occ})
    return result


@router.post(
    "/integration/wards/{ward_id}/census-snapshot",
    summary="Automation / feeder census (KDPA audited). Disabled unless EHR_AI_CENSUS_INTEGRATION_SECRET is set.",
)
async def post_integration_census_snapshot(
    ward_id: str,
    request: Request,
    payload: dict = Body(...),
):
    """
    Intended for HL7/ADT bridges or facility cron jobs — not human clinical UI.
    Returns 404 when integration is disabled so the route is non-enumerable in default deploys.

    Duplicate requests with identical ``idempotency_key`` replay the cached JSON (~7-day TTL).
    """
    _require_ai_integration_secret(request)
    ikey = str(payload.get("idempotency_key") or "").strip()
    dedupe_k = f"integration:census:{ward_id}:{ikey}" if ikey else ""
    if dedupe_k:
        rep = replay_if_recent(key=dedupe_k)
        if rep:
            return {**rep, "idempotent_replay": True}
    if "occupied" not in payload:
        raise HTTPException(status_code=400, detail="'occupied' is required")
    try:
        occ = int(payload["occupied"])
    except (TypeError, ValueError):
        raise HTTPException(status_code=400, detail="'occupied' must be an integer")
    src = str(payload.get("source", "integration_feed")).strip() or "integration_feed"
    try:
        result = append_ward_census_snapshot(ward_id, occ, source=src)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Ward {ward_id} not found")
    _audit(
        "ward_census_integration",
        "integration",
        None,
        {"ward_id": ward_id, "occupied": occ, "source": src},
    )
    if dedupe_k:
        remember_response(dedupe_k, dict(result))
    return result


@router.post(
    "/integration/hl7/adt",
    summary="Raw HL7 v2 ADT message → ±1 pilot census heuristic (KDPA audited). Requires integration secret.",
)
async def post_integration_hl7_adt(request: Request, payload: dict = Body(...)):
    """
    Minimal pilot parser: reads MSH/EVN trigger and PV1-3 location, matches a simulated ward token,
    then bumps occupied ±1 for common admit/discharge triggers.

    Optionally set JSON ``ward_id_override`` when your feeder cannot populate PV1 cleanly.

    Idempotency: JSON ``idempotency_key``, else ``MSH-10`` inferred from adjacent ``ADT^x`` payload.
    """
    _require_ai_integration_secret(request)
    msg = payload.get("message")
    if msg is None and isinstance(payload.get("raw"), str):
        msg = payload.get("raw")
    if not isinstance(msg, str) or not msg.strip():
        raise HTTPException(status_code=400, detail="JSON field 'message' or 'raw' (HL7 ER7 text) is required")

    try:
        validate_hl7_message(msg)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    parsed = parse_hl7_adt_message(msg)

    ik = str(payload.get("idempotency_key") or "").strip()
    if ik:
        dedupe_k = f"integration:hl7:key:{ik}"
    else:
        m10 = parsed.get("msh10") or extract_msh10_message_control_id(msg)
        dedupe_k = f"integration:hl7:msh10:{m10}" if m10 else ""

    if dedupe_k:
        replay = replay_if_recent(key=dedupe_k)
        if replay:
            return {**replay, "idempotent_replay": True}

    override = str(payload.get("ward_id_override") or "").strip()
    if override and override not in st.sim_ward_state:
        raise HTTPException(status_code=400, detail=f"Unknown ward_id_override: {override}")

    trigger = parsed.get("trigger") or extract_adt_trigger(msg)
    if not trigger:
        raise HTTPException(status_code=400, detail="Could not parse ADT trigger (MSH message type / EVN)")

    loc = parsed.get("pv1_location") or pv1_assigned_location_field(msg)
    known = frozenset(st.sim_ward_state.keys())
    wid = override or resolve_ward_id(loc, known)
    if not wid:
        raise HTTPException(
            status_code=400,
            detail=f"ward_id not resolved; set ward_id_override or place a known ward id in PV1-3 (PV1-3 was {loc!r})",
        )

    try:
        result = apply_adt_delta_to_snapshot(wid, trigger)
    except ValueError:
        raise HTTPException(status_code=404, detail=f"Ward {wid} not found")

    if result is None:
        out = {
            "status": "ignored",
            "ward_id": wid,
            "trigger": trigger,
            "msh10": parsed.get("msh10"),
            "sending_facility": parsed.get("sending_facility"),
        }
        _audit("ward_census_hl7_integration", "integration", None, {**out, "reason": "non_delta_trigger"})
        if dedupe_k:
            remember_response(dedupe_k, dict(out))
        return out

    if result.get("skipped"):
        _audit(
            "ward_census_hl7_integration",
            "integration",
            None,
            {"ward_id": wid, "trigger": trigger, "skipped": True, "occupied": result.get("occupied")},
        )
        if dedupe_k:
            remember_response(dedupe_k, dict(result))
        return result

    out = {**result, "msh10": parsed.get("msh10"), "sending_facility": parsed.get("sending_facility")}
    _audit(
        "ward_census_hl7_integration",
        "integration",
        None,
        {"ward_id": wid, "trigger": trigger, "occupied": result.get("occupied"), "msh10": parsed.get("msh10")},
    )
    if dedupe_k:
        remember_response(dedupe_k, dict(out))
    return out


@router.post(
    "/integration/facility-labels",
    summary="Batch upsert facility-confirmed ML outcome labels (integration secret).",
)
async def post_integration_facility_labels(request: Request, payload: dict = Body(...)):
    """
    JSON body: ``labels`` array of objects with patient_id, facility_id, and outcome_* fields.
    Used for Tier C training exports (overrides proxy labels when present).
    """
    _require_ai_integration_secret(request)
    rows = payload.get("labels")
    if not isinstance(rows, list) or not rows:
        raise HTTPException(status_code=400, detail="'labels' must be a non-empty array")
    if len(rows) > 5000:
        raise HTTPException(status_code=400, detail="Maximum 5000 labels per request")
    try:
        n = await upsert_ml_facility_labels(rows)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    _audit("ml_facility_labels_ingest", "integration", None, {"rows": n})
    return {"status": "ok", "upserted": n, "label_source": "facility_csv_v1"}


@router.post("/wards/recompute-forecasts", summary="Rebuild every ward forecast from current census histories.")
async def post_recompute_forecasts(request: Request):
    role = require_role(request, ["admin"])
    summary = recompute_all_forecasts()
    _audit("ward_forecasts_recompute", role, None, {"wards": len(summary)})
    return {"status": "ok", "training_source_by_ward": summary}


@router.get("/audit", summary="AI recommendation audit trail (admin only — KDPA).")
async def get_audit_log(
    request: Request,
    event:   Optional[str] = Query(default=None),
    limit:   int           = Query(default=100, ge=1, le=500),
):
    require_role(request, ["admin"])
    ai_metric_increment("audit_list")
    if has_postgres_pool():
        try:
            return await list_ai_audit_entries(event=event, limit=limit)
        except Exception:
            pass
    rows = list(st.ai_audit_log)
    if event:
        rows = [r for r in rows if r.get("event") == event]
    return rows[:limit]


@router.post("/audit/{audit_id}/feedback", summary="Clinician feedback on an AI hint.")
async def submit_feedback(
    audit_id: str, request: Request, payload: dict = Body(...),
):
    role = require_role(request, ["doctor", "nurse"])
    action   = payload.get("action", "").strip()
    note     = payload.get("note", "").strip()

    allowed_actions = {"accepted", "overridden", "ignored", "escalated"}
    if action not in allowed_actions:
        raise HTTPException(
            status_code=400,
            detail=f"action must be one of: {', '.join(sorted(allowed_actions))}",
        )

    fb = {
        "action": action,
        "note": note,
        "by": role,
        "ts": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
    }

    # Try durable store first; fall back to in-memory.
    try:
        if await set_ai_audit_feedback(audit_id, fb):
            return {"status": "recorded", "audit_id": audit_id}
    except Exception:
        pass

    for entry in st.ai_audit_log:
        if entry.get("audit_id") == audit_id:
            entry["feedback"] = dict(fb)
            return {"status": "recorded", "audit_id": audit_id}

    raise HTTPException(status_code=404, detail="Audit entry not found")


@router.get("/simulate/trigger-alert", summary="Dev: inject a simulated critical alert.")
async def trigger_test_alert(
    request: Request,
    patient_id: str = Query(default="SIM-001"),
):
    require_role(request, ["admin"])
    pid = (patient_id or "SIM-001").strip()
    test_anomaly = {
        "id":           f"ANO-TEST-{int(time.time()*1000)}",
        "patient_id":   pid,
        "metric":       "spo2",
        "value":        84,
        "severity":     "CRITICAL",
        "msg":          "SpO₂ critically low — immediate respiratory support",
        "type":         "threshold",
        "model_version": MODEL_VERSION,
        "generated_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        "acknowledged": False,
    }
    try:
        await insert_ai_anomalies([test_anomaly])
    except Exception:
        pass
    st.ai_anomalies.insert(0, test_anomaly)
    import asyncio
    asyncio.create_task(alert_manager.broadcast_alert(test_anomaly))
    try:
        emit_ai_event("simulate_alert", role="admin", patient_id=pid)
    except Exception:
        pass
    return {"status": "alert_injected", "anomaly": test_anomaly}


# ══════════════════════════════════════════════════════════════════
# WEBSOCKET ENDPOINT
# ══════════════════════════════════════════════════════════════════

@router.websocket("/ws/alerts/{role}")
async def ws_alerts(websocket: WebSocket, role: str, token: str = Query(...)):
    """
    Real-time alert stream, scoped by clinical role.
    Clients connect with ?token=<ws-token>.
    Server pushes JSON events:
      { "event": "anomaly_alert" | "ward_update", "ts": "...", "data": {...} }
    Clients can send { "event": "ping" } to keep alive.
    """
    try:
        role = resolve_ws_role(token, role)
    except WsAuthError as exc:
        await websocket.close(code=exc.code, reason=exc.reason[:120])
        return

    await alert_manager.connect(websocket, role)
    try:
        # Send connection confirmation
        import json
        await websocket.send_text(json.dumps({
            "event": "connected",
            "role":  role,
            "ts":    time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            "msg":   f"UniHealth Phase 3 alert stream active for role: {role}",
        }))

        # Main message loop
        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                if msg.get("event") == "ping":
                    await websocket.send_text(json.dumps({
                        "event": "pong",
                        "ts":    time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                    }))
            except Exception:
                pass  # Ignore malformed client messages

    except WebSocketDisconnect:
        alert_manager.disconnect(websocket, role)
