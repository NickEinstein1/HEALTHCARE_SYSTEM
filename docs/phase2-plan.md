# Phase 2 plan (in progress)

**Hospital onboarding is deferred.** This phase delivers the **national platform pattern** so facilities can be enrolled later without rework.

## Status

| Workstream | Status | Notes |
| ---------- | ------ | ----- |
| Production deploy (K8s, TLS, compose overlay) | **Scaffolded** | `deploy/k8s/base/`, `infra/docker-compose.production.yml`, nginx example |
| Production OIDC + strict consent profile | **Implemented** | `EHR_DEPLOYMENT_ENV=production` |
| FHIR `Consent` API | **Implemented** | `GET/POST /fhir/r5/Consent`, search by patient |
| National analytics pipeline | **Scaffolded** | Topic `ehr.analytics.aggregate`, `analytics-pipeline/` consumer |
| Patient mobile app MVP | **Planned** | See [phase2-patient-app.md](phase2-patient-app.md) |
| Per-hospital K3s edge onboarding | **Later** | Registry, facility IDs, site agents |

## What was added in the repo

### API (`ehr-api`)

- `EHR_DEPLOYMENT_ENV` — `development` | `staging` | `production`
- Production profile: `consent_mode=strict`, `oidc_allow_header_fallback=false`, OIDC required when issuer is set
- FHIR Consent: `GET /fhir/r5/Consent?patient=`, `GET /fhir/r5/Consent/{id}`, `POST /fhir/r5/Consent`
- `app/analytics.py` — emit aggregate Kafka events (no patient ids)

### Deploy

- `deploy/k8s/base/` — gateway + consumer Deployments, Ingress, ConfigMap
- `infra/nginx/unihealth-gateway.conf.example` — TLS reverse proxy
- `infra/.env.production.example` — production env template

### Analytics

- `analytics-pipeline/consumer/main.py` — reads `ehr.analytics.aggregate`
- Kafka topic created in staging `kafka-init`

### Verify

```bash
cd ehr-api && PYTHONPATH=. pytest tests/test_phase2_config.py tests/test_fhir_consent.py -q
./scripts/smoke_phase2.sh   # after gateway is up
```

## Next when you onboard hospitals

1. Issue facility IDs (`FAC-*`) and edge node credentials.
2. Deploy K3s agent per site (gateway + local Redis) using `deploy/k8s/base` as a template.
3. Register OIDC clients per hospital (no shared password grant).
4. Enable strict consent + FHIR Consent for each patient–facility pair.
5. Connect EMR adapters to ingest topics; enable aggregate emitters per ward metrics.

## Related

- [phase2-production.md](phase2-production.md) — OIDC and TLS checklist
- [phase2-analytics.md](phase2-analytics.md) — aggregate event contract
- [phase2-patient-app.md](phase2-patient-app.md) — mobile MVP scope
- [phase1-next-steps.md](phase1-next-steps.md) — original priority list
