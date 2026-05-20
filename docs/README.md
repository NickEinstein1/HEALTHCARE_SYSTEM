# UniHealth documentation

All project Markdown lives here (except the repository root **[README.md](../README.md)**). Follow **[markdown-style.md](markdown-style.md)** when editing.

## Start here

| Doc | Purpose |
| --- | ------- |
| [getting-started.md](getting-started.md) | Laptop: backend → frontend → sign-in |
| [runbook-staging.md](runbook-staging.md) | Staging compose, LAN access, smoke checks |
| [UniHealth-EHR-Blueprint.md](UniHealth-EHR-Blueprint.md) | Program blueprint |

## Phase 1

| Doc | Purpose |
| --- | ------- |
| [phase1-plan.md](phase1-plan.md) | Scope and repo layout |
| [phase1-complete.md](phase1-complete.md) | Sign-off and verification |
| [phase1-staging.md](phase1-staging.md) | Staging compose and env |
| [phase1-next-steps.md](phase1-next-steps.md) | After Phase 1 |

## Components

| Doc | Purpose |
| --- | ------- |
| [ehr-api.md](ehr-api.md) | Gateway routes, consent, env vars, `/ai` |
| [edge-pipeline.md](edge-pipeline.md) | Kafka consumer |
| [infra.md](infra.md) | Docker Compose (Kafka, Redis, Postgres) |
| [frontend.md](frontend.md) | React SPA, proxy, OIDC pilot |

## Reference

| Doc | Purpose |
| --- | ------- |
| [curl-examples.md](curl-examples.md) | API examples |
| [markdown-style.md](markdown-style.md) | Lint rules (tables, URLs, lists) |
| [benchmarks/phase1-baseline.md](benchmarks/phase1-baseline.md) | k6 baseline |
| [benchmarks/phase1-e2e-verification.md](benchmarks/phase1-e2e-verification.md) | E2E verification notes |

## Lint

From repo root:

```bash
npx --yes markdownlint-cli2 "README.md" "docs/**/*.md"
```
