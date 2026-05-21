# Phase 2 — patient mobile app

**Status:** MVP shell implemented in `patient-app/` (Expo / React Native).

## Scope (MVP)

- View own FHIR record summary (Patient, recent Encounters, Observations)
- Medications and vitals from FHIR
- Book / cancel appointments (`/appointments`)
- Grant / revoke consent per facility (`/consent/grant`, `/consent/revoke`, FHIR Consent search)
- Demo patient sign-in aligned with web portal (patient ID + PIN stub)
- Navigation mirroring web sidebar: **My Health**, **Payments**, **Records / More**

## Design alignment

The mobile app reuses the **UniHealth** design system from `frontend/app/src/styles/unihealth.css`:

- Brand green (`#1a8a4a` / `#0a4a26`), light background `#f4f7f4`, card panels with `#dde3dd` borders
- Typography: **Sora**, **DM Serif Display**, **JetBrains Mono** (via Expo Google Fonts)
- Patient hero gradient, quick-action tiles, AI insight panel, KDPA badge — same patterns as `PatientDashboard.tsx`

See [patient-app/README.md](../patient-app/README.md) for run instructions.

## Technical approach

| Piece | Implementation |
| ----- | -------------- |
| Client | Expo ~52 + React Navigation under `patient-app/` |
| API | Same gateway as staff (`/fhir/r5/...`, `/appointments`, `/consent/...`) |
| Auth | Demo session (AsyncStorage) or optional OIDC password grant |
| Consent | `POST /consent/grant` · `POST /consent/revoke` · `GET /fhir/r5/Consent?patient=` |

## Not in MVP (next sprint)

- Native 3D vitals body (`BodyVitalsFigure` is web-only today)
- Full payments (M-Pesa), documents upload, telemedicine deep links
- OIDC authorization code + PKCE (production)
- Push notifications for lab results / appointments

## Dependencies

- [phase2-production.md](phase2-production.md) — production OIDC
- [ehr-api.md](ehr-api.md) — FHIR routes
- [runbook-staging.md](runbook-staging.md) — gateway :8100
