import { ExpoConfig, ConfigContext } from "expo/config";

/**
 * Runtime config: set values in `.env` (see `.env.example`).
 * Only `EXPO_PUBLIC_*` variables are embedded in the app bundle.
 */
function env(key: string, fallback: string): string {
  return (process.env[key] ?? "").trim() || fallback;
}

function envBool(key: string): boolean {
  return String(process.env[key] ?? "").toLowerCase() === "true";
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "UniHealth Patient",
  slug: "unihealth-patient",
  extra: {
    apiBaseUrl: env("EXPO_PUBLIC_API_BASE_URL", "http://localhost:8100"),
    oidcEnabled: envBool("EXPO_PUBLIC_OIDC_ENABLED"),
    oidcIssuer: env("EXPO_PUBLIC_OIDC_ISSUER", "http://localhost:8180/realms/unihealth"),
    oidcClientId: env("EXPO_PUBLIC_OIDC_CLIENT_ID", "unihealth-spa"),
    defaultPatientId: env("EXPO_PUBLIC_DEFAULT_PATIENT_ID", "P001"),
  },
});
