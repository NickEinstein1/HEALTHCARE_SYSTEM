-- Pilot staff accounts — synced with shared/pilot-roles.json + Keycloak realm-unihealth.json
INSERT INTO pilot_staff_accounts (username, role, email, display_name, facility_id, reg_identifier, enabled, keycloak_synced)
VALUES
  ('doctor',   'doctor',   'doctor@hospital.go.ke',   'Pilot Doctor',      'FAC-A', 'A4821',          TRUE, TRUE),
  ('nurse',    'nurse',    'nurse@hospital.go.ke',    'Pilot Nurse',       'FAC-A', 'RN/12345',       TRUE, TRUE),
  ('admin',    'admin',    'admin@hospital.go.ke',    'Pilot Admin',       'FAC-A', 'ADMIN-KE-00441', TRUE, TRUE),
  ('lab',      'lab',      'lab@hospital.go.ke',      'Pilot Laboratory',  'FAC-A', 'LAB-KE-00231',   TRUE, TRUE),
  ('pharmacy', 'pharmacy', 'pharmacy@hospital.go.ke', 'Pilot Pharmacy',    'FAC-A', 'PHARM-00441',    TRUE, TRUE),
  ('patient',  'patient',  'patient@hospital.go.ke',  'Pilot Patient',     'FAC-A', '12345678',       TRUE, TRUE)
ON CONFLICT (username) DO UPDATE SET
  role = EXCLUDED.role,
  email = EXCLUDED.email,
  display_name = EXCLUDED.display_name,
  reg_identifier = EXCLUDED.reg_identifier,
  enabled = EXCLUDED.enabled,
  keycloak_synced = EXCLUDED.keycloak_synced,
  updated_at = NOW();
