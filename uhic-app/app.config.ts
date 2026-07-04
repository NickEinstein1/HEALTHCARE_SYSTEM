import { ExpoConfig, ConfigContext } from "expo/config";

function env(key: string, fallback: string): string {
  return (process.env[key] ?? "").trim() || fallback;
}

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: "UHIC",
  slug: "unihealth-uhic",
  extra: {
    apiBaseUrl: env("EXPO_PUBLIC_API_BASE_URL", "http://localhost:8100"),
    defaultRole: env("EXPO_PUBLIC_DEFAULT_ROLE", "claims_adjudicator"),
    defaultFacilityId: env("EXPO_PUBLIC_DEFAULT_FACILITY_ID", "FAC-A"),
  },
});
