export type MetricsRoute = {
  method: string;
  path: string;
  requests: number;
  avg_latency_ms: number;
  status_counts: Record<string, number>;
};

export type MetricsJson = {
  routes: MetricsRoute[];
};

export type Patient = {
  id: string;
  nhi_number: string;
  family_name?: string | null;
  given_name?: string | null;
  birth_date?: string | null;
  gender?: string | null;
};

export type Encounter = {
  id: string;
  patient_id: string;
  facility_id: string;
  facility_name?: string | null;
  status: string;
  class_code?: string | null;
  period_start?: string | null;
  period_end?: string | null;
};

export type PatientSummary = {
  patient: Patient;
  encounters: Encounter[];
};

export type Observation = {
  id: string;
  patient_id: string;
  code?: string | null;
  effective_time?: string | null;
  value_text?: string | null;
  unit?: string | null;
};

export type MedicationRequest = {
  id: string;
  patient_id: string;
  medication_code?: string | null;
  status?: string | null;
  authored_on?: string | null;
  dosage_text?: string | null;
};

