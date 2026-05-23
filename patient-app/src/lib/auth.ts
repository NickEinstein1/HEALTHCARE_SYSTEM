import { config } from "./config";
import { clearSession, setAccessToken, setPatientId, setSignedIn } from "./storage";

/** Demo patient sign-in (matches web portal stub flow). */
export async function signInDemo(patientId: string): Promise<void> {
  await setPatientId(patientId || config.defaultPatientId);
  await setSignedIn(true);
}

export async function signInWithOidc(username: string, password: string): Promise<void> {
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
  if (!res.ok) throw new Error(`Sign-in failed (${res.status})`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Missing access token");
  await setAccessToken(data.access_token);
  await setSignedIn(true);
}

export async function signOut(): Promise<void> {
  await clearSession();
}
