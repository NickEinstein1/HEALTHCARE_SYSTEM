#!/usr/bin/env bash
# Step 3: verify AI Assist on staging (after run_staging.sh + seed_staging_db.sh).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BASE="${EHR_GATEWAY_URL:-http://localhost:8100}"
BASE="${BASE%/}"

echo "=== AI staging verification @ $BASE ==="

echo "--- Health ---"
curl -sf "$BASE/health" >/dev/null && echo "OK /health"

echo "--- Phase 3 smoke ---"
EHR_GATEWAY_URL="$BASE" "$ROOT/scripts/smoke_phase3_ai.sh"

echo "--- FHIR P001 observations ---"
OBS="$(curl -sf -H "X-Facility-Id: FAC-A" "$BASE/fhir/r5/Patient/P001/observations?limit=20" || true)"
if echo "$OBS" | grep -q 'OBS-P001'; then
  echo "OK P001 has seeded observations"
else
  echo "WARN: expected OBS-P001-* in observations — run ./scripts/seed_staging_db.sh"
fi

echo "--- FHIR-enriched diagnosis hints ---"
HINTS="$(curl -sf -X POST "$BASE/ai/diagnosis-hints" \
  -H "Content-Type: application/json" \
  -H "X-UniHealth-Role: doctor" \
  -d '{"patient_id":"P001","features":{},"use_fhir":true}')"
if echo "$HINTS" | grep -q '"fhir_enriched":true'; then
  echo "OK diagnosis-hints fhir_enriched=true"
else
  echo "WARN: fhir_enriched not true — check Postgres seed + gateway restart"
fi
if echo "$HINTS" | grep -q 'differentials'; then
  echo "OK diagnosis-hints returned differentials"
fi

echo "--- Risk score (if enabled on gateway) ---"
RS_CODE="$(curl -s -o /tmp/unihealth-risk.json -w "%{http_code}" -X POST "$BASE/ai/risk-score" \
  -H "Content-Type: application/json" \
  -H "X-UniHealth-Role: doctor" \
  -d '{"patient_id":"P001","use_fhir":true}')"
if [ "$RS_CODE" = "200" ]; then
  grep -q risk_band /tmp/unihealth-risk.json && echo "OK /ai/risk-score"
elif [ "$RS_CODE" = "404" ]; then
  echo "SKIP /ai/risk-score (EHR_AI_RISK_SCORE_ENABLED=false — rebuild gateway to enable)"
else
  echo "FAIL /ai/risk-score HTTP $RS_CODE"
  head -c 200 /tmp/unihealth-risk.json || true
  exit 1
fi

echo ""
echo "AI staging verification complete."
