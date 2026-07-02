// UniHealth 360 — Shared API Client
// Both apps use this. Each app sets EXPO_PUBLIC_API_BASE_URL in their own .env

import { Platform } from 'react-native';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL ?? 'https://api.unihealth360.ke';

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: object;
  token?: string;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, token } = opts;

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Client-Platform': Platform.OS,
    'X-Client-Version': process.env.EXPO_PUBLIC_APP_VERSION ?? '1.0.0',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ message: res.statusText }));
    throw new Error(err.message ?? `HTTP ${res.status}`);
  }

  return res.json() as Promise<T>;
}

// ─── Clinical API ─────────────────────────────────────────────────────────────
export const clinicalApi = {
  encounter: (id: string, token: string) =>
    request(`/clinical/encounters/${id}`, { token }),

  encounters: (providerId: string, token: string) =>
    request(`/clinical/encounters?provider_id=${providerId}`, { token }),

  patientEncounters: (patientId: string, token: string) =>
    request(`/clinical/encounters?patient_id=${patientId}`, { token }),

  observations: (encounterId: string, token: string) =>
    request(`/clinical/observations?encounter_id=${encounterId}`, { token }),
};

// ─── Insurance API ────────────────────────────────────────────────────────────
export const insuranceApi = {
  // Coverage / Eligibility
  coverage: (patientId: string, token: string) =>
    request(`/insurance/coverage/${patientId}`, { token }),

  eligibility: (memberId: string, token: string) =>
    request(`/insurance/eligibility/${memberId}`, { token }),

  // Members
  member: (id: string, token: string) =>
    request(`/insurance/members/${id}`, { token }),

  memberByPatient: (patientId: string, token: string) =>
    request(`/insurance/members/by-patient/${patientId}`, { token }),

  updateMember: (id: string, data: object, token: string) =>
    request(`/insurance/members/${id}`, { method: 'PATCH', body: data, token }),

  dependants: (memberId: string, token: string) =>
    request(`/insurance/members/${memberId}/dependants`, { token }),

  addDependant: (memberId: string, data: object, token: string) =>
    request(`/insurance/members/${memberId}/dependants`, { method: 'POST', body: data, token }),

  // Claims
  memberClaims: (memberId: string, token: string) =>
    request(`/insurance/claims?member_id=${memberId}`, { token }),

  providerClaims: (providerId: string, token: string) =>
    request(`/insurance/claims?provider_id=${providerId}`, { token }),

  flaggedClaims: (token: string) =>
    request(`/insurance/claims?status=flagged`, { token }),

  claim: (id: string, token: string) =>
    request(`/insurance/claims/${id}`, { token }),

  submitClaim: (data: object, token: string) =>
    request(`/insurance/claims`, { method: 'POST', body: data, token }),

  decideClaim: (id: string, data: object, token: string) =>
    request(`/insurance/claims/${id}/decision`, { method: 'POST', body: data, token }),

  // Pre-authorization
  preauth: (id: string, token: string) =>
    request(`/insurance/preauth/${id}`, { token }),

  submitPreauth: (data: object, token: string) =>
    request(`/insurance/preauth`, { method: 'POST', body: data, token }),

  providerPreauths: (providerId: string, token: string) =>
    request(`/insurance/preauth?provider_id=${providerId}`, { token }),

  encounterPreauth: (encounterId: string, token: string) =>
    request(`/insurance/preauth/${encounterId}`, { token }),

  // Premiums
  premiumStatus: (memberId: string, token: string) =>
    request(`/insurance/premium/status/${memberId}`, { token }),

  initiateMpesa: (data: object, token: string) =>
    request(`/insurance/premium/mpesa`, { method: 'POST', body: data, token }),

  // EOB
  eob: (claimId: string, token: string) =>
    request(`/insurance/eob/${claimId}`, { token }),

  memberEobs: (memberId: string, token: string) =>
    request(`/insurance/eob?member_id=${memberId}`, { token }),

  // Policies
  policies: (memberId: string, token: string) =>
    request(`/insurance/policies?member_id=${memberId}`, { token }),
};

// ─── AI / Audit API ───────────────────────────────────────────────────────────
export const auditApi = {
  flags: (token: string) =>
    request(`/audit/flags`, { token }),

  providerScore: (providerId: string, token: string) =>
    request(`/audit/providers/${providerId}/score`, { token }),

  fraudTrend: (token: string) =>
    request(`/audit/aggregate/fraud-trend`, { token }),

  exportLog: (from: string, to: string, token: string) =>
    request(`/audit/log/export?from=${from}&to=${to}`, { token }),
};
