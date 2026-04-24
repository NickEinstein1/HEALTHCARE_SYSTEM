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

async function postJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  const res = await fetch(apiBaseUrl() + path, {
    method: "POST",
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
      Accept: "application/json",
    },
    body: JSON.stringify(body),
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
  ingestObservation(payload: unknown): Promise<{ status: string; resourceType?: string; id?: string }> {
    return postJson("/fhir/r5/Observation", payload);
  },
  nurseIncident(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/nurse/incidents", payload);
  },
  nurseIncidents(limit = 50): Promise<any[]> {
    return getJson(`/nurse/incidents?limit=${limit}`);
  },
  nurseSupplyRequest(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/nurse/supplies", payload);
  },
  nurseSupplies(limit = 50): Promise<any[]> {
    return getJson(`/nurse/supplies?limit=${limit}`);
  },
  nurseTaskCreate(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/nurse/tasks", payload);
  },
  nurseTaskComplete(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/nurse/tasks/complete", payload);
  },
  nurseTasks(limit = 200): Promise<any[]> {
    return getJson(`/nurse/tasks?limit=${limit}`);
  },
  nurseFluidCreate(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/nurse/fluids", payload);
  },
  nurseFluids(limit = 200): Promise<any[]> {
    return getJson(`/nurse/fluids?limit=${limit}`);
  },
  nurseWoundCreate(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/nurse/wounds", payload);
  },
  nurseWounds(limit = 200): Promise<any[]> {
    return getJson(`/nurse/wounds?limit=${limit}`);
  },
  nurseHandoverSubmit(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/nurse/handover", payload);
  },
  nurseHandover(limit = 50): Promise<any[]> {
    return getJson(`/nurse/handover?limit=${limit}`);
  },
};

