import type { MedicationRequest, MetricsJson, Observation, PatientSummary } from "./apiTypes";

function apiBaseUrl() {
  // optional: set VITE_API_BASE_URL in .env (e.g. http://localhost:8000)
  const fromEnv = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  // Default to same-origin so Vite proxy (dev) or reverse proxy (prod)
  // can forward API requests without CORS issues.
  return (fromEnv && fromEnv.trim()) || "";
}

async function getJson<T>(path: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiBaseUrl() + path, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        Accept: "application/json",
      },
    });
  } catch (e) {
    const base = apiBaseUrl() || "(same-origin)";
    throw new Error(`Failed to fetch ${path} from ${base}. Is the API running / proxy configured?`);
  }
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${res.status} ${res.statusText}${t ? ` — ${t}` : ""}`);
  }
  return (await res.json()) as T;
}

async function postJson<T>(path: string, body: unknown, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(apiBaseUrl() + path, {
      method: "POST",
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init?.headers ?? {}),
        Accept: "application/json",
      },
      body: JSON.stringify(body),
    });
  } catch (e) {
    const base = apiBaseUrl() || "(same-origin)";
    throw new Error(`Failed to fetch ${path} from ${base}. Is the API running / proxy configured?`);
  }
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
  // ---- Lab portal (Phase 1 UI) ----
  labOrders(limit = 200): Promise<any[]> {
    return getJson(`/lab/orders?limit=${encodeURIComponent(String(limit))}`);
  },
  labOrderCreate(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/lab/orders", payload);
  },
  labResults(limit = 200): Promise<any[]> {
    return getJson(`/lab/results?limit=${encodeURIComponent(String(limit))}`);
  },
  labQc(limit = 200): Promise<any[]> {
    return getJson(`/lab/qc?limit=${encodeURIComponent(String(limit))}`);
  },
  labImagingOrders(limit = 200): Promise<any[]> {
    return getJson(`/lab/imaging?limit=${encodeURIComponent(String(limit))}`);
  },
  labImagingCreate(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/lab/imaging", payload);
  },
  // ---- Pharmacy portal (Phase 1 UI) ----
  pharmacyPrescriptions(limit = 200): Promise<any[]> {
    return getJson(`/pharmacy/prescriptions?limit=${encodeURIComponent(String(limit))}`);
  },
  pharmacyVerify(rxId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/pharmacy/prescriptions/${encodeURIComponent(rxId)}/verify`, {});
  },
  pharmacyDispense(rxId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/pharmacy/prescriptions/${encodeURIComponent(rxId)}/dispense`, {});
  },
  pharmacyStock(limit = 300): Promise<any[]> {
    return getJson(`/pharmacy/stock?limit=${encodeURIComponent(String(limit))}`);
  },
  pharmacyStockAdjust(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/pharmacy/stock/adjust", payload);
  },
  pharmacyAudit(limit = 200): Promise<any[]> {
    return getJson(`/pharmacy/audit?limit=${encodeURIComponent(String(limit))}`);
  },
  uiAction(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/ui/actions", payload);
  },
  uiActionsList(limit = 200): Promise<any[]> {
    return getJson(`/ui/actions?limit=${encodeURIComponent(String(limit))}`);
  },
  adminUsers(params?: { q?: string; role?: string; facility?: string; status?: string; limit?: number }): Promise<any[]> {
    const p = params ?? {};
    const qs = new URLSearchParams();
    if (p.q) qs.set("q", p.q);
    if (p.role) qs.set("role", p.role);
    if (p.facility) qs.set("facility", p.facility);
    if (p.status) qs.set("status", p.status);
    if (p.limit) qs.set("limit", String(p.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return getJson(`/admin/users${suffix}`);
  },
  adminUserCreate(payload: unknown): Promise<{ status: string; id?: string; user?: any }> {
    return postJson("/admin/users", payload);
  },
  adminUserUpdate(userId: string, payload: unknown): Promise<{ status: string; id?: string; user?: any }> {
    return postJson(`/admin/users/${encodeURIComponent(userId)}`, payload, { method: "PUT" });
  },
  adminUserDelete(userId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/admin/users/${encodeURIComponent(userId)}`, {}, { method: "DELETE" });
  },
  adminUsersBulk(users: unknown[]): Promise<{
    status: string;
    created_count?: number;
    created?: any[];
    errors?: { index?: number; email?: string; detail?: string }[];
  }> {
    return postJson("/admin/users/bulk", { users });
  },
  adminFacilities(params?: { q?: string; county?: string; status?: string; limit?: number }): Promise<any[]> {
    const p = params ?? {};
    const qs = new URLSearchParams();
    if (p.q) qs.set("q", p.q);
    if (p.county) qs.set("county", p.county);
    if (p.status) qs.set("status", p.status);
    if (p.limit) qs.set("limit", String(p.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return getJson(`/admin/facilities${suffix}`);
  },
  adminFacilityCreate(payload: unknown): Promise<{ status: string; id?: string; facility?: any }> {
    return postJson("/admin/facilities", payload);
  },
  adminFacilityUpdate(facilityId: string, payload: unknown): Promise<{ status: string; id?: string; facility?: any }> {
    return postJson(`/admin/facilities/${encodeURIComponent(facilityId)}`, payload, { method: "PUT" });
  },
  adminFacilityDelete(facilityId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/admin/facilities/${encodeURIComponent(facilityId)}`, {}, { method: "DELETE" });
  },
  adminPatients(params?: { q?: string; facility?: string; status?: string; limit?: number }): Promise<any[]> {
    const p = params ?? {};
    const qs = new URLSearchParams();
    if (p.q) qs.set("q", p.q);
    if (p.facility) qs.set("facility", p.facility);
    if (p.status) qs.set("status", p.status);
    if (p.limit) qs.set("limit", String(p.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return getJson(`/admin/patients${suffix}`);
  },
  adminPatientCreate(payload: unknown): Promise<{ status: string; id?: string; patient?: any }> {
    return postJson("/admin/patients", payload);
  },
  adminPatientUpdate(patientId: string, payload: unknown): Promise<{ status: string; id?: string; patient?: any }> {
    return postJson(`/admin/patients/${encodeURIComponent(patientId)}`, payload, { method: "PUT" });
  },
  adminPatientDelete(patientId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/admin/patients/${encodeURIComponent(patientId)}`, {}, { method: "DELETE" });
  },
  kmhflKenyaFacilities(params?: {
    search?: string;
    name?: string;
    code?: string;
    is_published?: boolean;
    is_classified?: boolean;
    limit?: number;
    page?: number;
  }): Promise<any> {
    const p = params ?? {};
    const qs = new URLSearchParams();
    if (p.search) qs.set("search", p.search);
    if (p.name) qs.set("name", p.name);
    if (p.code) qs.set("code", p.code);
    if (p.is_published !== undefined) qs.set("is_published", String(p.is_published));
    if (p.is_classified !== undefined) qs.set("is_classified", String(p.is_classified));
    if (p.limit) qs.set("limit", String(p.limit));
    if (p.page) qs.set("page", String(p.page));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return getJson(`/integrations/kmhfl/facilities${suffix}`);
  },
};

