import type {
  AllergyIntolerance,
  MedicationRequest,
  MetricsJson,
  Observation,
  PatientSummary,
} from "./apiTypes";
import { authHeaders } from "./authHeaders";
import { getStoredAccessToken } from "./oidc";

function apiBaseUrl() {
  // Staging: VITE_API_BASE_URL=http://localhost:8100 (see .env.staging.example)
  const fromEnv = (import.meta as any).env?.VITE_API_BASE_URL as string | undefined;
  // Default to same-origin so Vite proxy (dev) or reverse proxy (prod)
  // can forward API requests without CORS issues.
  return (fromEnv && fromEnv.trim()) || "";
}

/** Pilot facility header for FHIR reads/writes (required when EHR_CONSENT_MODE=strict). */
function fhirHeaders(role?: string): Record<string, string> {
  return {
    ...authHeaders(role),
    "X-Facility-Id": "FAC-A",
  };
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
    const hint =
      res.status === 500 || res.status === 502
        ? ` Check backend: ./scripts/run_staging.sh (gateway :8100) and frontend/app/.env with VITE_API_BASE_URL=http://localhost:8100`
        : "";
    throw new Error(`${res.status} ${res.statusText}${t ? ` — ${t}` : ""}${hint}`);
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
  patientSummary(patientId: string, encounters = 5, role?: string): Promise<PatientSummary> {
    return getJson(`/fhir/r5/Patient/${encodeURIComponent(patientId)}/summary?encounters=${encounters}`, {
      headers: fhirHeaders(role),
    });
  },
  observations(patientId: string, limit = 20, role?: string): Promise<Observation[]> {
    return getJson(`/fhir/r5/Patient/${encodeURIComponent(patientId)}/observations?limit=${limit}`, {
      headers: fhirHeaders(role),
    });
  },
  medicationRequests(patientId: string, limit = 20, role?: string): Promise<MedicationRequest[]> {
    return getJson(
      `/fhir/r5/Patient/${encodeURIComponent(patientId)}/medication-requests?limit=${limit}`,
      { headers: fhirHeaders(role) },
    );
  },
  allergyIntolerances(patientId: string, limit = 20, role?: string): Promise<AllergyIntolerance[]> {
    return getJson(
      `/fhir/r5/Patient/${encodeURIComponent(patientId)}/allergy-intolerances?limit=${limit}`,
      { headers: fhirHeaders(role) },
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
  nurseIncidentUpdate(incidentId: string, payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson(`/nurse/incidents/${encodeURIComponent(incidentId)}`, payload, { method: "PUT" });
  },
  nurseIncidentDelete(incidentId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/nurse/incidents/${encodeURIComponent(incidentId)}`, {}, { method: "DELETE" });
  },
  nurseSupplyRequest(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/nurse/supplies", payload);
  },
  nurseSupplies(limit = 50): Promise<any[]> {
    return getJson(`/nurse/supplies?limit=${limit}`);
  },
  nurseSupplyUpdate(reqId: string, payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson(`/nurse/supplies/${encodeURIComponent(reqId)}`, payload, { method: "PUT" });
  },
  nurseSupplyDelete(reqId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/nurse/supplies/${encodeURIComponent(reqId)}`, {}, { method: "DELETE" });
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
  nurseTaskUpdate(taskId: string, payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson(`/nurse/tasks/${encodeURIComponent(taskId)}`, payload, { method: "PUT" });
  },
  nurseTaskDelete(taskId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/nurse/tasks/${encodeURIComponent(taskId)}`, {}, { method: "DELETE" });
  },
  nurseFluidCreate(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/nurse/fluids", payload);
  },
  nurseFluids(limit = 200): Promise<any[]> {
    return getJson(`/nurse/fluids?limit=${limit}`);
  },
  nurseFluidUpdate(entryId: string, payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson(`/nurse/fluids/${encodeURIComponent(entryId)}`, payload, { method: "PUT" });
  },
  nurseFluidDelete(entryId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/nurse/fluids/${encodeURIComponent(entryId)}`, {}, { method: "DELETE" });
  },
  nurseWoundCreate(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/nurse/wounds", payload);
  },
  nurseWounds(limit = 200): Promise<any[]> {
    return getJson(`/nurse/wounds?limit=${limit}`);
  },
  nurseWoundUpdate(entryId: string, payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson(`/nurse/wounds/${encodeURIComponent(entryId)}`, payload, { method: "PUT" });
  },
  nurseWoundDelete(entryId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/nurse/wounds/${encodeURIComponent(entryId)}`, {}, { method: "DELETE" });
  },
  nurseHandoverSubmit(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/nurse/handover", payload);
  },
  nurseHandover(limit = 50): Promise<any[]> {
    return getJson(`/nurse/handover?limit=${limit}`);
  },
  nurseHandoverUpdate(noteId: string, payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson(`/nurse/handover/${encodeURIComponent(noteId)}`, payload, { method: "PUT" });
  },
  nurseHandoverDelete(noteId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/nurse/handover/${encodeURIComponent(noteId)}`, {}, { method: "DELETE" });
  },
  // ---- Lab portal (Phase 1 UI) ----
  labOrders(limit = 200): Promise<any[]> {
    return getJson(`/lab/orders?limit=${encodeURIComponent(String(limit))}`);
  },
  labOrderCreate(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/lab/orders", payload);
  },
  labOrderUpdate(orderId: string, payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson(`/lab/orders/${encodeURIComponent(orderId)}`, payload, { method: "PUT" });
  },
  labOrderDelete(orderId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/lab/orders/${encodeURIComponent(orderId)}`, {}, { method: "DELETE" });
  },
  labResults(limit = 200): Promise<any[]> {
    return getJson(`/lab/results?limit=${encodeURIComponent(String(limit))}`);
  },
  labResultCreate(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/lab/results", payload);
  },
  labResultUpdate(resultId: string, payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson(`/lab/results/${encodeURIComponent(resultId)}`, payload, { method: "PUT" });
  },
  labResultDelete(resultId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/lab/results/${encodeURIComponent(resultId)}`, {}, { method: "DELETE" });
  },
  labQc(limit = 200): Promise<any[]> {
    return getJson(`/lab/qc?limit=${encodeURIComponent(String(limit))}`);
  },
  labQcCreate(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/lab/qc", payload);
  },
  labQcUpdate(qcId: string, payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson(`/lab/qc/${encodeURIComponent(qcId)}`, payload, { method: "PUT" });
  },
  labQcDelete(qcId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/lab/qc/${encodeURIComponent(qcId)}`, {}, { method: "DELETE" });
  },
  labImagingOrders(limit = 200): Promise<any[]> {
    return getJson(`/lab/imaging?limit=${encodeURIComponent(String(limit))}`);
  },
  labImagingCreate(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/lab/imaging", payload);
  },
  labImagingUpdate(imgId: string, payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson(`/lab/imaging/${encodeURIComponent(imgId)}`, payload, { method: "PUT" });
  },
  labImagingDelete(imgId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/lab/imaging/${encodeURIComponent(imgId)}`, {}, { method: "DELETE" });
  },
  // ---- Pharmacy portal (Phase 1 UI) ----
  pharmacyPrescriptions(limit = 200): Promise<any[]> {
    return getJson(`/pharmacy/prescriptions?limit=${encodeURIComponent(String(limit))}`);
  },
  pharmacyPrescriptionCreate(payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson("/pharmacy/prescriptions", payload);
  },
  pharmacyPrescriptionUpdate(rxId: string, payload: unknown): Promise<{ status: string; id?: string }> {
    return postJson(`/pharmacy/prescriptions/${encodeURIComponent(rxId)}`, payload, { method: "PUT" });
  },
  pharmacyPrescriptionDelete(rxId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/pharmacy/prescriptions/${encodeURIComponent(rxId)}`, {}, { method: "DELETE" });
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
  pharmacyStockDelete(itemName: string): Promise<{ status: string; id?: string }> {
    return postJson(`/pharmacy/stock/${encodeURIComponent(itemName)}`, {}, { method: "DELETE" });
  },
  pharmacyAudit(limit = 200): Promise<any[]> {
    return getJson(`/pharmacy/audit?limit=${encodeURIComponent(String(limit))}`);
  },
  // ---- Appointments (cross-user scheduling) ----
  appointments(params?: { patient_id?: string; department?: string; status?: string; date?: string; limit?: number }): Promise<any[]> {
    const p = params ?? {};
    const qs = new URLSearchParams();
    if (p.patient_id) qs.set("patient_id", p.patient_id);
    if (p.department) qs.set("department", p.department);
    if (p.status)     qs.set("status", p.status);
    if (p.date)       qs.set("date", p.date);
    if (p.limit)      qs.set("limit", String(p.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return getJson(`/appointments${suffix}`);
  },
  appointmentCreate(payload: unknown): Promise<{ status: string; id?: string; appointment?: any }> {
    return postJson("/appointments", payload);
  },
  appointmentSlots(date: string, facility?: string, department?: string): Promise<{ date: string; available: string[]; booked: string[] }> {
    const qs = new URLSearchParams({ date });
    if (facility)   qs.set("facility", facility);
    if (department) qs.set("department", department);
    return getJson(`/appointments/slots?${qs}`);
  },
  appointmentDepartments(): Promise<{ departments: string[] }> {
    return getJson("/appointments/departments");
  },
  appointmentConfirm(aptId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/appointments/${encodeURIComponent(aptId)}/confirm`, {});
  },
  appointmentCancel(aptId: string, reason?: string): Promise<{ status: string; id?: string }> {
    return postJson(`/appointments/${encodeURIComponent(aptId)}/cancel`, { reason: reason ?? "" });
  },
  appointmentUpdate(aptId: string, payload: unknown): Promise<{ status: string; id?: string; appointment?: any }> {
    return postJson(`/appointments/${encodeURIComponent(aptId)}`, payload, { method: "PUT" });
  },
  appointmentDelete(aptId: string): Promise<{ status: string; id?: string }> {
    return postJson(`/appointments/${encodeURIComponent(aptId)}`, {}, { method: "DELETE" });
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

  // ---- Walk-ins + cross-facility correlation (Phase 1 UI) ----
  walkinsList(params?: { limit?: number; facility_id?: string; triage_level?: string; uhid?: string }): Promise<any[]> {
    const p = params ?? {};
    const qs = new URLSearchParams();
    if (p.limit) qs.set("limit", String(p.limit));
    if (p.facility_id) qs.set("facility_id", p.facility_id);
    if (p.triage_level) qs.set("triage_level", p.triage_level);
    if (p.uhid) qs.set("uhid", p.uhid);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return getJson(`/walkins${suffix}`);
  },
  walkinCreate(payload: unknown): Promise<{
    status: string;
    walkin?: any;
    patient?: any;
    aliases?: any[];
    correlation?: { action?: string | null; candidates?: { uhid: string; score: number; reason: string }[] };
  }> {
    return postJson("/walkins", payload);
  },
  walkinResolve(walkinId: string, payload?: unknown): Promise<{ status: string; walkin?: any }> {
    return postJson(`/walkins/${encodeURIComponent(walkinId)}/resolve`, payload ?? {});
  },
  walkinSearch(q: string, limit = 20): Promise<any[]> {
    return getJson(`/walkins/search?q=${encodeURIComponent(q)}&limit=${encodeURIComponent(String(limit))}`);
  },
  walkinPatient360(uhid: string): Promise<{
    patient?: any;
    aliases?: any[];
    visits?: any[];
    facilities_visited?: string[];
    total_visits?: number;
  }> {
    return getJson(`/walkins/patient/${encodeURIComponent(uhid)}`);
  },

  // ══════════════════════════════════════════════════════════════
  // Phase 3 — AI Assist
  // ══════════════════════════════════════════════════════════════

  aiStatus(): Promise<any> {
    return getJson("/ai/status");
  },

  aiPatientInsights(
    payload: { patient_id: string; vitals?: Record<string, number> },
    role = "patient",
  ): Promise<{ insights?: { title: string; body: string; severity?: string }[] }> {
    return postJson("/ai/patient/insights", payload, { headers: authHeaders(role) });
  },

  aiPatientAlerts(
    params: { patient_id: string; limit?: number },
    role = "patient",
  ): Promise<{ alerts?: { title?: string; body?: string }[] }> {
    const qs = new URLSearchParams({
      patient_id: params.patient_id,
      limit: String(params.limit ?? 6),
    });
    return getJson(`/ai/patient/alerts?${qs}`, { headers: authHeaders(role) });
  },

  aiRiskScore(payload: {
    patient_id: string;
    features?: Record<string, number>;
    use_fhir?: boolean;
  }, role: string): Promise<{
    patient_id: string;
    risk_band: string;
    rules_band?: string;
    model_type?: string;
    model_version?: string;
    ml_probability?: number;
    ml_error?: string;
    news2?: Record<string, unknown>;
    active_alerts?: number;
    drivers?: string[];
    fhir_enriched?: boolean;
    disclaimer?: string;
    audit_id?: string;
  }> {
    return postJson("/ai/risk-score", payload, { headers: authHeaders(role) });
  },

  aiDiagnosisHints(payload: {
    features: Record<string, number>;
    medications?: string[];
    patient_id?: string;
    use_fhir?: boolean;
  }, role: string): Promise<{
    differentials?: { diagnosis: string; icd10: string; confidence: number; rationale: string }[];
    drug_interactions?: { drug_a: string; drug_b: string; severity: string; detail: string }[];
    model_version?: string;
    features_used?: Record<string, number>;
    fhir_enriched?: boolean;
    audit_id?: string;
    disclaimer?: string;
  }> {
    return postJson("/ai/diagnosis-hints", payload, {
      headers: authHeaders(role),
    });
  },

  aiAnomalyCheck(payload: {
    patient_id: string;
    vitals: Record<string, number>;
    labs?: Record<string, number>;
    baseline?: Record<string, { mean: number; std: number }>;
  }, role: string): Promise<any> {
    return postJson("/ai/anomaly-check", payload, {
      headers: authHeaders(role),
    });
  },

  aiNews2(vitals: {
    rr: number; spo2: number; sbp: number; hr: number; temp: number; gcs?: number;
  }, role: string): Promise<any> {
    return postJson("/ai/news2", vitals, {
      headers: authHeaders(role),
    });
  },

  aiAnomalies(params?: {
    patient_id?: string; severity?: string; ack?: boolean; limit?: number;
  }, role = "nurse"): Promise<any[]> {
    const p = params ?? {};
    const qs = new URLSearchParams();
    if (p.patient_id) qs.set("patient_id", p.patient_id);
    if (p.severity)   qs.set("severity",   p.severity);
    if (p.ack !== undefined) qs.set("ack", String(p.ack));
    if (p.limit)      qs.set("limit",      String(p.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return getJson(`/ai/anomalies${suffix}`, { headers: authHeaders(role) });
  },

  aiAckAnomaly(anomalyId: string, note: string, role: string): Promise<any> {
    return postJson(`/ai/anomalies/${encodeURIComponent(anomalyId)}/ack`, { note }, {
      headers: authHeaders(role),
    });
  },

  aiSimPatients(params?: {
    ward_id?: string; limit?: number;
  }, role = "doctor"): Promise<any[]> {
    const p = params ?? {};
    const qs = new URLSearchParams();
    if (p.ward_id) qs.set("ward_id", p.ward_id);
    if (p.limit)   qs.set("limit",   String(p.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return getJson(`/ai/patients${suffix}`, { headers: authHeaders(role) });
  },

  aiPatientVitals(simId: string, limit = 12, role = "doctor"): Promise<any[]> {
    return getJson(`/ai/patients/${encodeURIComponent(simId)}/vitals?limit=${limit}`, {
      headers: authHeaders(role),
    });
  },

  aiPatientLabs(simId: string, role = "doctor"): Promise<any> {
    return getJson(`/ai/patients/${encodeURIComponent(simId)}/labs`, {
      headers: authHeaders(role),
    });
  },

  /** Per-metric mean/σ/n from Phase-3 vital time-series (z-score anomalies). */
  aiPatientBaselines(simId: string, role = "doctor"): Promise<any> {
    return getJson(`/ai/patients/${encodeURIComponent(simId)}/baselines`, {
      headers: authHeaders(role),
    });
  },

  aiWards(role = "nurse"): Promise<any[]> {
    return getJson("/ai/wards", { headers: authHeaders(role) });
  },

  aiWardForecast(wardId: string, hours = 24, role = "admin"): Promise<any[]> {
    return getJson(
      `/ai/wards/${encodeURIComponent(wardId)}/forecast?hours=${hours}`,
      { headers: authHeaders(role) },
    );
  },

  /** Hourly census snapshots (ring buffer); readable by doctor/nurse/admin. */
  aiWardHistory(wardId: string, limit = 168, role = "nurse"): Promise<any[]> {
    return getJson(
      `/ai/wards/${encodeURIComponent(wardId)}/history?limit=${limit}`,
      { headers: authHeaders(role) },
    );
  },

  aiWardCensusSnapshot(
    wardId: string,
    payload: { occupied: number; source?: string },
    role = "nurse",
  ): Promise<any> {
    return postJson(`/ai/wards/${encodeURIComponent(wardId)}/census-snapshot`, payload, {
      headers: authHeaders(role),
    });
  },

  aiRecomputeForecasts(): Promise<{ status: string; training_source_by_ward: Record<string, string> }> {
    return postJson("/ai/wards/recompute-forecasts", {}, {
      headers: authHeaders("admin"),
    });
  },

  aiAuditLog(params?: { event?: string; limit?: number }): Promise<any[]> {
    const p = params ?? {};
    const qs = new URLSearchParams();
    if (p.event) qs.set("event", p.event);
    if (p.limit) qs.set("limit", String(p.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return getJson(`/ai/audit${suffix}`, { headers: authHeaders("admin") });
  },

  aiSubmitFeedback(auditId: string, action: string, note: string, role: string): Promise<any> {
    return postJson(
      `/ai/audit/${encodeURIComponent(auditId)}/feedback`,
      { action, note },
      { headers: authHeaders(role) },
    );
  },
};

export type AiWsAlertRole = "doctor" | "nurse" | "admin" | "lab" | "pharmacy";

/** WebSocket URL for Phase 3 ``/ai/ws/alerts/{role}`` (Bearer token when signed in). */
export function aiAlertsWebSocketUrl(role: AiWsAlertRole): string {
  const httpBase = apiBaseUrl();
  const wsBase = httpBase
    ? httpBase.replace(/^http/, "ws")
    : `${window.location.protocol === "https:" ? "wss:" : "ws:"}//${window.location.host}`;
  const qs = new URLSearchParams();
  const token = getStoredAccessToken();
  qs.set("token", token || "dev-token-1");
  return `${wsBase}/ai/ws/alerts/${role}?${qs.toString()}`;
}

