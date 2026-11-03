import type { ComponentType } from "react";
import type { RoleKey } from "../theme/tokens";
import { EMRDashboard } from "../pages/EMRDashboard";
import { AdminDashboard } from "../pages/dashboards/AdminDashboard";
import { BillingDashboard } from "../pages/dashboards/BillingDashboard";
import { DoctorDashboard } from "../pages/dashboards/DoctorDashboard";
import { LabDashboard } from "../pages/dashboards/LabDashboard";
import { NurseDashboard } from "../pages/dashboards/NurseDashboard";
import { PatientDashboard } from "../pages/dashboards/PatientDashboard";
import { PharmacyDashboard } from "../pages/dashboards/PharmacyDashboard";
import {
  AnalyticsDashboard,
  AdministrationDashboard,
  FleetDashboard,
  HRDashboard,
  ICUDashboard,
  InsuranceDashboard,
  UHICModule,
  InventoryDashboard,
  MaternityDashboard,
  MortuaryDashboard,
  NutritionDashboard,
  RadiologyDashboard,
  RehabilitationDashboard,
  ResearchDashboard,
  SuperAdminDashboard,
  SurgeryDashboard,
  TelemediciDashboard,
} from "../pages/dashboards/v2Modules";

/** Six production dashboards — unchanged sign-in / staff flows. */
export const LEGACY_DASHBOARD_ROLES: RoleKey[] = [
  "doctor",
  "nurse",
  "lab",
  "pharmacy",
  "admin",
  "patient",
];

export function isLegacyDashboardRole(x: string | undefined): x is RoleKey {
  return !!x && (LEGACY_DASHBOARD_ROLES as string[]).includes(x);
}

const LEGACY_COMPONENTS: Record<RoleKey, ComponentType> = {
  doctor: DoctorDashboard,
  nurse: NurseDashboard,
  patient: PatientDashboard,
  admin: AdminDashboard,
  lab: LabDashboard,
  pharmacy: PharmacyDashboard,
  billing: BillingDashboard,
};

export function resolveLegacyDashboard(role: string | undefined): ComponentType {
  const slug = (role ?? "admin").toLowerCase();
  if (isLegacyDashboardRole(slug)) return LEGACY_COMPONENTS[slug];
  return AdminDashboard;
}

/** v2.0 UniHealth 360 module slugs → `/modules/:module` */
export const V2_MODULE_SLUGS = [
  "emr",
  "maternity",
  "nicu",
  "radiology",
  "icu",
  "surgery",
  "rehab",
  "nutrition",
  "billing",
  "insurance",
  "uhic",
  "inventory",
  "fleet",
  "mortuary",
  "teleconsult",
  "telemedicine",
  "administration",
  "hr",
  "analytics",
  "research",
  "superadmin",
  "it",
] as const;

export type V2ModuleSlug = (typeof V2_MODULE_SLUGS)[number];

const V2_MODULE_COMPONENTS: Record<string, ComponentType> = {
  emr: EMRDashboard,
  maternity: MaternityDashboard,
  nicu: MaternityDashboard,
  radiology: RadiologyDashboard,
  icu: ICUDashboard,
  surgery: SurgeryDashboard,
  rehab: RehabilitationDashboard,
  nutrition: NutritionDashboard,
  billing: BillingDashboard,
  insurance: InsuranceDashboard,
  uhic: UHICModule,
  inventory: InventoryDashboard,
  fleet: FleetDashboard,
  mortuary: MortuaryDashboard,
  teleconsult: TelemediciDashboard,
  telemedicine: TelemediciDashboard,
  administration: AdministrationDashboard,
  hr: HRDashboard,
  analytics: AnalyticsDashboard,
  research: ResearchDashboard,
  superadmin: SuperAdminDashboard,
  it: AdministrationDashboard,
};

/** Old portal links used `/dashboard/emr` — map to v2 components for redirect. */
export const V2_SLUGS_UNDER_DASHBOARD_PREFIX = V2_MODULE_SLUGS;

export function resolveV2Module(slug: string | undefined): ComponentType | null {
  if (!slug) return null;
  return V2_MODULE_COMPONENTS[slug.toLowerCase()] ?? null;
}

export function isV2ModuleSlug(slug: string): slug is V2ModuleSlug {
  return (V2_MODULE_SLUGS as readonly string[]).includes(slug);
}

export type ModuleNavItem = { icon: string; label: string; path: string; desc?: string };
export type ModuleNavSection = { section: string; items: ModuleNavItem[] };

/** Portal + v2 sidebar — production roles stay on `/dashboard/*`, modules on `/modules/*`. */
export const V2_MODULE_NAV: ModuleNavSection[] = [
  {
    section: "CLINICAL",
    items: [
      { icon: "mod.emr", label: "EMR / EHR", path: "/modules/emr", desc: "Electronic Medical Records" },
      { icon: "mod.maternity", label: "Maternity & NICU", path: "/modules/maternity", desc: "Maternal & Neonatal Care" },
      { icon: "mod.lab", label: "Laboratory", path: "/dashboard/lab", desc: "Lab Tests & Results" },
      { icon: "mod.radiology", label: "Radiology", path: "/modules/radiology", desc: "Imaging & Scans" },
      { icon: "mod.pharmacy", label: "Pharmacy", path: "/dashboard/pharmacy", desc: "Medication Management" },
      { icon: "mod.icu", label: "ICU & Emergency", path: "/modules/icu", desc: "Critical Care" },
      { icon: "mod.surgery", label: "Surgery", path: "/modules/surgery", desc: "Surgical Operations" },
      { icon: "mod.rehab", label: "Rehabilitation", path: "/modules/rehab", desc: "Patient Recovery" },
      { icon: "mod.nutrition", label: "Nutrition", path: "/modules/nutrition", desc: "Nutritional Care" },
    ],
  },
  {
    section: "OPERATIONS",
    items: [
      { icon: "mod.billing", label: "Billing", path: "/modules/billing", desc: "Financial Management" },
      { icon: "mod.cic", label: "UHIC Insurance", path: "/modules/uhic", desc: "UniHealth Insurance Cover · actuarial & claims" },
      { icon: "mod.cic", label: "Insurance (legacy)", path: "/modules/insurance", desc: "Alias to UHIC module" },
      { icon: "mod.inventory", label: "Inventory", path: "/modules/inventory", desc: "Stock Management" },
      { icon: "mod.fleet", label: "Ambulance", path: "/modules/fleet", desc: "Fleet Management" },
      { icon: "mod.mortuary", label: "Mortuary", path: "/modules/mortuary", desc: "Mortuary Services" },
      { icon: "mod.teleconsult", label: "Telemedicine", path: "/modules/teleconsult", desc: "Remote Consultation" },
    ],
  },
  {
    section: "MANAGEMENT",
    items: [
      { icon: "mod.admin", label: "Administration", path: "/modules/administration", desc: "System Management" },
      { icon: "mod.hr", label: "HR & Payroll", path: "/modules/hr", desc: "Personnel Management" },
      { icon: "ui.chart", label: "AI Analytics", path: "/modules/analytics", desc: "Data Intelligence" },
      { icon: "mod.research", label: "Research", path: "/modules/research", desc: "Clinical Research" },
      { icon: "mod.patient", label: "Patient Portal", path: "/dashboard/patient", desc: "Patient Dashboard" },
    ],
  },
];
