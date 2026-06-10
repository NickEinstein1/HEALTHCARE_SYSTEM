-- De-identified ML feature export (contract v1.0). One JSON object per line (psql -t -A).
WITH patient_base AS (
  SELECT
    p.id AS patient_id,
    'P' || substr(md5(p.id || ':unihealth-pilot-salt'), 1, 8) AS pseudo_id,
    CASE
      WHEN p.birth_date IS NULL THEN 'unknown'
      WHEN date_part('year', age(p.birth_date)) < 40 THEN 'under_40'
      WHEN date_part('year', age(p.birth_date)) < 65 THEN '40_64'
      ELSE '65_plus'
    END AS age_band,
    COALESCE(p.gender, 'unknown') AS sex
  FROM patients p
),
latest_encounter AS (
  SELECT DISTINCT ON (e.patient_id)
    e.patient_id,
    e.facility_id,
    COALESCE(e.class_code, 'unknown') AS encounter_class
  FROM encounters e
  WHERE e.status = 'finished'
  ORDER BY e.patient_id, e.period_end DESC NULLS LAST, e.period_start DESC NULLS LAST
),
consent_flags AS (
  SELECT c.patient_id, BOOL_OR(c.scope = 'analytics' AND c.active) AS consent_analytics
  FROM consents c
  GROUP BY c.patient_id
),
readmission AS (
  SELECT DISTINCT e1.patient_id
  FROM encounters e1
  JOIN encounters e2
    ON e2.patient_id = e1.patient_id AND e2.id <> e1.id
  WHERE e1.class_code = 'IMP'
    AND e1.period_end IS NOT NULL
    AND e2.period_start >= e1.period_end
    AND e2.period_start < e1.period_end + INTERVAL '30 days'
),
obs_ranked AS (
  SELECT
    o.patient_id,
    CASE
      WHEN lower(o.code) LIKE '%respiratory%' OR lower(o.code) LIKE '%resp rate%' THEN 'rr'
      WHEN lower(o.code) LIKE '%oxygen%' OR lower(o.code) LIKE '%spo2%' OR lower(o.code) LIKE '%o2 sat%' THEN 'spo2'
      WHEN lower(o.code) LIKE '%blood pressure%' OR lower(o.code) LIKE '%systolic%' OR lower(o.code) = 'bp' THEN 'sbp'
      WHEN lower(o.code) LIKE '%heart rate%' OR lower(o.code) LIKE '%pulse%' THEN 'hr'
      WHEN lower(o.code) LIKE '%temperature%' OR lower(o.code) LIKE '%body temp%' THEN 'temp'
      WHEN lower(o.code) LIKE '%glasgow%' OR lower(o.code) LIKE '%gcs%' THEN 'gcs'
      WHEN lower(o.code) LIKE '%potassium%' OR lower(o.code) LIKE '%k+%' THEN 'potassium'
      WHEN lower(o.code) LIKE '%glucose%' THEN 'glucose'
      WHEN lower(o.code) LIKE '%creatinine%' THEN 'creatinine'
      WHEN lower(o.code) LIKE '%crp%' OR lower(o.code) LIKE '%c-reactive%' THEN 'crp'
      WHEN lower(o.code) LIKE '%lactate%' THEN 'lactate'
      ELSE NULL
    END AS metric,
    (regexp_match(o.value_text, '[0-9]+\.?[0-9]*'))[1]::double precision AS val,
    row_number() OVER (
      PARTITION BY o.patient_id,
        CASE
          WHEN lower(o.code) LIKE '%respiratory%' OR lower(o.code) LIKE '%resp rate%' THEN 'rr'
          WHEN lower(o.code) LIKE '%oxygen%' OR lower(o.code) LIKE '%spo2%' OR lower(o.code) LIKE '%o2 sat%' THEN 'spo2'
          WHEN lower(o.code) LIKE '%blood pressure%' OR lower(o.code) LIKE '%systolic%' OR lower(o.code) = 'bp' THEN 'sbp'
          WHEN lower(o.code) LIKE '%heart rate%' OR lower(o.code) LIKE '%pulse%' THEN 'hr'
          WHEN lower(o.code) LIKE '%temperature%' OR lower(o.code) LIKE '%body temp%' THEN 'temp'
          WHEN lower(o.code) LIKE '%glasgow%' OR lower(o.code) LIKE '%gcs%' THEN 'gcs'
          WHEN lower(o.code) LIKE '%potassium%' OR lower(o.code) LIKE '%k+%' THEN 'potassium'
          WHEN lower(o.code) LIKE '%glucose%' THEN 'glucose'
          WHEN lower(o.code) LIKE '%creatinine%' THEN 'creatinine'
          WHEN lower(o.code) LIKE '%crp%' OR lower(o.code) LIKE '%c-reactive%' THEN 'crp'
          WHEN lower(o.code) LIKE '%lactate%' THEN 'lactate'
          ELSE NULL
        END
      ORDER BY o.effective_time DESC NULLS LAST
    ) AS rn
  FROM observations o
),
obs_latest AS (
  SELECT
    patient_id,
    max(val) FILTER (WHERE metric = 'rr' AND rn = 1) AS rr,
    max(val) FILTER (WHERE metric = 'spo2' AND rn = 1) AS spo2,
    max(val) FILTER (WHERE metric = 'sbp' AND rn = 1) AS sbp,
    max(val) FILTER (WHERE metric = 'hr' AND rn = 1) AS hr,
    max(val) FILTER (WHERE metric = 'temp' AND rn = 1) AS temp,
    max(val) FILTER (WHERE metric = 'gcs' AND rn = 1) AS gcs,
    max(val) FILTER (WHERE metric = 'potassium' AND rn = 1) AS potassium,
    max(val) FILTER (WHERE metric = 'glucose' AND rn = 1) AS glucose,
    max(val) FILTER (WHERE metric = 'creatinine' AND rn = 1) AS creatinine,
    max(val) FILTER (WHERE metric = 'crp' AND rn = 1) AS crp,
    max(val) FILTER (WHERE metric = 'lactate' AND rn = 1) AS lactate
  FROM obs_ranked
  WHERE metric IS NOT NULL
  GROUP BY patient_id
),
med_counts AS (
  SELECT m.patient_id, count(*)::int AS medication_active_count
  FROM medication_requests m
  WHERE m.status = 'active'
  GROUP BY m.patient_id
),
facility_labels AS (
  SELECT DISTINCT ON (l.patient_id)
    l.patient_id,
    l.outcome_readmission_30d,
    l.outcome_deterioration_7d,
    l.outcome_icu_transfer_30d,
    l.label_source
  FROM ml_patient_outcome_labels l
  ORDER BY l.patient_id, l.effective_day DESC
),
assembled AS (
  SELECT
    pb.pseudo_id,
    'F' || substr(md5(COALESCE(le.facility_id, 'unknown') || ':unihealth-pilot-salt'), 1, 8) AS facility_hash,
    pb.age_band,
    pb.sex,
    COALESCE(le.encounter_class, 'unknown') AS encounter_class,
    json_strip_nulls(json_build_object(
      'rr', ol.rr, 'spo2', ol.spo2, 'sbp', ol.sbp, 'hr', ol.hr, 'temp', ol.temp, 'gcs', COALESCE(ol.gcs, 15)
    )) AS vitals_snapshot,
    json_strip_nulls(json_build_object(
      'potassium', ol.potassium, 'glucose', ol.glucose, 'creatinine', ol.creatinine, 'crp', ol.crp, 'lactate', ol.lactate
    )) AS lab_snapshot,
    COALESCE(mc.medication_active_count, 0) AS medication_active_count,
    COALESCE(cf.consent_analytics, false) AS consent_analytics,
    COALESCE(fl.outcome_readmission_30d, CASE WHEN r.patient_id IS NOT NULL THEN 1 ELSE 0 END) AS outcome_readmission_30d,
    COALESCE(
      fl.outcome_deterioration_7d,
      CASE
        WHEN COALESCE(ol.temp, 36) >= 38.0 AND (COALESCE(ol.spo2, 99) <= 94 OR COALESCE(ol.rr, 16) >= 22) THEN 1
        WHEN COALESCE(ol.potassium, 0) >= 5.5 THEN 1
        WHEN COALESCE(ol.creatinine, 0) >= 130 THEN 1
        WHEN COALESCE(ol.glucose, 0) >= 11.0 THEN 1
        WHEN COALESCE(ol.sbp, 120) <= 100 AND COALESCE(ol.hr, 70) >= 100 THEN 1
        ELSE 0
      END
    ) AS outcome_deterioration_7d,
    fl.outcome_icu_transfer_30d AS outcome_icu_transfer_30d,
    CASE WHEN fl.patient_id IS NOT NULL THEN fl.label_source ELSE 'derived_encounter_vitals_v1' END AS label_source
  FROM patient_base pb
  LEFT JOIN latest_encounter le ON le.patient_id = pb.patient_id
  LEFT JOIN consent_flags cf ON cf.patient_id = pb.patient_id
  LEFT JOIN readmission r ON r.patient_id = pb.patient_id
  LEFT JOIN obs_latest ol ON ol.patient_id = pb.patient_id
  LEFT JOIN med_counts mc ON mc.patient_id = pb.patient_id
  LEFT JOIN facility_labels fl ON fl.patient_id = pb.patient_id
  WHERE COALESCE(cf.consent_analytics, false) = true
)
SELECT json_build_object(
  'contract_version', '1.0',
  'pseudo_id', pseudo_id,
  'facility_hash', facility_hash,
  'age_band', age_band,
  'sex', sex,
  'encounter_class', encounter_class,
  'vitals_snapshot', vitals_snapshot,
  'lab_snapshot', lab_snapshot,
  'medication_active_count', medication_active_count,
  'consent_analytics', consent_analytics,
  'outcome_readmission_30d', outcome_readmission_30d,
  'outcome_deterioration_7d', outcome_deterioration_7d,
  'outcome_icu_transfer_30d', outcome_icu_transfer_30d,
  'label_source', label_source,
  'export_day_bucket', to_char(CURRENT_DATE, 'YYYY-MM-DD')
)::text
FROM assembled
ORDER BY pseudo_id;
