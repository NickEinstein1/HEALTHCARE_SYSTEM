# Phase 2 — patient mobile app MVP (planned)

**Not started in code yet.** Hospital onboarding and production gateway should be stable first.

## Scope (MVP)

- View own FHIR record summary (Patient, recent Encounters, Observations)
- Grant / revoke consent per facility (FHIR `Consent` + legacy endpoints)
- OIDC login as Keycloak `patient` role
- Deep link placeholder for telemedicine (external URL)

## Technical approach

| Piece | Direction |
| ----- | --------- |
| Client | React Native or Flutter monorepo under `patient-app/` |
| API | Same gateway as staff (`/fhir/r5/...`, `/auth/status`) |
| Auth | OIDC authorization code + PKCE; no `X-UniHealth-Role` |
| Consent | `POST /fhir/r5/Consent` with patient bearer token |

## Stub

`patient-app/README.md` points here until the app shell is created.

## Dependencies

- [phase2-production.md](phase2-production.md) — production OIDC
- [ehr-api.md](ehr-api.md) — FHIR routes
- FHIR Consent search: `GET /fhir/r5/Consent?patient={id}`
