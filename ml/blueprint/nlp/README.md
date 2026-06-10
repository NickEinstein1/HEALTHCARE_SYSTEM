# NLP clinical documentation (Blueprint — planned)

## Objective

Reduce documentation burden via **draft** notes from FHIR observations, meds, and optional speech-to-text — clinician must review and sign.

## Out of scope for AI Assist pilot

- `ehr-api` `/ai` does not ingest free-text notes or audio.
- No automatic ICD coding from narrative.

## Target integration points

| Component | Role |
|-----------|------|
| FHIR `DocumentReference` | Store draft + signed note |
| `POST /ai/nlp/draft-note` (future) | Structured sections only |
| Audit | Same `ai_audit_log` pattern as diagnosis hints |

## Safety

- Watermark all drafts as AI-generated.
- Block auto-submit to legal record without human attestation.
