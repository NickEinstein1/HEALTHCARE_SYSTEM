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

export type AllergyIntolerance = {
  id: string;
  patient_id: string;
  code?: string | null;
  substance_text?: string | null;
  clinical_status?: string | null;
  criticality?: string | null;
  recorded_date?: string | null;
};

export type ClinicalAiDifferential = {
  name: string;
  icd10: string;
  confidence: number;
  rationale: string;
};

export type ClinicalAiAssessmentResult = {
  assessment_id: string;
  patient_id: string;
  provider: string;
  model_version: string;
  requested_provider?: string;
  llm_error?: string | null;
  context_snapshot?: Record<string, unknown>;
  summary: string;
  symptom_synthesis?: string;
  differential_diagnoses: ClinicalAiDifferential[];
  red_flags: string[];
  recommended_workup: string[];
  drug_interactions?: Array<{ drug_a: string; drug_b: string; severity: string; detail: string }>;
  disclaimer: string;
  generated_at?: string;
  audit_id?: string;
};

export type LegalDocumentSignature = {
  id: string;
  signer_role: string;
  signer_name: string;
  signature_method: string;
  attestation: string;
  signed_at: string;
  signature_hash: string;
  hash_valid?: boolean;
};

export type LegalDocument = {
  id: string;
  patient_id: string;
  doc_type: "poa" | "surgical_consent" | "emergency_consent" | "uploaded";
  title: string;
  body: string;
  summary?: string;
  status: string;
  required_signers: string[];
  signatures: LegalDocumentSignature[];
  verification_code?: string | null;
  context?: Record<string, unknown>;
  created_at?: string;
  completed_at?: string | null;
  expires_at?: string | null;
};

export type LegalDocumentVerification = {
  document_id: string;
  status: string;
  valid: boolean;
  hash_chain_valid: boolean;
  verification_code?: string | null;
  verification_code_valid: boolean;
  signatures: LegalDocumentSignature[];
  required_signers: string[];
  signed_roles: string[];
  disclaimer: string;
};

export type EsignAiAnalysis = {
  analysis_id: string;
  document_id?: string;
  summary: string;
  confidence_pct: number;
  findings: Array<{ type: string; detail: string }>;
  flags: Array<{ severity: string; code: string; detail: string }>;
  recommended_actions: string[];
  analyzed_at?: string;
  disclaimer: string;
};

export type EsignVerificationStep = {
  id: string;
  status: "passed" | "failed" | "warning" | "pending" | "skipped";
  detail: string;
};

export type EsignVerificationProcess = {
  status: string;
  initiated_at: string;
  steps: EsignVerificationStep[];
  passed_count: number;
  warning_count: number;
  failed_count: number;
  verification?: LegalDocumentVerification;
  disclaimer: string;
};

export type EsignDocumentView = {
  document_id: string;
  title?: string;
  doc_type?: string;
  filename?: string;
  mime_type?: string;
  text_content?: string;
  data_url?: string | null;
  body?: string;
};

export type ReferralRecord = {
  id: string;
  patient_id: string;
  patient_name: string;
  hospital_id?: string | null;
  hospital_name: string;
  department: string;
  priority: string;
  clinical_summary?: string | null;
  status: string;
  created_by_role?: string;
  created_at?: string;
};

export type BillingInvoice = {
  id: string;
  patient_id: string;
  patient_name?: string;
  description: string;
  amount_kes: number;
  balance_kes: number;
  status: string;
  issued_at?: string;
  due_at?: string | null;
  paid_at?: string | null;
};

export type BillingPayment = {
  id: string;
  invoice_id?: string | null;
  patient_id: string;
  method: string;
  purpose: string;
  amount_kes: number;
  status: string;
  mpesa_receipt?: string | null;
  phone?: string | null;
  created_at?: string;
  completed_at?: string | null;
};

export type BillingContributionRow = {
  date: string;
  method: string;
  amount: string;
  amount_kes: number;
  status: string;
  mpesa_receipt?: string | null;
};

export type BillingBillRow = {
  date: string;
  desc: string;
  amount: string;
  amount_kes: number;
  status: string;
  invoice_id?: string;
  balance_kes?: number;
};

export type BillingTransactionRow = {
  date: string;
  type: string;
  amount: string;
  amount_kes: number;
  method?: string;
  status?: string;
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
  invoices: BillingInvoice[];
  payments: BillingPayment[];
  contributions: BillingContributionRow[];
  transactions: BillingTransactionRow[];
  bills: BillingBillRow[];
};

export type MpesaStkResult = {
  status: string;
  checkout_request_id: string;
  merchant_request_id: string;
  amount_kes: number;
  phone: string;
  paybill: string;
  account_ref: string;
  purpose: string;
  invoice_id?: string | null;
  mpesa_receipt?: string | null;
  payment_id?: string;
  message: string;
  simulated?: boolean;
};

