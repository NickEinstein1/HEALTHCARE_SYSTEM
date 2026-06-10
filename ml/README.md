# UniHealth ML program (Tier C)

Foundation for **real machine learning**, separate from the rules-based **AI Assist pilot** (`ehr-api` `/ai/*`, `rule-v2.1.0`).

> **Rules-based CDS pilot, not diagnostic AI.** ML artifacts here are experimental until clinical sign-off.

## Status

| Item | Status |
|------|--------|
| Rules pilot (NEWS2, thresholds, `/ai/risk-score` rules) | **Live** |
| Data contract v1.0 + rich export | **Ready** (`scripts/export_ml_features_staging.sql`) |
| Train / eval pipeline | **Ready** (`ml/train/`, `ml/eval/`) |
| API ML serve (`EHR_AI_RISK_SCORE_MODEL=ml\|blend`) | **Optional** — `ehr-api/app/ai/ml_inference.py` |
| Facility-confirmed labels | **Ready** — `ml_patient_outcome_labels` + `scripts/import_facility_labels.sh` |
| Blueprint federated/NLP/imaging | **Architecture** — `ml/blueprint/`, `docs/blueprint-phase3-ai.md` |
| Production ML risk score | **Blocked** — clinical sign-off required |

## Quick start (staging)

```bash
./scripts/run_staging.sh
./scripts/seed_staging_db.sh          # includes analytics consent for P001–P003
./scripts/train_ml_staging.sh         # export → baseline rules → train → compare
```

Offline (no Docker):

```bash
python3 -m pip install -r ml/requirements.txt
python3 ml/eval/baseline_rules.py --features ml/data/fixtures/sample_features.jsonl
python3 ml/train/train_deterioration.py --features ml/data/fixtures/sample_features.jsonl
python3 ml/eval/compare_models.py --features ml/data/fixtures/sample_features.jsonl \
  --model ml/models/deterioration_v1.joblib
```

## Layout

```
ml/
  README.md
  data-contract.md      — outcomes, allowed fields, facility checklist
  requirements.txt      — sklearn, numpy, joblib
  data/
    fixtures/sample_features.jsonl  — CI + offline smoke
    features_staging.jsonl          — generated (gitignored if large)
  train/
    features.py         — JSONL → vectors
    train_deterioration.py
  eval/
    baseline_rules.py   — rule-v2.1.0 on exports
    compare_models.py   — rules vs sklearn on same labels
  models/               — trained joblib (local only)
```

## Labels (important)

Staging uses **`derived_encounter_vitals_v1`** proxy labels in SQL. Facilities must supply real outcomes (`outcome_readmission_30d`, `outcome_deterioration_7d`, etc.) per [data-contract.md](data-contract.md) before any production toggle.

## Next steps after baseline trains

1. Enrich cohort size and **facility-confirmed** labels (CSV or ETL).
2. Model card: sensitivity, specificity, alert rate on held-out set.
3. Clinical safety officer sign-off.
4. Only then consider serving ML probabilities behind a new feature flag (not wired in pilot).

## References

- [docs/ai-assist-scope.md](../docs/ai-assist-scope.md)
- [docs/ai-production-runbook.md](../docs/ai-production-runbook.md)
