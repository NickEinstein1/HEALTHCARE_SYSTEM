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
};
