# Offline evaluation

## Goal

Compare **rule-v2.1.0** (production pilot) against Tier C sklearn baselines on the **same** labeled cohort.

## Steps

1. Export de-identified rows: `./scripts/export_ml_features_staging.sh` (contract v1.0).
2. Baseline rules: `python3 ml/eval/baseline_rules.py --features ml/data/features_staging.jsonl`
3. Train: `python3 ml/train/train_deterioration.py --features …`
4. Compare: `python3 ml/eval/compare_models.py --features … --model ml/models/deterioration_v1.joblib`
5. Document metrics in a model card before any production ML toggle.

## Acceptance (example — requires real labels)

- Deterioration: sensitivity ≥ 0.85 at operational alert rate ≤ 2/patient/day on validation.
- No deployment without clinical sign-off and KDPA impact assessment.

Proxy labels from `derived_encounter_vitals_v1` are for **pipeline testing only**.
