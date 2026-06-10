#!/usr/bin/env bash
# Export de-identified feature rows for ml/eval (no host Postgres port required).
# Output: ml/data/features_staging.jsonl
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
COMPOSE_FILE="$ROOT/infra/docker-compose.staging.yml"
ENV_FILE="$ROOT/infra/.env.staging"
SQL_FILE="$ROOT/scripts/export_ml_features_staging.sql"
OUT="$ROOT/ml/data/features_staging.jsonl"
mkdir -p "$(dirname "$OUT")"

DC=(docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE")

if ! "${DC[@]}" ps -q postgres 2>/dev/null | grep -q .; then
  echo "Start staging first: ./scripts/run_staging.sh"
  exit 1
fi

echo "=== Exporting de-identified features ==="
"${DC[@]}" exec -T postgres psql -U ehr -d ehr -t -A < "$SQL_FILE" > "$OUT"

LINES=$(wc -l < "$OUT" | tr -d '[:space:]')
echo "Wrote $OUT with $LINES patient rows (analytics consent only)."
echo "Next: ./scripts/train_ml_staging.sh"
echo "  or: python3 ml/eval/baseline_rules.py --features $OUT"
