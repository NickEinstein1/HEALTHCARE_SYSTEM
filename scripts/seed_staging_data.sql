-- Staging seed: patients, encounters, P001 observations + meds (AI Assist demo).
-- Applied via: docker compose exec -T postgres psql -U ehr -d ehr < scripts/seed_staging_data.sql

INSERT INTO patients (id, nhi_number, family_name, given_name, birth_date, gender)
VALUES
  ('P001', 'NHI001', 'Wang', 'Wei', '1980-05-15', 'male'),
  ('P002', 'NHI002', 'Chen', 'Mei', '1992-11-03', 'female'),
  ('P003', 'NHI003', 'Lin', 'Ming', '1975-01-22', 'male')
ON CONFLICT (id) DO UPDATE SET
  family_name = EXCLUDED.family_name,
  given_name = EXCLUDED.given_name,
  updated_at = NOW();

INSERT INTO encounters (id, patient_id, facility_id, facility_name, status, class_code, period_start, period_end)
VALUES
  ('E001', 'P001', 'FAC-A', 'Pilot Hospital A', 'finished', 'AMB', NOW() - INTERVAL '30 days', NOW() - INTERVAL '30 days' + INTERVAL '1 hour'),
  ('E002', 'P001', 'FAC-A', 'Pilot Hospital A', 'finished', 'IMP', NOW() - INTERVAL '35 days', NOW() - INTERVAL '34 days'),
  ('E003', 'P001', 'FAC-B', 'Pilot Hospital B', 'finished', 'AMB', NOW() - INTERVAL '44 days', NOW() - INTERVAL '44 days' + INTERVAL '30 minutes'),
  ('E004', 'P002', 'FAC-A', 'Pilot Hospital A', 'finished', 'AMB', NOW() - INTERVAL '2 days', NOW() - INTERVAL '2 days' + INTERVAL '2 hours'),
  ('E005', 'P002', 'FAC-B', 'Pilot Hospital B', 'finished', 'EMER', NOW() - INTERVAL '1 day', NOW() - INTERVAL '1 day' + INTERVAL '4 hours'),
  ('E006', 'P003', 'FAC-B', 'Pilot Hospital B', 'finished', 'AMB', NOW() - INTERVAL '7 days', NOW() - INTERVAL '7 days' + INTERVAL '1 hour'),
  ('E007', 'P002', 'FAC-A', 'Pilot Hospital A', 'finished', 'IMP', NOW() - INTERVAL '20 days', NOW() - INTERVAL '19 days'),
  ('E008', 'P002', 'FAC-B', 'Pilot Hospital B', 'finished', 'AMB', NOW() - INTERVAL '15 days', NOW() - INTERVAL '15 days' + INTERVAL '1 hour')
ON CONFLICT (id) DO UPDATE SET
  period_start = EXCLUDED.period_start,
  period_end = EXCLUDED.period_end,
  updated_at = NOW();

INSERT INTO observations (id, patient_id, code, effective_time, value_text, unit, resource_json)
VALUES
  ('OBS-P001-BP', 'P001', 'Blood pressure systolic', NOW(), '128/82', 'mmHg', '{"resourceType":"Observation","id":"OBS-P001-BP","status":"final"}'::jsonb),
  ('OBS-P001-HR', 'P001', 'Heart rate', NOW(), '98', '/min', '{"resourceType":"Observation","id":"OBS-P001-HR","status":"final"}'::jsonb),
  ('OBS-P001-RR', 'P001', 'Respiratory rate', NOW(), '20', '/min', '{"resourceType":"Observation","id":"OBS-P001-RR","status":"final"}'::jsonb),
  ('OBS-P001-SPO2', 'P001', 'Oxygen saturation', NOW(), '94', '%', '{"resourceType":"Observation","id":"OBS-P001-SPO2","status":"final"}'::jsonb),
  ('OBS-P001-TEMP', 'P001', 'Body temperature', NOW(), '38.2', 'Cel', '{"resourceType":"Observation","id":"OBS-P001-TEMP","status":"final"}'::jsonb),
  ('OBS-P001-K', 'P001', 'Potassium', NOW(), '5.6', 'mmol/L', '{"resourceType":"Observation","id":"OBS-P001-K","status":"final"}'::jsonb),
  ('OBS-P001-GLU', 'P001', 'Blood glucose', NOW(), '11.2', 'mmol/L', '{"resourceType":"Observation","id":"OBS-P001-GLU","status":"final"}'::jsonb),
  ('OBS-P001-CRP', 'P001', 'CRP', NOW(), '62', 'mg/L', '{"resourceType":"Observation","id":"OBS-P001-CRP","status":"final"}'::jsonb),
  ('OBS-P001-CREAT', 'P001', 'Creatinine', NOW(), '145', 'umol/L', '{"resourceType":"Observation","id":"OBS-P001-CREAT","status":"final"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  value_text = EXCLUDED.value_text,
  effective_time = EXCLUDED.effective_time,
  updated_at = NOW();

INSERT INTO medication_requests (id, patient_id, medication_code, status, authored_on, dosage_text, resource_json)
VALUES
  ('MED-P001-WARF', 'P001', 'Warfarin 5mg', 'active', NOW(), '5mg daily', '{"resourceType":"MedicationRequest","id":"MED-P001-WARF","status":"active"}'::jsonb),
  ('MED-P001-ASP', 'P001', 'Aspirin 75mg', 'active', NOW(), '75mg daily', '{"resourceType":"MedicationRequest","id":"MED-P001-ASP","status":"active"}'::jsonb)
ON CONFLICT (id) DO UPDATE SET
  medication_code = EXCLUDED.medication_code,
  status = EXCLUDED.status,
  updated_at = NOW();

-- ML Tier C: analytics consent (required for export_ml_features_staging.sql)
INSERT INTO consents (patient_id, facility_id, scope, active)
SELECT v.patient_id, v.facility_id, v.scope, true
FROM (VALUES
  ('P001', 'FAC-A', 'analytics'),
  ('P001', 'FAC-B', 'analytics'),
  ('P002', 'FAC-A', 'analytics'),
  ('P002', 'FAC-B', 'analytics'),
  ('P003', 'FAC-B', 'analytics')
) AS v(patient_id, facility_id, scope)
WHERE NOT EXISTS (
  SELECT 1 FROM consents c
  WHERE c.patient_id = v.patient_id
    AND c.facility_id = v.facility_id
    AND c.scope = v.scope
    AND c.active = true
);

-- Facility-confirmed ML labels (demo — overrides proxy in export when table exists)
INSERT INTO ml_patient_outcome_labels (
  patient_id, facility_id, outcome_deterioration_7d, outcome_readmission_30d, label_source
)
SELECT v.patient_id, v.facility_id, v.det, v.readm, 'facility_csv_v1'
FROM (VALUES
  ('P001', 'FAC-A', 1, 0),
  ('P002', 'FAC-B', 0, 1)
) AS v(patient_id, facility_id, det, readm)
WHERE NOT EXISTS (
  SELECT 1 FROM ml_patient_outcome_labels l
  WHERE l.patient_id = v.patient_id AND l.facility_id = v.facility_id AND l.effective_day = CURRENT_DATE
);
