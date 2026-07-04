import { getStoredAccessToken, oidcEnabled } from "./oidc";

/**
 * Auth headers for gateway calls.
 * - Production (OIDC on): Bearer only when token present.
 * - Pilot/local: role header when no token (or alongside token if OIDC fallback is on server-side).
 */
export function authHeaders(role?: string): Record<string, string> {
  const h: Record<string, string> = {};
  const token = getStoredAccessToken();
  if (token) h.Authorization = `Bearer ${token}`;
  if (role && (!token || !oidcEnabled())) {
    h["X-UniHealth-Role"] = role;
  }
  return h;
}
