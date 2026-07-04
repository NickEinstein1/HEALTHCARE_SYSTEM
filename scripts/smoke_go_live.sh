#!/usr/bin/env bash
# Smoke checks for web + patient-app go-live readiness.
# Usage: EHR_GATEWAY_URL=http://127.0.0.1:8100 ./scripts/smoke_go_live.sh
set -euo pipefail

BASE="${EHR_GATEWAY_URL:-http://127.0.0.1:8100}"
BASE="${BASE%/}"
FAIL=0

ok() { echo "  OK  $*"; }
bad() { echo "  FAIL $*"; FAIL=1; }

echo "Go-live smoke → $BASE"

# Health
if curl -sf "$BASE/health" | grep -q ok; then
  ok "/health"
else
  bad "/health"
fi

# Auth status
STATUS=$(curl -sf "$BASE/auth/status" || true)
if [[ -n "$STATUS" ]]; then
  ok "/auth/status → $STATUS"
else
  bad "/auth/status"
fi

# Patient OTP request (pilot)
OTP_REQ=$(curl -sf -X POST "$BASE/auth/patient/otp/request" \
  -H "Content-Type: application/json" \
  -d '{"patient_id":"P001","phone":"0712345678"}' || true)
if echo "$OTP_REQ" | grep -q '"status"'; then
  ok "OTP request"
  CODE=$(echo "$OTP_REQ" | python3 -c "import sys,json; print(json.load(sys.stdin).get('debug_otp',''))" 2>/dev/null || true)
  if [[ -n "$CODE" ]]; then
    VERIFY=$(curl -sf -X POST "$BASE/auth/patient/otp/verify" \
      -H "Content-Type: application/json" \
      -d "{\"patient_id\":\"P001\",\"phone\":\"0712345678\",\"code\":\"$CODE\"}" || true)
    TOKEN=$(echo "$VERIFY" | python3 -c "import sys,json; print(json.load(sys.stdin).get('access_token',''))" 2>/dev/null || true)
    if [[ -n "$TOKEN" ]]; then
      ok "OTP verify → patient session token"
      ME=$(curl -sf "$BASE/auth/me" -H "Authorization: Bearer $TOKEN" || true)
      if echo "$ME" | grep -q patient; then
        ok "/auth/me with patient session"
      else
        bad "/auth/me with patient session → $ME"
      fi
      SYNC=$(curl -sf "$BASE/insurance/sync?patient_id=P001&since_version=0" \
        -H "Authorization: Bearer $TOKEN" \
        -H "X-Patient-Id: P001" || true)
      if echo "$SYNC" | grep -q sync_version; then
        ok "/insurance/sync with patient session"
      else
        bad "/insurance/sync → $SYNC"
      fi
    else
      # OIDC mode returns no access_token from OTP verify
      if echo "$VERIFY" | grep -q oidc; then
        ok "OTP verify (OIDC MFA mode — client must use Keycloak token)"
      else
        bad "OTP verify (no token) → $VERIFY"
      fi
    fi
  else
    ok "OTP request (no debug_otp — production simulate off)"
  fi
else
  bad "OTP request → $OTP_REQ"
fi

# Header pilot still works when OIDC off
HDR=$(curl -sf "$BASE/insurance/uhic/summary" -H "X-UniHealth-Role: admin" || true)
if echo "$HDR" | grep -q active_members; then
  ok "UHIC summary (role header / staff)"
else
  bad "UHIC summary"
fi

echo
if [[ "$FAIL" -eq 0 ]]; then
  echo "All go-live smoke checks passed."
  exit 0
fi
echo "Some checks failed."
exit 1
