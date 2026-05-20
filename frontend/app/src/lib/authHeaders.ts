import { getStoredAccessToken } from "./oidc";

/** Bearer token when present; otherwise legacy role header for local dev. */
export function authHeaders(role?: string): Record<string, string> {
  const h: Record<string, string> = {};
  const token = getStoredAccessToken();
  if (token) h.Authorization = `Bearer ${token}`;
  else if (role) h["X-UniHealth-Role"] = role;
  return h;
}
