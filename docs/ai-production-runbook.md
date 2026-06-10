# AI Assist — production runbook

Checklist for running Phase 3 AI Assist beyond the local pilot.

## 1. Database

Apply schema (includes `ai_anomalies`, `ai_audit_log`):

```bash
psql "$EHR_POSTGRES_DSN" -f ehr-api/schema.sql
```

Optional demo vitals/labs for portal patient `P001`:

```bash
./scripts/seed_staging_db.sh
```

## 2. Environment (gateway)

| Variable | Production guidance |
|----------|---------------------|
| `EHR_DEPLOYMENT_ENV` | `production` — enables strict consent, disables WS dev tokens |
| `EHR_OIDC_ENABLED` + issuer/JWKS | Required for staff/patient API and WebSocket JWT |
| `EHR_WS_ALLOW_DEV_TOKENS` | `false` (forced in production profile) |
| `EHR_INTEGRATION_IDEMPOTENCY_REDIS` | `true` when running **multiple** API replicas |
| `EHR_REDIS_URL` | Shared Redis for cache + idempotency |
| `EHR_AI_CENSUS_INTEGRATION_SECRET` | Set for HL7/census/label automation; never commit value |
| `EHR_AI_RISK_SCORE_ENABLED` | `true` for staff deterioration band |
| `EHR_AI_RISK_SCORE_MODEL` | `rules` (default), `ml`, or `blend` — ML needs `requirements-ml.txt` + model path |
| `EHR_AI_ML_MODEL_PATH` | Path to `deterioration_v1.joblib` (+ `.meta.json`) when using ML |
| `EHR_KAFKA_BOOTSTRAP_SERVERS` | Enables `ehr.analytics.aggregate` AI metrics (no PII) |

## 3. WebSocket alerts (staff UI)

- Staff SPA passes OIDC **access token** as `?token=` on `/ai/ws/alerts/{role}`.
- Token role must match path role (`doctor`, `nurse`, …).
- Dev shared secrets (`EHR_WS_DEV_TOKENS`) are **off** in production.

## 4. Postgres-first alerts and audit

When Postgres pool is initialized at startup:

- New anomalies from `/ai/anomaly-check` are written to `ai_anomalies`.
- Audit events go to `ai_audit_log`.
- `GET /ai/anomalies` and `GET /ai/audit` read Postgres first; in-memory simulator rows (`SIM-*`) are merged for demos only.

## 5. Monitoring

- **Health**: `GET /ai/status` — model version, WS connection counts, in-process metric snapshot.
- **Kafka**: metrics `ai.diagnosis_hints`, `ai.anomaly_check`, … with `patient_scope` ∈ `none|portal|sim|other` (no raw patient IDs).
- **Audit**: `GET /ai/audit` (admin) for KDPA review.

## 6. Facility-confirmed ML labels

Table `ml_patient_outcome_labels` (in `schema.sql`) stores ground-truth outcomes per facility.

- Import CSV: `./scripts/import_facility_labels.sh` (requires integration secret) or seed SQL.
- Export prefers facility labels over proxy vitals labels: `./scripts/export_ml_features_staging.sh`
- See [ml/labels/README.md](../ml/labels/README.md).

## 7. HL7 ADT (hardened pilot)

`POST /ai/integration/hl7/adt` — heuristic census ±1 with:

- Message size cap (64 KiB), required MSH, ADT type check (`validate_hl7_message`)
- Structured parse metadata (`msh10`, `sending_facility`, `pv1_location`) in audit/response
- `idempotency_key` or MSH-10 dedupe (Redis when `EHR_INTEGRATION_IDEMPOTENCY_REDIS=true`)
- `ward_id_override` when PV1-3 does not match simulator wards

Before production ADT feeds: map to your conformance profile; do not treat as clinical census truth.

## 8. Rollback


- Disable integration routes: unset `EHR_AI_CENSUS_INTEGRATION_SECRET` (routes return 404).
- AI REST/WS remain available; remove router mount only if full rollback required (not recommended mid-pilot).
