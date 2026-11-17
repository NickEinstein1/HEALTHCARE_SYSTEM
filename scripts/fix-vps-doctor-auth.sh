#!/usr/bin/env bash
# Fix doctor dashboard 403/401/WS issues on VPS after OIDC sign-in works.
# Run on the VPS as root from /opt/unihealth:
#   bash scripts/fix-vps-doctor-auth.sh
set -euo pipefail

cd /opt/unihealth

if [ ! -f infra/.env.vps ]; then
  echo "Missing infra/.env.vps"
  exit 1
fi

# shellcheck disable=SC1091
set -a
source infra/.env.vps
set +a

if [ -z "${EHR_POSTGRES_DSN:-}" ] || [[ "$EHR_POSTGRES_DSN" == *"YOUR_REF"* ]]; then
  echo "EHR_POSTGRES_DSN is missing or still a placeholder in infra/.env.vps"
  exit 1
fi

echo "==> Seed treatment consents (fixes FHIR 403 Consent denied)"
if command -v psql >/dev/null 2>&1; then
  psql "$EHR_POSTGRES_DSN" -f scripts/seed_pilot_consents.sql
else
  apt-get update -qq && apt-get install -y -qq postgresql-client
  psql "$EHR_POSTGRES_DSN" -f scripts/seed_pilot_consents.sql
fi

echo "==> Ensure nginx API proxies to :8100 and upgrades WebSockets"
if [ -f /etc/nginx/sites-available/unihealth ]; then
  if ! grep -q 'location /ai/ws/' /etc/nginx/sites-available/unihealth; then
    echo "NOTE: add location /ai/ws/ with Upgrade headers (see infra/nginx/vps-tls.conf.example)"
  fi
  if grep -q 'proxy_pass http://127.0.0.1:8088;' /etc/nginx/sites-available/unihealth \
    && grep -q 'server_name api.unihealth360.com' /etc/nginx/sites-available/unihealth; then
    echo "WARNING: api host may still proxy to web :8088 — must be :8100"
  fi
fi

echo "==> Rebuild gateway + web with risk-score + WS fixes"
docker compose -f infra/docker-compose.vps.yml --env-file infra/.env.vps up -d --build gateway web

echo "==> Wait for gateway"
for i in $(seq 1 30); do
  code=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:8100/health || true)
  if [ "$code" = "200" ]; then
    echo "gateway healthy"
    break
  fi
  sleep 2
done

echo "==> Spot-check with doctor token"
TOKEN=$(curl -sS -X POST "https://${AUTH_HOSTNAME}/realms/unihealth/protocol/openid-connect/token" \
  -H 'Content-Type: application/x-www-form-urlencoded' \
  --data 'grant_type=password&client_id=unihealth-spa&username=doctor&password=Changeme1!' \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["access_token"])')

curl -sS -o /tmp/sum.json -w "summary:%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" -H "X-Facility-Id: FAC-A" \
  "https://${API_HOSTNAME}/fhir/r5/Patient/P001/summary?encounters=5"
head -c 120 /tmp/sum.json; echo

curl -sS -o /dev/null -w "anomalies:%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "https://${API_HOSTNAME}/ai/anomalies"

curl -sS -o /dev/null -w "providers:%{http_code}\n" \
  -H "Authorization: Bearer $TOKEN" \
  "https://${API_HOSTNAME}/ai/clinical-assessment/providers"

echo "Done. Hard-refresh https://${APP_HOSTNAME}/ and sign in as doctor / Changeme1!"
