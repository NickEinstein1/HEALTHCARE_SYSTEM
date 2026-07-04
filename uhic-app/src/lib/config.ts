import Constants from "expo-constants";
import type { UhicRole } from "../types/uhic";

type Extra = {
  apiBaseUrl?: string;
  defaultRole?: string;
  defaultFacilityId?: string;
};

const extra = (Constants.expoConfig?.extra ?? {}) as Extra;

function stripTrailingSlash(url: string) {
  return url.replace(/\/$/, "");
}

export const config = {
  apiBaseUrl: stripTrailingSlash(extra.apiBaseUrl ?? "http://localhost:8100"),
  defaultRole: (extra.defaultRole ?? "claims_adjudicator") as UhicRole,
  defaultFacilityId: extra.defaultFacilityId ?? "FAC-A",
} as const;

export function assertEnvLoaded(): void {
  if (__DEV__ && !extra.apiBaseUrl) {
    console.warn(
      "[UHIC] EXPO_PUBLIC_API_BASE_URL not in app config. Copy uhic-app/.env.example to .env and restart Expo.",
    );
  }
}
