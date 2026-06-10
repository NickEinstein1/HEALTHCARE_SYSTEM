# Facility-confirmed outcome labels

Upload CSV rows to override proxy labels in `export_ml_features_staging.sql`.

## CSV columns

| Column | Required | Values |
|--------|----------|--------|
| `patient_id` | yes | FHIR warm-store id (e.g. `P001`) |
| `facility_id` | yes | e.g. `FAC-A` |
| `outcome_deterioration_7d` | one of outcomes | `0` or `1` |
| `outcome_readmission_30d` | optional | `0` or `1` |
| `outcome_icu_transfer_30d` | optional | `0`, `1`, or empty |
| `effective_day` | optional | `YYYY-MM-DD` (defaults to today) |

## Import

```bash
export EHR_AI_CENSUS_INTEGRATION_SECRET=your-secret
./scripts/import_facility_labels.sh ml/labels/facility_labels_template.csv
```

Or apply via seed: `scripts/seed_staging_data.sql` (demo rows).

## Governance

Labels must be approved by the facility data steward. Do not use proxy vitals labels for regulatory submissions.
