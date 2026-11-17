-- Grant treatment consent for pilot patients at FAC-A / FAC-B.
-- Required when EHR_CONSENT_MODE=strict and the SPA sends X-Facility-Id: FAC-A.
--
-- Usage (VPS / local):
--   psql "$EHR_POSTGRES_DSN" -f scripts/seed_pilot_consents.sql

INSERT INTO consents (patient_id, facility_id, scope, active)
SELECT v.patient_id, v.facility_id, v.scope, true
FROM (VALUES
  ('P001', 'FAC-A', 'treatment'),
  ('P001', 'FAC-B', 'treatment'),
  ('P002', 'FAC-A', 'treatment'),
  ('P002', 'FAC-B', 'treatment'),
  ('P003', 'FAC-A', 'treatment'),
  ('P003', 'FAC-B', 'treatment')
) AS v(patient_id, facility_id, scope)
WHERE EXISTS (SELECT 1 FROM patients p WHERE p.id = v.patient_id)
  AND NOT EXISTS (
    SELECT 1 FROM consents c
    WHERE c.patient_id = v.patient_id
      AND c.facility_id = v.facility_id
      AND c.scope = v.scope
      AND c.active = true
  );
