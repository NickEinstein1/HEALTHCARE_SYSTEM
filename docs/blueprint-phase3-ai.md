# Blueprint Phase 3 — Advanced AI (strategic program)

This document scopes **national-scale AI** from [UniHealth-EHR-Blueprint.md](UniHealth-EHR-Blueprint.md) § Phase 3. It is separate from the in-repo **AI Assist pilot** (`/ai/*`, rules `rule-v2.1.0`).

## Relationship to the pilot

| Layer | Repo location | Status |
|-------|---------------|--------|
| Rules CDS + NEWS2 + ward pilot | `ehr-api/app/ai/`, `frontend/app` | **Implemented** (pilot) |
| Tier C ML training/export | `ml/` | **Scaffold** — train/eval; optional API serve |
| Federated learning | `ml/blueprint/federated/` | **Planned** — architecture only |
| NLP clinical documentation | `ml/blueprint/nlp/` | **Planned** — architecture only |
| Imaging AI at edge | `ml/blueprint/imaging/` | **Planned** — architecture only |

## Federated learning (readmission / deterioration)

- **Goal:** Train models across hospitals without centralizing raw PHI.
- **Stack (target):** Flower or TensorFlow Federated on de-identified feature batches; aggregate weights at regional control plane.
- **Prerequisites:** Contract v1.0 exports, facility labels, ethics approval, model cards.
- **Pilot path today:** Central export JSONL → `ml/train/train_deterioration.py` (single-site).

See [ml/blueprint/federated/README.md](../ml/blueprint/federated/README.md).

## NLP (auto-documentation / scribe)

- **Goal:** Draft progress notes and discharge summaries from structured FHIR + dictated audio (with clinician attestation).
- **Constraints:** No autonomous signing; KDPA audit; language models hosted in approved region.
- **Not in pilot:** Free-text notes are excluded from `/ai` routes today.

See [ml/blueprint/nlp/README.md](../ml/blueprint/nlp/README.md).

## Imaging AI (edge)

- **Goal:** Triage chest X-ray / CT findings at edge nodes; FHIR `DiagnosticReport` linkage.
- **Stack (target):** NVIDIA Triton + TensorRT on edge GPU; DICOM ingest via hospital PACS bridge.
- **Not in pilot:** No imaging inference in `ehr-api`.

See [ml/blueprint/imaging/README.md](../ml/blueprint/imaging/README.md).

## Governance (all tracks)

1. Clinical safety officer sign-off per model version.
2. KDPA impact assessment before national toggle.
3. Assist-only UX — no autonomous diagnosis messaging.

## Messaging

> **Rules-based CDS pilot, not diagnostic AI.** Blueprint Phase 3 capabilities require separate delivery programs and validation.
