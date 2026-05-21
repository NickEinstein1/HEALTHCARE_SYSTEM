# Phase 2 — production deployment

Use this when moving from **laptop staging** to a **pilot production** environment. Hospital-specific edge rollout comes later.

## 1. Environment profile

Set on the gateway (Docker, K8s ConfigMap, or secrets):

| Variable | Production value |
| -------- | ---------------- |
| `EHR_DEPLOYMENT_ENV` | `production` |
| `EHR_CONSENT_MODE` | `strict` (auto-set when deployment env is production) |
| `EHR_OIDC_ENABLED` | `true` |
| `EHR_OIDC_ALLOW_HEADER_FALLBACK` | `false` |
| `EHR_OIDC_ISSUER_URL` | `https://auth.<domain>/realms/unihealth` |
| `EHR_OIDC_JWKS_URL` | Issuer JWKS URL |
| `EHR_OIDC_AUDIENCE` | Gateway client id / audience |

Confirm:

```bash
curl -s https://api.<domain>/auth/status | jq .
# Expect: "deployment_env": "production", "consent_mode": "strict", "header_fallback": false
```

## 2. TLS termination

**Option A — NGINX on VM** (see [infra/nginx/unihealth-gateway.conf.example](../infra/nginx/unihealth-gateway.conf.example)):

- Terminate TLS at NGINX; proxy to gateway on `127.0.0.1:8100`.
- Use hospital or national PKI / Let's Encrypt.

**Option B — Kubernetes Ingress** (see [deploy/k8s/base/ingress.yaml](../deploy/k8s/base/ingress.yaml)):

- `kubectl apply -k deploy/k8s/base`
- Install cert-manager for TLS secrets.

**Option C — Docker compose overlay**:

```bash
cp infra/.env.production.example infra/.env.production
# edit secrets and OIDC URLs
docker compose -f infra/docker-compose.staging.yml \
  -f infra/docker-compose.production.yml \
  --env-file infra/.env.production up -d --build
```

## 3. Keycloak hardening (OIDC)

Before go-live:

- Disable **direct access grants** / resource-owner password for public clients in production realms.
- Require **HTTPS** redirect URIs only.
- Rotate `Changeme1!` pilot passwords; use per-operator accounts.
- Map roles to `unihealth_role` or realm roles (`doctor`, `nurse`, `admin`, `patient`).
- Plan **mTLS** between edge nodes and regional gateway when hospital VPN is available (not required for first regional deploy).

## 4. Consent

- Production uses **strict** mode: reads need active consent for `(patient, facility, scope)` unless `scope=emergency`.
- Grant via legacy API or FHIR:

```bash
curl -s -X POST https://api.<domain>/fhir/r5/Consent \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d @consent-example.json
```

See FHIR mapping in `ehr-api/app/consent_fhir.py`.

## 5. Smoke

```bash
EHR_GATEWAY_URL=https://api.<domain> ./scripts/smoke_phase2.sh
```

## 6. Observability (recommended before hospitals)

- Prometheus scrape gateway `/metrics` if enabled
- Centralize logs (gateway + consumer + Kafka)
- Alert on gateway health and consumer lag

Hospital onboarding checklist will extend this doc with per-site K3s and facility registry steps.
