# Go-live checklist — Web + Patient app

Facility pilot path for **frontend web** and **patient-app** only. UHIC mobile and multi-hospital edge come later.

## Prerequisites

- [ ] Domain + TLS for API (`https://api.<domain>`) and web (`https://app.<domain>`)
- [ ] Postgres + Redis running (`EHR_INFRA_OPTIONAL=false`)
- [ ] Schema applied: `ehr-api/schema.sql` (includes `uhic_*` tables + billing `encounter_id`/`claim_id`) + seed (`scripts/seed_data.py`)
- [ ] Secrets only in server env (never in git or mobile bundles)

## 1. API gateway

```bash
# infra/.env.production (from infra/.env.production.example)
EHR_DEPLOYMENT_ENV=production
EHR_OIDC_ENABLED=true
EHR_OIDC_ALLOW_HEADER_FALLBACK=false
EHR_OIDC_ISSUER_URL=https://auth.<domain>/realms/unihealth
EHR_OIDC_JWKS_URL=…/protocol/openid-connect/certs
EHR_OTP_SIMULATE=false
EHR_PATIENT_SESSION_SECRET=<long-random>
EHR_MPESA_SIMULATE=false   # when live paybill ready
```

Verify:

```bash
curl -s https://api.<domain>/auth/status | jq .
# production_profile: true, oidc_enabled: true, header_fallback: false, otp_simulate: false
```

Smoke:

```bash
EHR_GATEWAY_URL=https://api.<domain> ./scripts/smoke_go_live.sh
```

## 2. Keycloak

- [ ] Realm `unihealth`, client `unihealth-spa` (public, PKCE preferred)
- [ ] Disable direct access grants for public clients when PKCE is live
- [ ] Roles: `patient`, `doctor`, `nurse`, `admin`, `billing`, …
- [ ] Patient users: claim `unihealth_role=patient` and `patient_id=P00x`
- [ ] HTTPS redirect URIs only

## 3. Web app (`frontend/app`)

```bash
# .env.production (from .env.production.example)
VITE_API_BASE_URL=https://api.<domain>
VITE_OIDC_ENABLED=true
VITE_OIDC_ISSUER=https://auth.<domain>/realms/unihealth
VITE_OIDC_CLIENT_ID=unihealth-spa

npm ci && npm run build
# Serve dist/ behind TLS (nginx / CDN)
```

- [ ] Staff sign-in uses OIDC Bearer (no role-header-only access)
- [ ] Patient portal cover/claims load from `/insurance/sync`
- [ ] Billing M-Pesa uses server credentials only

## 4. Patient app (`patient-app`)

```bash
# .env (production build profile)
EXPO_PUBLIC_API_BASE_URL=https://api.<domain>
EXPO_PUBLIC_OIDC_ENABLED=true
EXPO_PUBLIC_OIDC_ISSUER=https://auth.<domain>/realms/unihealth
EXPO_PUBLIC_OIDC_CLIENT_ID=unihealth-spa
EXPO_PUBLIC_DEFAULT_PATIENT_ID=P001
```

Auth flow (implemented):

1. Sign-in → `POST /auth/patient/otp/request`
2. MFA → `POST /auth/patient/otp/verify`
3. If OIDC on → Keycloak password grant (username=`patient_id`, password=PIN)
4. If OIDC off (pilot) → gateway issues patient session JWT
5. API calls send `Authorization: Bearer …` + `X-Patient-Id`

- [ ] OTP not shown in API responses (`otp_simulate=false`)
- [ ] SMS provider wired (replace simulate path in `patient_auth.py`)
- [ ] Store / MDM build with production API URL

## 5. Data & payments

- [x] Postgres persistence for billing + UHIC (write-through when Postgres pool is up; in-memory fallback when `EHR_INFRA_OPTIONAL=true`)
- [x] Production profile forces `EHR_MPESA_SIMULATE=false` (mirrors OTP)
- [x] Patient routes bind `patient_id` to JWT/session (reject mismatched `X-Patient-Id`)
- [x] M-Pesa receipt idempotency (unique index + in-memory replay return)
- [ ] M-Pesa live paybill + callback URL on API host
- [ ] Daily DB backups
- [ ] SMS OTP provider (replace simulate path)

## Security gates (facility pilot)

| Gate | Status |
|------|--------|
| Fail-open async DB writes on financial paths | Mitigated: `persist_now` raises when infra required; payment endpoints → 503 |
| Simulated M-Pesa durable forgery in production | Mitigated: production forces `mpesa_simulate=false` |
| Production without OIDC / header-only staff auth | Mitigated: production rejects role-header-only; requires OIDC or strong session secret |
| Patient IDOR via `X-Patient-Id` / path params | Mitigated: `require_bound_patient_id` on billing + insurance |
| C2B receipt replay | Mitigated: payment + mpesa txn idempotent; unique receipt indexes |
| C2B default patient P001 | Mitigated: map via INV-*/P00x/MSISDN; no silent default |
| Split invoice/payment TX | Mitigated: `persist_payment_bundle` single transaction |
| UHIC audit hash verify on load | Mitigated: prev_hash pointer integrity on hydrate |
| OTP SMS flooding | Mitigated: per-IP / phone / patient rate limit |
| Live M-Pesa + SMS OTP + TLS/Keycloak | Ops remaining |

## 6. Acceptance tests

| Flow | Pass? |
|------|-------|
| Staff OIDC sign-in → patient summary | |
| Patient OTP → session → home loads FHIR | |
| Book / cancel appointment | |
| Pay contribution (M-Pesa) | |
| Coverage / claims sync (`/insurance/sync`) | |
| Consent grant / revoke | |

## Pilot vs public

| Level | Requirements |
|-------|----------------|
| **Facility pilot** | TLS, OIDC or patient session, OTP, Postgres for clinical, invited users |
| **Public stores** | All of above + SMS OTP, no simulate flags, legal pages, support runbook, billing/UHIC persisted |

## Related

- [vps-production-deploy.md](vps-production-deploy.md) — online VPS (Keycloak + API + web + Supabase)
- [phase2-production.md](phase2-production.md)
- [phase2-patient-app.md](phase2-patient-app.md)
- [ehr-api.md](ehr-api.md)
