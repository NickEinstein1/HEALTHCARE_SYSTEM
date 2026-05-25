# Phase 2 — patient mobile app

**Status:** Patient 360 app in `patient-app/` (Expo SDK **54**) — full web portal section parity with fast tab/stack navigation (demo + live FHIR where wired).

## Sections (web `PatientDashboard` parity)

| Web nav group | Mobile |
| --- | --- |
| My Health (dashboard, appts, visits, results, meds, vitals) | **Home** + **Health** hub |
| Payments (cover, contributions, bills, pay) | **Wallet** hub |
| Privacy & consent | **Menu** → Consent |
| My Records (records, documents, profile) | **Menu** hub |
| — | **Messages** (care team; web “Message Doctor”) |

Global search and notifications match web topbar behavior.

## Live API

- FHIR summary, observations, medication requests
- Appointments list / book / cancel / slots
- Consent grant / revoke / search

## Demo / static (same copy as web)

- UniHealth cover balance, claims, contributions, bills, M-PESA / M-TIBA flows
- Visit history rows, health record problems/allergies, documents list
- AI insights, flagged lab results, refill reminders

## Not yet native

- 3D vitals body (`BodyVitalsFigure` — web only)
- Production OIDC (PKCE), push notifications, PDF open/share
- Backend persistence for messages and payments

See [patient-app/README.md](../patient-app/README.md).
