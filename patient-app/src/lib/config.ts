import Constants from "expo-constants";

/**
 * App config from Expo `extra` (populated from `.env` via app.config.ts).
 * Restart Metro after changing `.env`.
 */
type Extra = {
  apiBaseUrl?: string;
  oidcEnabled?: boolean;
  oidcIssuer?: string;
  oidcClientId?: string;
  defaultPatientId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

export const config = {
  apiBaseUrl: stripTrailingSlash(extra.apiBaseUrl ?? "http://localhost:8100"),
  oidcEnabled: Boolean(extra.oidcEnabled),
  oidcIssuer: stripTrailingSlash(extra.oidcIssuer ?? "http://localhost:8180/realms/unihealth"),
  oidcClientId: extra.oidcClientId ?? "unihealth-spa",
  defaultPatientId: extra.defaultPatientId ?? "P001",
} as const;

/** Surfaces missing `.env` in dev when Metro did not load EXPO_PUBLIC_* vars. */
export function assertEnvLoaded(): void {
  if (__DEV__ && !extra.apiBaseUrl) {
    console.warn(
      "[UniHealth] EXPO_PUBLIC_API_BASE_URL not in app config. Copy patient-app/.env.example to .env and restart Expo.",
    );
  }
}
