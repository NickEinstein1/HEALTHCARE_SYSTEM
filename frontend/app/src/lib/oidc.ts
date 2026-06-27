const TOKEN_KEY = "unihealth.access_token";

function envFlag(name: string): boolean {
  const v = (import.meta as { env?: Record<string, string> }).env?.[name];
  return String(v || "").toLowerCase() === "true";
}

function envStr(name: string, fallback = ""): string {
  const v = (import.meta as { env?: Record<string, string> }).env?.[name];
  return (v && String(v).trim()) || fallback;
}

export function oidcEnabled(): boolean {
  return envFlag("VITE_OIDC_ENABLED");
}

/** Client-side expiry check only — gateway still validates JWT. */
export function isAccessTokenExpired(token: string, skewSec = 60): boolean {
  try {
    const part = token.split(".")[1];
    if (!part) return true;
    const payload = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number };
    if (!payload.exp) return false;
    return Date.now() / 1000 >= payload.exp - skewSec;
  } catch {
    return true;
  }
}

export function getStoredAccessToken(): string | null {
  try {
    const token = sessionStorage.getItem(TOKEN_KEY);
    if (!token) return null;
    if (isAccessTokenExpired(token)) {
      sessionStorage.removeItem(TOKEN_KEY);
      return null;
    }
    return token;
  } catch {
    return null;
  }
}

export function setStoredAccessToken(token: string | null): void {
  try {
    if (token) sessionStorage.setItem(TOKEN_KEY, token);
    else sessionStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export async function fetchPasswordGrantToken(
  username: string,
  password: string,
): Promise<string> {
  const issuer = envStr("VITE_OIDC_ISSUER", "http://localhost:8180/realms/unihealth").replace(/\/$/, "");
  const clientId = envStr("VITE_OIDC_CLIENT_ID", "unihealth-spa");
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: clientId,
    username,
    password,
  });
  const res = await fetch(`${issuer}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`OIDC sign-in failed (${res.status})${t ? `: ${t}` : ""}`);
  }
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("OIDC response missing access_token");
  setStoredAccessToken(data.access_token);
  return data.access_token;
}
