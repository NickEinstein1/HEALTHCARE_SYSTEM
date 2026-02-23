# Phase 1 – What’s Next

## Done

- [x] Infra (Kafka, Redis, Postgres)
- [x] Edge FHIR gateway (patient + encounters, Redis → Postgres)
- [x] Event pipeline (Kafka consumer → Postgres/Redis)
- [x] Sample producer + seed data
- [x] k6 load test (P95 &lt;50 ms target)
- [x] Venvs + run script
- [x] **Pilot EMR ingestion API** – POST /fhir/r5/Patient and POST /fhir/r5/Encounter (ehr-api → Kafka)

## Recommended next steps (in order)

| # | Item | Why |
|---|------|-----|
| **1** | **Pilot EMR ingestion API** | Let a “pilot hospital” push Patient/Encounter via HTTP → Kafka instead of only the script. Enables testing the full path: EMR → Kafka → consumer → gateway. |
| **2** | **Simple consent check** | Before returning summary, check consent (e.g. same facility or emergency). Store: patient_id, scope, facility_id; gateway checks on read. |
| **3** | **Observations + medications** | Add `ehr.observation` and `ehr.medication` topics, consumer logic, and optional gateway fields (e.g. last N observations). |
| **4** | **Run and lock P95** | Run full flow + k6 locally; document actual P95; add latency metric in gateway (e.g. Prometheus or response header). |
| **5** | **CI** | GitHub Actions: lint (ruff/black), test (pytest for gateway + consumer), optional k6 on schedule. |

## If you have only 1–2 hours now

- Do **#2** (consent): add a simple consent store and check in the gateway before returning patient summary (e.g. allow by facility or emergency).

---

*After that:* observations/medications (#3), then measure and CI (#4–5).
