import { sessionHeaders } from "./auth";
import { config } from "./config";
import type {
  EccifProjection,
  UhicClaim,
  UhicDashboardSummary,
  UhicFraudTrend,
  UhicMember,
  UhicPremiumQuote,
  UhicProviderScore,
  InsuranceSyncPayload,
} from "../types/uhic";

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${config.apiBaseUrl}${path}`, { headers: await sessionHeaders() });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${res.status}${t ? ` — ${t}` : ""}`);
  }
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${config.apiBaseUrl}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(await sessionHeaders()) },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`${res.status}${t ? ` — ${t}` : ""}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  uhicSummary(): Promise<UhicDashboardSummary> {
    return getJson("/insurance/uhic/summary");
  },

  uhicMembers(params?: { scheme_type?: string; status?: string }): Promise<{ members: UhicMember[] }> {
    const q = new URLSearchParams();
    if (params?.scheme_type) q.set("scheme_type", params.scheme_type);
    if (params?.status) q.set("status", params.status);
    const suffix = q.toString() ? `?${q}` : "";
    return getJson(`/insurance/members${suffix}`);
  },

  uhicClaims(params?: { member_id?: string; status?: string }): Promise<{ claims: UhicClaim[] }> {
    const q = new URLSearchParams();
    if (params?.member_id) q.set("member_id", params.member_id);
    if (params?.status) q.set("status", params.status);
    const suffix = q.toString() ? `?${q}` : "";
    return getJson(`/insurance/claims${suffix}`);
  },

  uhicSubmitClaim(payload: Record<string, unknown>): Promise<{ status: string; claim: UhicClaim }> {
    return postJson("/insurance/claims", payload);
  },

  uhicDecideClaim(
    claimId: string,
    payload: { decision: string; note?: string },
  ): Promise<{ status: string; claim: UhicClaim }> {
    return postJson(`/insurance/claims/${claimId}/decision`, payload);
  },

  uhicPremiumQuote(payload: Record<string, unknown>): Promise<UhicPremiumQuote> {
    return postJson("/insurance/premium/quote", payload);
  },

  uhicActuarialReserves(): Promise<UhicDashboardSummary["reserves"]> {
    return getJson("/insurance/actuarial/reserves");
  },

  uhicActuarialForecast(months = 12): Promise<{
    eccif_projection: EccifProjection[];
    assumptions: Record<string, number>;
  }> {
    return getJson(`/insurance/actuarial/forecast?months=${months}`);
  },

  uhicProviderScores(): Promise<{ providers: UhicProviderScore[] }> {
    return getJson("/insurance/providers/risk-scores");
  },

  uhicFraudTrend(): Promise<UhicFraudTrend> {
    return getJson("/audit/aggregate/fraud-trend");
  },

  insuranceSync(sinceVersion = 0, includeSummary = true): Promise<InsuranceSyncPayload> {
    const q = new URLSearchParams();
    q.set("since_version", String(sinceVersion));
    if (includeSummary) q.set("include_summary", "true");
    return getJson(`/insurance/sync?${q}`);
  },
};
