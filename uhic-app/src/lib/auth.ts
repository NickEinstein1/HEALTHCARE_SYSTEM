import { getFacilityId, getRole, setFacilityId, setRole, setSignedIn, setDisplayName, clearSession } from "./storage";
import { config } from "./config";
import type { UhicRole } from "../types/uhic";

export const UHIC_ROLES: { id: UhicRole; label: string; desc: string }[] = [
  { id: "claims_adjudicator", label: "Claims Adjudicator", desc: "Submit & decide claims" },
  { id: "underwriter", label: "Underwriter", desc: "Risk rating & policies" },
  { id: "scheme_finance", label: "Scheme Finance", desc: "Premiums & ECCIF" },
  { id: "compliance_auditor", label: "Compliance Auditor", desc: "Fraud & audit trail" },
  { id: "broker", label: "Broker", desc: "Member onboarding" },
  { id: "admin", label: "Administrator", desc: "Full UHIC console" },
];

export async function signIn(opts: { role: UhicRole; facilityId: string; displayName: string }): Promise<void> {
  await setRole(opts.role);
  await setFacilityId(opts.facilityId || config.defaultFacilityId);
  await setDisplayName(opts.displayName);
  await setSignedIn(true);
}

export async function signOut(): Promise<void> {
  await clearSession();
}

export async function sessionHeaders(): Promise<Record<string, string>> {
  const role = (await getRole()) || config.defaultRole;
  const facility = (await getFacilityId()) || config.defaultFacilityId;
  return {
    Accept: "application/json",
    "X-UniHealth-Role": role,
    "X-Facility-Id": facility,
  };
}
