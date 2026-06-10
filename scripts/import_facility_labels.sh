#!/usr/bin/env bash
# Import facility-confirmed ML labels via gateway integration API or direct SQL.
# CSV columns: patient_id,facility_id,outcome_deterioration_7d,outcome_readmission_30d,outcome_icu_transfer_30d,effective_day
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
CSV="${1:-$ROOT/ml/labels/facility_labels_template.csv}"
GATEWAY="${EHR_GATEWAY_URL:-http://localhost:8100}"
SECRET="${EHR_AI_CENSUS_INTEGRATION_SECRET:-}"

if [[ ! -f "$CSV" ]]; then
  echo "CSV not found: $CSV"
  exit 1
fi

if [[ -n "$SECRET" ]]; then
  echo "=== POST /ai/integration/facility-labels ==="
  python3 - "$CSV" "$GATEWAY" "$SECRET" <<'PY'
import csv, json, sys, urllib.request

path, gateway, secret = sys.argv[1], sys.argv[2], sys.argv[3]
labels = []
with open(path, newline="", encoding="utf-8") as f:
    for row in csv.DictReader(f):
        if not row.get("patient_id"):
            continue
        labels.append({
            k: (int(v) if v != "" and k.startswith("outcome_") else v or None)
            for k, v in row.items()
            if v != "" or k in ("patient_id", "facility_id")
        })
body = json.dumps({"labels": labels}).encode()
req = urllib.request.Request(
    f"{gateway.rstrip('/')}/ai/integration/facility-labels",
    data=body,
    headers={"Content-Type": "application/json", "X-AI-Census-Secret": secret},
    method="POST",
)
with urllib.request.urlopen(req, timeout=30) as resp:
    print(resp.read().decode())
PY
  exit 0
fi

echo "Set EHR_AI_CENSUS_INTEGRATION_SECRET or apply SQL:"
echo "  docker compose exec -T postgres psql -U ehr -d ehr < scripts/import_facility_labels.sql"
echo "(Generate SQL from CSV with your ETL tool.)"
