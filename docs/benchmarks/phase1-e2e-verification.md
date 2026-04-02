# Phase 1 E2E Verification (HTTP ingest → Kafka → Consumer → Gateway)

Date: 2026-03-26

## Goal

Validate the pilot “full path” works end-to-end for all Phase 1 core resources:

- Patient
- Encounter
- Observation
- MedicationRequest

Without relying on DB seed scripts.

## Environment (local)

- Gateway (ingest + read): `http://localhost:8100`
- Consumer group (e2e run): `edge-pipeline-e2e-1774489108`
- Consumer log: `./.consumer-e2e-latest-1774489108.log`

## Steps & Results

1. Start/attach an edge consumer reading from Kafka.
   - Output confirmed it subscribed to: `ehr.patient, ehr.encounter, ehr.observation, ehr.medication_request`.

2. Ingest new resources via gateway HTTP endpoints.
   - `POST /fhir/r5/Patient` → accepted (202)
     - `P005`
   - `POST /fhir/r5/Encounter` → accepted (202)
     - `E010` (facility `FAC-A`)
   - `POST /fhir/r5/Observation` → accepted (202)
     - `O010`
   - `POST /fhir/r5/MedicationRequest` → accepted (202)
     - `M010`

3. Poll gateway read endpoints until the new resources appear.
   - `GET /fhir/r5/Patient/P005/summary?encounters=5&scope=treatment` → contains `E010` (found on try #1)
   - `GET /fhir/r5/Patient/P005/observations?limit=10&scope=treatment` → contains `O010` (found on try #1)
   - `GET /fhir/r5/Patient/P005/medication-requests?limit=10&scope=treatment` → contains `M010` (found on try #1)

4. Verify Postgres warm store contains the ingested rows.
   - `patients`: `P005` exists
   - `encounters`: `E010` exists
   - `observations`: `O010` exists
   - `medication_requests`: `M010` exists

## Performance snapshot (from the latest k6 run)

- Baseline doc: `docs/benchmarks/phase1-baseline.md`
- Latest P95 (gateway @ `localhost:8100`): `30.43ms` (threshold `p(95)<50` PASS)

## Note

This verification ran against the already-started local infra (Kafka/Redis/Postgres) because Docker control is not available from the execution environment used for CI-style scripting.
