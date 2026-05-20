#!/usr/bin/env bash
# Phase 1 gateway smoke — read path + consent (gateway must be running with data).
# Usage:
#   ./scripts/smoke_phase1.sh
#   EHR_GATEWAY_URL=http://localhost:8100 ./scripts/smoke_phase1.sh

set -euo pipefail

BASE="${EHR_GATEWAY_URL:-http://localhost:8000}"
BASE="${BASE%/}"
PATIENT="${SMOKE_PATIENT_ID:-P001}"
FACILITY="${SMOKE_FACILITY_ID:-FAC-A}"

chk() {
  local name="$1"
  shift
  local code
  code="$(curl -s -o /tmp/unihealth-p1-smoke.json -w "%{http_code}" "$@")"
  echo "$name -> HTTP $code"
  case "$code" in
    200|202) ;;
    *)
      echo "  body (first 300 bytes):"
      head -c 300 /tmp/unihealth-p1-smoke.json || true
      echo ""
      exit 1
      ;;
  esac
}

chk "GET /health" "$BASE/health"

chk "GET patient summary (1st — may be postgres-miss)" \
  -H "X-Facility-Id: $FACILITY" \
  "$BASE/fhir/r5/Patient/${PATIENT}/summary?encounters=5"

cache1="$(curl -s -D - -o /dev/null -H "X-Facility-Id: $FACILITY" \
  "$BASE/fhir/r5/Patient/${PATIENT}/summary?encounters=5" | tr -d '\r' | awk -F': ' 'tolower($1)=="x-cache-source"{print $2; exit}')"
chk "GET patient summary (2nd — warm cache)" \
  -H "X-Facility-Id: $FACILITY" \
  "$BASE/fhir/r5/Patient/${PATIENT}/summary?encounters=5"
cache2="$(curl -s -D - -o /dev/null -H "X-Facility-Id: $FACILITY" \
  "$BASE/fhir/r5/Patient/${PATIENT}/summary?encounters=5" | tr -d '\r' | awk -F': ' 'tolower($1)=="x-cache-source"{print $2; exit}')"
echo "  X-Cache-Source: first=${cache1:-?} second=${cache2:-?}"
if [ -n "$cache2" ] && [ "$cache2" != "redis-hit" ]; then
  echo "  WARN: expected redis-hit on second summary request (is Redis up?)"
fi

chk "POST consent/grant" -X POST "$BASE/consent/grant" \
  -H "Content-Type: application/json" \
  -d "{\"patient_id\":\"${PATIENT}\",\"facility_id\":\"${FACILITY}\",\"scope\":\"treatment\"}"

chk "GET observations" -H "X-Facility-Id: $FACILITY" \
  "$BASE/fhir/r5/Patient/${PATIENT}/observations?limit=5"

chk "GET medication-requests" -H "X-Facility-Id: $FACILITY" \
  "$BASE/fhir/r5/Patient/${PATIENT}/medication-requests?limit=5"

chk "GET /metrics/json" "$BASE/metrics/json"

echo "Phase 1 smoke OK (patient=${PATIENT}, facility=${FACILITY})."
