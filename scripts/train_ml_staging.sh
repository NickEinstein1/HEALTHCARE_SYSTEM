#!/usr/bin/env bash
# Tier C: export features, train baseline model, compare vs rules.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "=== ML Tier C pipeline (staging) ==="
python3 -m pip install -q -r ml/requirements.txt

"$ROOT/scripts/export_ml_features_staging.sh"

FEATURES="$ROOT/ml/data/features_staging.jsonl"
FIXTURE="$ROOT/ml/data/fixtures/sample_features.jsonl"

if [[ ! -s "$FEATURES" ]]; then
  echo "Export empty; training on fixture for pipeline smoke."
  FEATURES="$FIXTURE"
fi

python3 ml/eval/baseline_rules.py --features "$FEATURES"
python3 ml/train/train_deterioration.py --features "$FEATURES" --min-rows 3

MODEL="$ROOT/ml/models/deterioration_v1.joblib"
if [[ -f "$MODEL" ]]; then
  python3 ml/eval/compare_models.py --features "$FEATURES" --model "$MODEL"
fi

echo "Done. See ml/data-contract.md — proxy labels only until facility outcomes are wired."
