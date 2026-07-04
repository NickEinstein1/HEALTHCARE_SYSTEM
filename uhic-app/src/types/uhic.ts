export type UhicRole =
  | "admin"
  | "underwriter"
  | "claims_adjudicator"
  | "compliance_auditor"
  | "broker"
  | "scheme_finance";

export type UhicMember = {
  member_id: string;
  patient_id: string;
  household_id?: string;
  national_id?: string;
  scheme_type: string;
  status: string;
  given_name?: string;
  family_name?: string;
  created_at?: string;
};

export type UhicClaim = {
  claim_id: string;
  member_id: string;
  patient_id?: string;
  encounter_id: string;
  provider_id: string;
  scheme_type: string;
  status: string;
  submitted_amount_kes: number;
  adjudicated_amount_kes?: number | null;
  fraud_score: number;
  fraud_band: string;
  fraud_reasons: string[];
  submitted_at?: string;
  decision_note?: string;
};

export type UhicDashboardSummary = {
  active_members: number;
  active_policies: number;
  claims_submitted: number;
  claims_flagged: number;
  loss_ratio: number;
  reserves: {
    earned_premium_kes: number;
    reported_claims_kes: number;
    ibnr_kes: number;
    case_reserves_kes: number;
    total_incurred_kes: number;
    loss_ratio: number;
    combined_ratio: number;
  };
  schemes: Record<string, number>;
};

export type UhicPremiumQuote = {
  scheme_type: string;
  monthly_contribution_kes?: number;
  monthly_premium_kes?: number;
  annual_premium_kes?: number;
  rate?: number;
  floor_kes?: number;
  cap_kes?: number;
  age_factor?: number;
  occupation_factor?: number;
  claims_history_factor?: number;
};

export type UhicProviderScore = {
  provider_id: string;
  provider_name: string;
  facility_tier: number;
  fraud_score: number;
  outlier_flags: string[];
  rejection_rate_pct: number;
  avg_claim_kes: number;
  last_review: string;
};

export type UhicFraudTrend = {
  flagged_count: number;
  avg_fraud_score: number;
  by_band: Record<string, number>;
};

export type EccifProjection = {
  month: number;
  projected_balance_kes: number;
  net_flow_kes: number;
};

export type InsuranceSyncPayload = {
  sync_version: number;
  updated_at: string;
  changed: boolean;
  claims_count?: number;
  claims?: UhicClaim[];
  patient_claims?: UhicClaim[];
  coverage_stats?: {
    balance_kes: number;
    used_ytd_kes: number;
    annual_limit_kes: number;
    claims_count: number;
    claims_processed: number;
    renewal_date: string;
    cover_active: boolean;
  };
  summary?: UhicDashboardSummary;
};
