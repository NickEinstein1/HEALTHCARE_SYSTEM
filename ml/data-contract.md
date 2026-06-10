# ML training data contract (v1.0)

Rules-based **AI Assist** (`rule-v2.1.0`) remains the only production CDS until a model passes evaluation and **clinical sign-off**. This document defines what may enter national or central training stores.

## Contract version

| Field | Value |
|-------|--------|
| `contract_version` | `1.0` (required on every export row) |
| Export script | `scripts/export_ml_features_staging.sql` |
| Label derivation (pilot) | `derived_encounter_vitals_v1` — not a substitute for facility-confirmed outcomes |

## Outcomes per facility (definitions)

Facilities must map local coding to these **binary** fields before production ML. Staging derives proxies from encounters + latest vitals/labs for pipeline testing only.

| Outcome field | Definition | Production source |
|---------------|------------|-------------------|
| `outcome_readmission_30d` | `1` if an inpatient (`class_code = IMP`) discharge is followed by any new encounter (any class) at the same or another facility within **30 days** of `period_end`; else `0` | ADT/discharge + encounter registry |
| `outcome_deterioration_7d` | `1` if **proxy** vitals/labs on index snapshot meet deterioration screen (see below); else `0` | Clinical deterioration label / EWS escalation / ITU review |
| `outcome_icu_transfer_30d` | `1` if transfer to ICU/high-dependency within 30d of index encounter; `null` if not collected | ADT + bed management |
| `outcome_mortality_30d` | `1` if death within 30d of index discharge; `null` if not in scope | Civil registry / in-hospital mortality feed |

### Deterioration proxy (staging only — `derived_encounter_vitals_v1`)

Used to exercise `ml/train/` when real labels are unavailable. **Do not** cite sensitivity/specificity from this label in regulatory submissions.

Proxy is `1` when any of:

- `temp >= 38.0` AND (`spo2 <= 94` OR `rr >= 22`)
- `potassium >= 5.5` OR `creatinine >= 130` OR `glucose >= 11.0`
- `sbp <= 100` AND `hr >= 100`

## Allowed fields (export row)

| Field | Type | Notes |
|-------|------|--------|
| `contract_version` | string | `1.0` |
| `pseudo_id` | string | `P` + first 8 hex of `md5(patient_id + salt)` — never raw `patient_id` in central store |
| `facility_hash` | string | `F` + 8 hex of `md5(facility_id)` from latest encounter |
| `age_band` | enum | `under_40`, `40_64`, `65_plus`, `unknown` |
| `sex` | enum | `male`, `female`, `unknown` |
| `encounter_class` | enum | `AMB`, `IMP`, `EMER`, `unknown` — latest finished encounter |
| `vitals_snapshot` | object | Numeric: `rr`, `spo2`, `sbp`, `dbp`, `hr`, `temp`, `gcs` — latest per code family |
| `lab_snapshot` | object | Numeric: `potassium`, `glucose`, `creatinine`, `crp`, `lactate`, … — latest per code family |
| `medication_active_count` | int | Count of active `medication_requests` |
| `consent_analytics` | bool | `true` only if active `consents.scope = analytics` for index facility |
| `outcome_*` | int or null | See table above |
| `label_source` | string | e.g. `derived_encounter_vitals_v1`, `facility_csv_v2` |
| `export_day_bucket` | string | `YYYY-MM-DD` (no sub-day timestamps in central store) |

## Forbidden

- Patient name, phone, email, national ID (NHI), exact `birth_date`
- Free-text clinical notes, `dosage_text`, `substance_text`
- Exact `period_start` / `period_end` (use `export_day_bucket` only)
- Raw `patient_id`, `encounter_id`, `facility_id` (use hashes / pseudo_id)

## Consent and retention

- **Training row** requires `consent_analytics = true` OR explicit research consent per facility policy (export SQL filters these out).
- Pilot retention: **90-day** rolling window unless ethics approval extends.
- Delete `ml/data/features_*.jsonl` after each training run completes.

## Facility onboarding checklist

1. Sign data processing agreement and name a clinical safety officer for model changes.
2. Map local outcome codes to `outcome_*` fields (or upload labeled CSV to `ml/labels/` — future).
3. Run `./scripts/export_ml_features_staging.sh` (or production equivalent) monthly.
4. Train: `python3 ml/train/train_deterioration.py --features ml/data/features_staging.jsonl`
5. Evaluate vs rules: `python3 ml/eval/compare_models.py --features … --model ml/models/deterioration_v1.joblib`
6. Model card + clinical sign-off before `EHR_AI_RISK_SCORE_MODEL=ml` (not implemented in pilot).

## Messaging (required)

> **Rules-based CDS pilot, not diagnostic AI.** ML outputs are risk assistance only; clinicians retain accountability.
