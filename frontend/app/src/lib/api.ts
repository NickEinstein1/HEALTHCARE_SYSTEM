import type { MedicationRequest, MetricsJson, Observation, PatientSummary } from "./apiTypes";

function apiBaseUrl() {
  // optional: set VITE_API_BASE_URL in .env (e.g. http://localhost:8000)
  const fromEnv = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  return (fromEnv && fromEnv.trim()) || "http://localhost:8000";
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(apiBaseUrl() + path, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${t ? ` — ${t}` : ""}`);
  }
  return (await res.json()) as T;
}

export const api = {
  metricsJson(): Promise<MetricsJson> {
    return getJson("/metrics/json");
  },
  patientSummary(patientId: string, encounters = 5): Promise<PatientSummary> {
    return getJson(`/fhir/r5/Patient/${encodeURIComponent(patientId)}/summary?encounters=${encounters}`);
  },
  observations(patientId: string, limit = 20): Promise<Observation[]> {
    return getJson(`/fhir/r5/Patient/${encodeURIComponent(patientId)}/observations?limit=${limit}`);
  },
  medicationRequests(patientId: string, limit = 20): Promise<MedicationRequest[]> {
    return getJson(
      `/fhir/r5/Patient/${encodeURIComponent(patientId)}/medication-requests?limit=${limit}`
    );
  },
};

