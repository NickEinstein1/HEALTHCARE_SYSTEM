#!/usr/bin/env bash
# Lightweight smoke checks for Phase 3 /ai endpoints (simulator).
# Prerequisites: gateway running with app.main (bootstraps AI state on startup).
# Usage:
#   ./scripts/smoke_phase3_ai.sh
#   EHR_GATEWAY_URL=http://localhost:8100 ./scripts/smoke_phase3_ai.sh

set -euo pipefail

BASE="${EHR_GATEWAY_URL:-http://localhost:8000}"
BASE="${BASE%/}"

chk() {
  local name="$1"
  shift
  local code
  code="$(curl -s -o /tmp/unihealth-ai-smoke.json -w "%{http_code}" "$@")"
  echo "$name -> HTTP $code"
  case "$code" in
    200) ;;
    *) echo "  body (first 240 bytes):"; head -c 240 /tmp/unihealth-ai-smoke.json || true; echo ""; exit 1 ;;
  esac
}

chk "GET /ai/status" "$BASE/ai/status"
chk "POST /ai/patient/insights" \
  -H "Content-Type: application/json" \
  -H "X-UniHealth-Role: patient" \
  -d '{"patient_id":"P001","vitals":{"rr":16,"spo2":98,"sbp":120,"hr":75,"temp":37.0,"gcs":15}}' \
  "$BASE/ai/patient/insights"
chk "GET /ai/patient/alerts" \
  -H "X-UniHealth-Role: patient" \
  "$BASE/ai/patient/alerts?patient_id=P001&limit=5"
chk "POST /ai/diagnosis-hints (FHIR P001)" \
  -H "Content-Type: application/json" \
  -H "X-UniHealth-Role: doctor" \
  -d '{"patient_id":"P001","features":{},"use_fhir":true}' \
  "$BASE/ai/diagnosis-hints"
chk "GET /ai/status (metrics)" "$BASE/ai/status"
chk "GET /ai/wards" -H "X-UniHealth-Role: doctor" "$BASE/ai/wards"

wid="$(
  EHR_GATEWAY_URL="$BASE" python3 <<'PY'
import json, os, urllib.request

base = (os.environ.get("EHR_GATEWAY_URL") or "http://localhost:8000").rstrip("/")
req = urllib.request.Request(f"{base}/ai/wards", headers={"X-UniHealth-Role": "doctor"})
with urllib.request.urlopen(req, timeout=15) as r:
    wards = json.load(r)
wid = wards[0]["ward_id"] if wards else ""
print(wid, end="")
PY
)"

if [[ -z "$wid" ]]; then
  echo "Could not resolve a ward id from /ai/wards"
  exit 1
fi

chk "GET /ai/wards/{id}/forecast" -H "X-UniHealth-Role: doctor" "$BASE/ai/wards/${wid}/forecast?hours=12"
chk "GET /ai/wards/{id}/history" -H "X-UniHealth-Role: doctor" "$BASE/ai/wards/${wid}/history?limit=8"

echo "Phase 3 AI smoke OK (ward=$wid)."
