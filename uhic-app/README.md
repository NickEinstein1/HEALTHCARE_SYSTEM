# UHIC App

Standalone **UHIC** mobile app — Kenya national health insurance (Social Health Authority / SHIF).

Aligned with `docs/UniHealth Insurance Cover 2.0.docx`:

- Insurance mathematics (SHIF 2.75% floor/cap, risk-rated premiums)
- Risk analytics (provider scorecards, fraud bands 0–100)
- Actuarial science (IBNR chain-ladder, loss/combined ratio, ECCIF forecast)
- Claims structurally bound to `clinical.encounters` via `encounter_id` FK

## Stack

- **Expo 54** + React Native (same pattern as `patient-app/`)
- **API:** `ehr-api` gateway on `:8100` — `/insurance/*`, `/audit/*`
- **Auth (pilot):** `X-UniHealth-Role` + `X-Facility-Id` headers (Keycloak in production)

## Quick start

```bash
cd uhic-app
cp .env.example .env
npm install
npx expo start
```

Set `EXPO_PUBLIC_API_BASE_URL` to your gateway:

| Environment | URL |
|-------------|-----|
| iOS Simulator / web | `http://localhost:8100` |
| Android emulator | `http://10.0.2.2:8100` |
| Physical device (LAN) | `http://192.168.x.x:8100` |

Start the API first:

```bash
cd ehr-api && uvicorn app.main:app --reload --port 8100
```

## Tabs

| Tab | Screens |
|-----|---------|
| **Dashboard** | Scheme KPIs, loss ratio, IBNR, flagged claims |
| **Members** | EHR-linked members, underwriting reference |
| **Claims** | Submit/adjudicate with fraud scoring |
| **Actuarial** | Reserves, ECCIF forecast, premium quotes |
| **Risk** | Fraud trends, provider scorecards |
| **Menu** | Session, sign out |

## Roles

`claims_adjudicator` · `underwriter` · `scheme_finance` · `compliance_auditor` · `broker` · `admin`

## Cross-app sync loop

UHIC is the **fastest-sync client** (claims every **5s**). Patient app and web portal poll **`GET /insurance/sync`** every **8s**.

```
uhic-app (adjudicate) ──► ehr-api sync_version ──► patient-app / web portal
         ▲                        │
         └── billing invoices ◄───┘ (M-Pesa payments bump sync)
```

| App | Endpoint | Interval |
|-----|----------|----------|
| **uhic-app** | `/insurance/sync?include_summary=true` | 5s claims · 15s aux |
| **patient-app** | `/insurance/sync?patient_id=` | 8s |
| **web UHIC** | `/insurance/sync?include_summary=true` | 5s |
| **web patient** | `/insurance/sync?patient_id=` | 8s on cover/bills |

Adjudicated claims auto-update billing invoices (`bridge_claim_to_billing`).

- Web module: `frontend/app` → `/modules/uhic`
- Backend: `ehr-api/app/insurance/`, `ehr-api/app/insurance_service.py`
- Schema reference: `scripts/init_uhic_schema.sql`
