import type { RoleKey } from "../theme/tokens";
import pilotConfig from "../../../../shared/pilot-roles.json";
import type { ModuleSection } from "./modulePull";

export type PilotRoleDef = {
  id: RoleKey;
  keycloakUsername: string;
  label: string;
  signInName: string;
  signInDesc: string;
  registerLabel: string;
  registerTagline: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  landingDesc: string;
  dashboardPath: string;
  portalPath: string;
  v2HtmlPath: string;
  portalTitle: string;
  portalDesc: string;
  emailExample: string;
  regExample: string;
  displayName: string;
};

type PilotConfig = {
  version: number;
  pilotPassword: string;
  signInOrder: RoleKey[];
  landingOrder: RoleKey[];
  modulePullIds: Record<RoleKey, string[]>;
  roles: PilotRoleDef[];
};

const config = pilotConfig as PilotConfig;

const ROLE_MAP = Object.fromEntries(config.roles.map((r) => [r.id, r])) as Record<RoleKey, PilotRoleDef>;

export const PILOT_PASSWORD = config.pilotPassword;
export const PILOT_ROLE_ORDER = config.signInOrder;
export const PILOT_LANDING_ORDER = config.landingOrder;
export const PILOT_MODULE_PULL_IDS = config.modulePullIds;
export const PILOT_ROLES = config.roles;

export function isPilotRole(value: string | null | undefined): value is RoleKey {
  return Boolean(value && value in ROLE_MAP);
}

export function getPilotRole(role: RoleKey): PilotRoleDef {
  return ROLE_MAP[role];
}

export function pilotSignInPath(role: RoleKey): string {
  return `/sign-in?role=${role}`;
}

export function pilotRegisterPath(role: RoleKey): string {
  return `/register?role=${role}`;
}

export type PilotAuthPortal = {
  role: RoleKey;
  icon: string;
  title: string;
  desc: string;
  path: string;
  signInPath: string;
  registerPath: string;
};

export const PILOT_AUTH_PORTALS: PilotAuthPortal[] = PILOT_ROLES.map((r) => ({
  role: r.id,
  icon: r.icon,
  title: r.portalTitle,
  desc: r.portalDesc,
  path: r.portalPath,
  signInPath: pilotSignInPath(r.id),
  registerPath: pilotRegisterPath(r.id),
}));

export type LandingRoleCard = {
  id: RoleKey;
  icon: string;
  label: string;
  color: string;
  bg: string;
  border: string;
  desc: string;
};

export function getLandingRoleCards(): LandingRoleCard[] {
  return PILOT_LANDING_ORDER.map((id) => {
    const r = getPilotRole(id);
    return {
      id,
      icon: r.icon,
      label: r.label,
      color: r.color,
      bg: r.bg,
      border: r.border,
      desc: r.landingDesc,
    };
  });
}

export type RegisterRoleCard = {
  role: RoleKey;
  color: string;
  bg: string;
  border: string;
  label: string;
  icon: string;
  tagline: string;
};

export function getRegisterRoleCards(): RegisterRoleCard[] {
  return PILOT_ROLE_ORDER.map((id) => {
    const r = getPilotRole(id);
    return {
      role: id,
      color: r.color,
      bg: r.bg.replace("0.07", "0.08"),
      border: r.border.replace("0.28", "0.30"),
      label: r.registerLabel,
      icon: r.icon,
      tagline: r.registerTagline,
    };
  });
}

/** v2 auth portal snippet metadata (HTML sync uses shared/pilot-roles.json directly). */
export const PILOT_V2_AUTH_TAG: Record<RoleKey, { tag: string; tagClass: string }> = {
  doctor: { tag: "Core", tagClass: "tag-g" },
  nurse: { tag: "Core", tagClass: "tag-g" },
  lab: { tag: "Core", tagClass: "tag-g" },
  pharmacy: { tag: "Core", tagClass: "tag-g" },
  billing: { tag: "Finance", tagClass: "tag-y" },
  admin: { tag: "Admin", tagClass: "tag-r" },
  patient: { tag: "Patient", tagClass: "tag-b" },
};

export const PILOT_V2_SECTION: Record<RoleKey, ModuleSection | "PATIENT"> = {
  doctor: "CLINICAL",
  nurse: "CLINICAL",
  lab: "CLINICAL",
  pharmacy: "CLINICAL",
  billing: "OPERATIONS",
  admin: "MANAGEMENT",
  patient: "PATIENT",
};
