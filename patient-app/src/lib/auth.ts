import { config } from "./config";
import { clearSession, setAccessToken, setPatientId, setSignedIn } from "./storage";

export type OtpRequestResult = {
  status: string;
  patient_id: string;
  phone_masked?: string;
  expires_in_seconds?: number;
  message?: string;
  debug_otp?: string;
};

export type OtpVerifyResult = {
  status: string;
  patient_id: string;
  auth_mode: "oidc" | "patient_session" | string;
  access_token?: string;
  token_type?: string;
  expires_in?: number;
  message?: string;
};

/** Patient sign-in after MFA (local session; optional Bearer token). */
export async function signInPatient(patientId: string, accessToken?: string | null): Promise<void> {
  await setPatientId(patientId || config.defaultPatientId);
  if (accessToken) await setAccessToken(accessToken);
  await setSignedIn(true);
}

export async function requestPatientOtp(patientId: string, phone: string): Promise<OtpRequestResult> {
  const res = await fetch(`${config.apiBaseUrl}/auth/patient/otp/request`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ patient_id: patientId, phone }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `OTP request failed (${res.status})`);
  }
  return res.json() as Promise<OtpRequestResult>;
}

export async function verifyPatientOtp(
  patientId: string,
  phone: string,
  code: string,
): Promise<OtpVerifyResult> {
  const res = await fetch(`${config.apiBaseUrl}/auth/patient/otp/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ patient_id: patientId, phone, code }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(t || `OTP verify failed (${res.status})`);
  }
  return res.json() as Promise<OtpVerifyResult>;
}

/** Keycloak password grant — use after OTP when ``EXPO_PUBLIC_OIDC_ENABLED=true``. */
export async function signInWithOidc(username: string, password: string): Promise<string> {
  const body = new URLSearchParams({
    grant_type: "password",
    client_id: config.oidcClientId,
    username,
    password,
  });
  const res = await fetch(`${config.oidcIssuer}/protocol/openid-connect/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) throw new Error(`OIDC sign-in failed (${res.status})`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Missing access token");
  await setAccessToken(data.access_token);
  return data.access_token;
}

/**
 * Complete MFA: verify OTP, then attach session token (gateway) or OIDC token.
 * ``pin`` is only used when OIDC is enabled (password grant).
 */
export async function completePatientMfa(opts: {
  patientId: string;
  phone: string;
  code: string;
  pin?: string;
}): Promise<{ patientId: string; authMode: string }> {
  const verified = await verifyPatientOtp(opts.patientId, opts.phone, opts.code);
  const pid = verified.patient_id || opts.patientId;

  if (config.oidcEnabled) {
    if (!opts.pin) throw new Error("PIN required for OIDC sign-in");
    await signInWithOidc(pid, opts.pin);
    await setPatientId(pid);
    await setSignedIn(true);
    return { patientId: pid, authMode: "oidc" };
  }

  if (!verified.access_token) {
    throw new Error("No session token returned — check API /auth/patient/otp/verify");
  }
  await signInPatient(pid, verified.access_token);
  return { patientId: pid, authMode: verified.auth_mode || "patient_session" };
}

export async function signOut(): Promise<void> {
  await clearSession();
}
