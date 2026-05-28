import { config } from "./config";
import { getAccessToken } from "./storage";

async function authHeaders(): Promise<Record<string, string>> {
  const token = await getAccessToken();
  const h: Record<string, string> = {
    Accept: "application/json",
    "X-UniHealth-Role": "patient",
    "X-Facility-Id": "FAC-A",
  };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${config.apiBaseUrl}${path}`, { headers: await authHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${res.status}${t ? ` — ${t}` : ""}`);
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown, method = "POST"): Promise<T> {
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(await authHeaders()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${res.status}${t ? ` — ${t}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export type PatientSummary = {
  patient: {
    id: string;
    given_name?: string;
    family_name?: string;
    gender?: string;
    birth_date?: string;
  };
  encounters?: { id: string; type?: string; period_start?: string }[];
};

export type Observation = {
  id: string;
  code?: string;
  value_text?: string;
  effective_time?: string;
};

export type PatientProfile = {
  patient_id: string;
  given_name: string;
  family_name: string;
  email: string;
  phone: string;
  emergency_name: string;
  emergency_phone: string;
  preferred_language: string;
  notify_sms: boolean;
  notify_email: boolean;
  notify_push: boolean;
  notify_appointments: boolean;
  notify_results: boolean;
  nhi_number?: string | null;
  gender?: string | null;
  birth_date?: string | null;
  password_changes_used: number;
  password_changes_remaining: number;
  password_changes_allowed: number;
  has_password: boolean;
  updated_at?: number;
};

export type ChangePasswordResult = {
  ok: boolean;
  message: string;
  password_changes_used: number;
  password_changes_remaining: number;
};

export type PatientInsightRoute = "vitals" | "results" | "medications" | "appointments";

export type PatientInsight = {
  icon: string;
  title: string;
  body: string;
  tag: string;
  tone: "red" | "amber" | "blue";
  route?: PatientInsightRoute;
};

export type PatientInsightsResult = {
  insights: PatientInsight[];
  news2: {
    score: number;
    risk: string;
    action: string;
    components?: Record<string, number>;
  };
  audit_id?: string;
};

export type PatientAlertsResult = {
  alerts: (PatientInsight & { id: string; ts?: string })[];
};

export type MedicationRequest = {
  id: string;
  medication?: string;
  medication_code?: string;
  dosage?: string;
  dosage_text?: string;
  status?: string;
  authored_on?: string;
};

export const api = {
  patientSummary(patientId: string, encounters = 5): Promise<PatientSummary> {
    return getJson(`/fhir/r5/Patient/${encodeURIComponent(patientId)}/summary?encounters=${encounters}`);
  },
  observations(patientId: string, limit = 20): Promise<Observation[]> {
    return getJson(`/fhir/r5/Patient/${encodeURIComponent(patientId)}/observations?limit=${limit}`);
  },
  medicationRequests(patientId: string, limit = 20): Promise<MedicationRequest[]> {
    return getJson(`/fhir/r5/Patient/${encodeURIComponent(patientId)}/medication-requests?limit=${limit}`);
  },
  appointments(patientId: string): Promise<Record<string, unknown>[]> {
    return getJson(`/appointments?patient_id=${encodeURIComponent(patientId)}&limit=50`);
  },
  appointmentSlots(date: string, facility: string, department: string): Promise<{ available: string[] }> {
    const qs = new URLSearchParams({ date, facility, department });
    return getJson(`/appointments/slots?${qs}`);
  },
  appointmentCreate(payload: Record<string, unknown>): Promise<{ id?: string }> {
    return postJson("/appointments", payload);
  },
  appointmentCancel(aptId: string, reason: string): Promise<{ status: string }> {
    return postJson(`/appointments/${encodeURIComponent(aptId)}/cancel`, { reason });
  },
  consentSearch(patientId: string): Promise<{ entry?: { resource?: Record<string, unknown> }[] }> {
    return getJson(`/fhir/r5/Consent?patient=${encodeURIComponent(patientId)}`);
  },
  consentGrant(payload: { patient_id: string; facility_id: string; scope: string }): Promise<unknown> {
    return postJson("/consent/grant", payload);
  },
  consentRevoke(payload: { patient_id: string; facility_id: string; scope: string }): Promise<unknown> {
    return postJson("/consent/revoke", payload);
  },
  patientProfile(patientId: string): Promise<PatientProfile> {
    return getJson(`/patient/${encodeURIComponent(patientId)}/profile`);
  },
  patientProfileUpdate(patientId: string, patch: Partial<PatientProfile>): Promise<PatientProfile> {
    return postJson(`/patient/${encodeURIComponent(patientId)}/profile`, patch, "PATCH");
  },
  changePassword(
    patientId: string,
    body: { current_password: string; new_password: string; confirm_password: string },
  ): Promise<ChangePasswordResult> {
    return postJson(`/patient/${encodeURIComponent(patientId)}/security/change-password`, body);
  },
  patientInsights(
    patientId: string,
    vitals: { rr?: number; spo2?: number; sbp?: number; hr?: number; temp?: number; gcs?: number },
  ): Promise<PatientInsightsResult> {
    return postJson("/ai/patient/insights", { patient_id: patientId, vitals });
  },
  patientAlerts(patientId: string, limit = 10): Promise<PatientAlertsResult> {
    return getJson(`/ai/patient/alerts?patient_id=${encodeURIComponent(patientId)}&limit=${limit}`);
  },
  uiAction(payload: Record<string, unknown>): Promise<{ id?: string }> {
    return postJson("/ui/actions", payload);
  },
};
