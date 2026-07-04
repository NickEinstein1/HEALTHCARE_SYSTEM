import { config } from "./config";
import { getAccessToken, getPatientId } from "./storage";

async function authHeaders(patientId?: string): Promise<Record<string, string>> {
  const pid = patientId ?? (await getPatientId());
  const token = await getAccessToken();
  const h: Record<string, string> = {
    Accept: "application/json",
    "X-Facility-Id": "FAC-A",
    "X-Patient-Id": pid,
  };
  if (token) {
    h.Authorization = `Bearer ${token}`;
  }
  // Local pilot without tokens: role header. Production/OIDC requires Bearer.
  if (!token || !config.oidcEnabled) {
    h["X-UniHealth-Role"] = "patient";
  }
  return h;
}

async function getJson<T>(path: string, patientId?: string): Promise<T> {
  const res = await fetch(`${config.apiBaseUrl}${path}`, { headers: await authHeaders(patientId) });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${res.status}${t ? ` — ${t}` : ""}`);
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown, method = "POST", patientId?: string): Promise<T> {
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    method,
    headers: { "Content-Type": "application/json", ...(await authHeaders(patientId)) },
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

  legalDocuments(patientId: string): Promise<{ documents: LegalDocument[]; count: number }> {
    return getJson(`/esign/documents?patient_id=${encodeURIComponent(patientId)}&limit=50`, patientId);
  },

  legalDocumentCreate(
    patientId: string,
    docType: string,
    context?: Record<string, unknown>,
  ): Promise<{ document: LegalDocument }> {
    return postJson("/esign/documents", {
      patient_id: patientId,
      doc_type: docType,
      context,
    }, "POST", patientId);
  },

  legalDocumentSign(
    documentId: string,
    payload: { signer_role: string; signer_name: string; attestation: string },
    patientId: string,
  ): Promise<{ document: LegalDocument }> {
    return postJson(`/esign/documents/${encodeURIComponent(documentId)}/sign`, {
      ...payload,
      signature_method: "typed",
    }, "POST", patientId);
  },

  legalDocumentVerify(documentId: string, patientId: string): Promise<LegalDocumentVerification> {
    return getJson(`/esign/documents/${encodeURIComponent(documentId)}/verify`, patientId);
  },

  billingPatientSummary(patientId: string): Promise<BillingPatientSummary> {
    return getJson(`/billing/patient/summary?patient_id=${encodeURIComponent(patientId)}`, patientId);
  },

  patientPayment(
    payload: { patient_id: string; amount_kes?: number; purpose?: string; invoice_id?: string; phone?: string },
    patientId?: string,
  ): Promise<MpesaStkResult> {
    return postJson("/patient/payment", payload, "POST", patientId ?? payload.patient_id);
  },

  mpesaStkPush(
    payload: { patient_id: string; amount_kes?: number; purpose?: string; invoice_id?: string; phone?: string },
    patientId?: string,
  ): Promise<MpesaStkResult> {
    return postJson("/payments/mpesa/stk-push", payload, "POST", patientId ?? payload.patient_id);
  },

  patientCoverage(patientId: string): Promise<{ eligible: boolean; patient_id: string; member?: Record<string, unknown>; policies?: unknown[] }> {
    return getJson(`/insurance/coverage/${encodeURIComponent(patientId)}`, patientId);
  },

  patientClaims(patientId: string): Promise<{ claims: PatientClaim[] }> {
    return getJson(`/insurance/claims?patient_id=${encodeURIComponent(patientId)}`, patientId);
  },

  insuranceSync(patientId: string, sinceVersion = 0): Promise<InsuranceSyncResponse> {
    return getJson(
      `/insurance/sync?patient_id=${encodeURIComponent(patientId)}&since_version=${sinceVersion}`,
      patientId,
    );
  },
};

export type LegalDocumentSignature = {
  id: string;
  signer_role: string;
  signer_name: string;
  signed_at: string;
  signature_hash: string;
};

export type LegalDocument = {
  id: string;
  patient_id: string;
  doc_type: string;
  title: string;
  body: string;
  status: string;
  required_signers: string[];
  signatures: LegalDocumentSignature[];
  verification_code?: string | null;
};

export type LegalDocumentVerification = {
  valid: boolean;
  verification_code?: string | null;
  disclaimer: string;
};

export type PatientClaim = {
  claim_id: string;
  member_id?: string;
  patient_id?: string;
  encounter_id: string;
  provider_id?: string;
  scheme_type: string;
  status: string;
  submitted_amount_kes: number;
  adjudicated_amount_kes?: number | null;
  fraud_score?: number;
  submitted_at?: string;
};

export type InsuranceSyncResponse = {
  sync_version: number;
  updated_at: string;
  changed: boolean;
  coverage_stats?: {
    balance_kes: number;
    used_ytd_kes: number;
    annual_limit_kes: number;
    claims_count: number;
    claims_processed: number;
    renewal_date: string;
    cover_active: boolean;
  };
  patient_claims?: PatientClaim[];
  billing?: BillingPatientSummary;
};

export type BillingPatientSummary = {
  patient_id: string;
  paybill: string;
  account_ref: string;
  currency: string;
  contribution_amount_kes: number;
  total_contributions_kes: number;
  outstanding_total_kes: number;
  next_payment_kes: number;
  membership_status: string;
  mtiba_balance_kes: number;
  contributions: Array<{
    date: string;
    method: string;
    amount: string;
    amount_kes: number;
    status: string;
    mpesa_receipt?: string | null;
  }>;
  transactions: Array<{
    date: string;
    type: string;
    amount: string;
    amount_kes: number;
    method?: string;
    status?: string;
  }>;
  bills: Array<{
    date: string;
    desc: string;
    amount: string;
    amount_kes: number;
    status: string;
    invoice_id?: string;
    balance_kes?: number;
  }>;
};

export type MpesaStkResult = {
  status: string;
  message: string;
  mpesa_receipt?: string | null;
  amount_kes: number;
  paybill: string;
  account_ref: string;
};
