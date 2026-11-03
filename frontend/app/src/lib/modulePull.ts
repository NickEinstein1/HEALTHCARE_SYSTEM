import type { RoleKey } from "../theme/tokens";
import { PILOT_MODULE_PULL_IDS } from "./pilotRoles";

export type ModuleSection = "CLINICAL" | "OPERATIONS" | "MANAGEMENT" | "INTEGRATIONS" | "PLATFORM";

export type MasterModule = {
  id: string;
  label: string;
  path: string;
  icon: string;
  section: ModuleSection;
  desc?: string;
  maternity?: boolean;
};

/** Full integrated module grid — aligned with unihealth360-final.html */
export const MASTER_INTEGRATED_MODULES: MasterModule[] = [
  { id: "emr", label: "EMR", path: "/modules/emr", icon: "mod.emr", section: "CLINICAL", desc: "Electronic Medical Records" },
  { id: "billing", label: "Billing", path: "/modules/billing", icon: "mod.billing", section: "OPERATIONS", desc: "Financial management" },
  { id: "maternity", label: "Maternity", path: "/modules/maternity", icon: "mod.maternity", section: "CLINICAL", desc: "Maternal care", maternity: true },
  { id: "nicu", label: "NICU", path: "/modules/maternity", icon: "mod.nicu", section: "CLINICAL", desc: "Neonatal ICU", maternity: true },
  { id: "cic", label: "CIC", path: "/modules/uhic", icon: "mod.cic", section: "INTEGRATIONS", desc: "CIC Insurance via UHIC" },
  { id: "old_mutual", label: "Old Mutual", path: "/modules/uhic", icon: "mod.old_mutual", section: "INTEGRATIONS", desc: "Old Mutual via UHIC" },
  { id: "lab", label: "Lab", path: "/dashboard/lab", icon: "mod.lab", section: "CLINICAL", desc: "Laboratory services" },
  { id: "pharmacy", label: "Pharmacy", path: "/dashboard/pharmacy", icon: "mod.pharmacy", section: "CLINICAL", desc: "Pharmacy & dispensing" },
  { id: "radiology", label: "Radiology", path: "/modules/radiology", icon: "mod.radiology", section: "CLINICAL", desc: "Imaging & PACS" },
  { id: "teleconsult", label: "Teleconsult", path: "/modules/teleconsult", icon: "mod.teleconsult", section: "CLINICAL", desc: "Telemedicine" },
  { id: "icu", label: "ICU", path: "/modules/icu", icon: "mod.icu", section: "CLINICAL", desc: "Critical care" },
  { id: "emergency", label: "Emergency", path: "/modules/icu", icon: "mod.emergency", section: "CLINICAL", desc: "Emergency department" },
  { id: "surgery", label: "Surgery", path: "/modules/surgery", icon: "mod.surgery", section: "CLINICAL", desc: "Surgical operations" },
  { id: "fetal_monitor", label: "Fetal Mon.", path: "/modules/maternity", icon: "mod.fetal", section: "CLINICAL", desc: "Fetal monitoring", maternity: true },
  { id: "kemsa", label: "KEMSA", path: "/dashboard/pharmacy", icon: "mod.kemsa", section: "INTEGRATIONS", desc: "KEMSA supply orders" },
  { id: "oncology", label: "Oncology", path: "/modules/emr", icon: "mod.oncology", section: "CLINICAL", desc: "Oncology workflows" },
  { id: "ai_engine", label: "AI Engine", path: "/modules/analytics", icon: "mod.ai", section: "PLATFORM", desc: "AI analytics & risk" },
  { id: "iot_monitor", label: "IoT Mon.", path: "/modules/icu", icon: "mod.iot", section: "PLATFORM", desc: "Device & IoT monitoring" },
];

const MODULE_BY_ID = Object.fromEntries(MASTER_INTEGRATED_MODULES.map((m) => [m.id, m])) as Record<string, MasterModule>;

/** RBAC → Module Pull API (unihealth360-auth-portal-v2.html). Synced via shared/pilot-roles.json */
export const ROLE_MODULE_PULL_IDS: Record<RoleKey, string[]> = PILOT_MODULE_PULL_IDS;

const PULL_ALIASES: Record<string, MasterModule | undefined> = {
  ward: { id: "ward", label: "Ward Mgmt", path: "/dashboard/nurse", icon: "ui.bed", section: "CLINICAL", desc: "Nurse station" },
  medication: { id: "medication", label: "Medication", path: "/dashboard/nurse", icon: "ui.syringe", section: "CLINICAL" },
  vitals: { id: "vitals", label: "Vitals", path: "/dashboard/nurse", icon: "ui.chart", section: "CLINICAL" },
  maternal_panels: { id: "maternal_panels", label: "Maternal Bloods", path: "/dashboard/lab", icon: "ui.blood", section: "CLINICAL", maternity: true },
  nicu_labs: { id: "nicu_labs", label: "Neonatal Screen", path: "/dashboard/lab", icon: "mod.nicu", section: "CLINICAL", maternity: true },
  results: { id: "results", label: "Results", path: "/dashboard/lab", icon: "ui.file", section: "CLINICAL" },
  inventory: { id: "inventory", label: "Drug Stock", path: "/modules/inventory", icon: "mod.inventory", section: "OPERATIONS" },
  maternity_meds: { id: "maternity_meds", label: "Maternity Meds", path: "/dashboard/pharmacy", icon: "mod.maternity", section: "CLINICAL", maternity: true },
  prescriptions: { id: "prescriptions", label: "Prescriptions", path: "/dashboard/pharmacy", icon: "ui.notebook", section: "CLINICAL" },
  patient_portal: { id: "patient_portal", label: "My Records", path: "/dashboard/patient", icon: "mod.patient", section: "CLINICAL" },
  appointments: { id: "appointments", label: "Appointments", path: "/dashboard/patient", icon: "ui.calendar", section: "CLINICAL" },
  lab_results: { id: "lab_results", label: "Lab Results", path: "/dashboard/patient", icon: "mod.lab", section: "CLINICAL" },
  maternity_records: { id: "maternity_records", label: "Maternity Records", path: "/dashboard/patient", icon: "mod.maternity", section: "CLINICAL", maternity: true },
};

export function resolveModuleId(id: string): MasterModule | undefined {
  return MODULE_BY_ID[id] ?? PULL_ALIASES[id];
}

export function getModulesForRole(role: RoleKey): MasterModule[] {
  const ids = ROLE_MODULE_PULL_IDS[role];
  if (ids.includes("*")) return MASTER_INTEGRATED_MODULES;
  const seen = new Set<string>();
  const out: MasterModule[] = [];
  for (const id of ids) {
    const mod = resolveModuleId(id);
    if (!mod || seen.has(`${mod.path}:${mod.label}`)) continue;
    seen.add(`${mod.path}:${mod.label}`);
    out.push(mod);
  }
  return out;
}

export type DashboardPreview = {
  sessionLabel: string;
  bars: Array<{ label: string; value: string; pct: number; maternity?: boolean }>;
  modLabels: string[];
};

export const ROLE_DASHBOARD_PREVIEW: Record<RoleKey, DashboardPreview> = {
  doctor: {
    sessionLabel: "Doctor — Central Referral Hospital",
    bars: [
      { label: "Active Patients", value: "24", pct: 80 },
      { label: "Maternity Referrals", value: "6", pct: 40, maternity: true },
      { label: "Appointments Today", value: "18", pct: 75 },
    ],
    modLabels: ["EMR", "Prescriptions", "Lab Orders", "Maternity", "Telemedicine", "CIC Billing"],
  },
  nurse: {
    sessionLabel: "Nurse — Coastal Regional Hospital",
    bars: [
      { label: "Ward Occupancy", value: "92%", pct: 92 },
      { label: "Maternity Patients", value: "19", pct: 65, maternity: true },
      { label: "Medication Rounds", value: "On schedule", pct: 100 },
    ],
    modLabels: ["Patient Care", "Vitals", "Maternity", "NICU", "Ward Mgmt", "Medication"],
  },
  lab: {
    sessionLabel: "Lab Technician — Central Referral Hospital",
    bars: [
      { label: "Pending Samples", value: "34", pct: 65 },
      { label: "Maternal Samples", value: "12", pct: 45, maternity: true },
      { label: "Neonatal Screens", value: "5", pct: 25, maternity: true },
    ],
    modLabels: ["Sample Queue", "Results Entry", "LIMS", "QC", "Maternal Bloods", "Neonatal Screen"],
  },
  pharmacy: {
    sessionLabel: "Pharmacist — Central Referral Hospital",
    bars: [
      { label: "Dispense Queue", value: "47", pct: 70 },
      { label: "Stock Level", value: "82%", pct: 82 },
      { label: "KEMSA Orders", value: "3 pending", pct: 30 },
    ],
    modLabels: ["Dispensing", "Drug Stock", "KEMSA Orders", "Prescriptions", "Maternity Meds", "Reports"],
  },
  billing: {
    sessionLabel: "Billing Officer — Central Health Authority",
    bars: [
      { label: "Invoices Today", value: "156", pct: 72 },
      { label: "M-Pesa Collections", value: "KES 84K", pct: 84 },
      { label: "Unpaid Invoices", value: "34", pct: 34 },
    ],
    modLabels: ["Invoices", "M-Pesa", "Insurance", "Inventory", "Reports", "Reconciliation"],
  },
  admin: {
    sessionLabel: "Administrator — Central Health Authority",
    bars: [
      { label: "Staff On Duty", value: "284", pct: 88 },
      { label: "Budget Utilisation", value: "73%", pct: 73 },
      { label: "Open Procurement", value: "12", pct: 48 },
    ],
    modLabels: ["HR/Payroll", "Finance", "Procurement", "Maternity Reports", "CIC Billing", "Audit"],
  },
  patient: {
    sessionLabel: "Patient — ModelCover Self-Service",
    bars: [
      { label: "Last Visit", value: "7 days ago", pct: 0 },
      { label: "Pending Appts", value: "2", pct: 40 },
      { label: "Maternity Record", value: "Active", pct: 80, maternity: true },
    ],
    modLabels: ["My Records", "Appointments", "Lab Results", "Maternity Records", "CIC Insurance", "Teleconsult"],
  },
};

const DEFAULT_PREVIEW: DashboardPreview = {
  sessionLabel: "Select a role to preview dashboard",
  bars: [
    { label: "Bed Occupancy", value: "96%", pct: 96 },
    { label: "Lab Throughput", value: "78%", pct: 78 },
    { label: "Maternity Ward", value: "80%", pct: 80, maternity: true },
  ],
  modLabels: ["EMR", "Lab", "Maternity", "Pharmacy", "CIC", "Old Mutual", "NICU", "AI Engine"],
};

export function getDashboardPreview(role: RoleKey | null): DashboardPreview {
  if (!role) return DEFAULT_PREVIEW;
  return ROLE_DASHBOARD_PREVIEW[role];
}

export const MASTER_PORTAL_SECTIONS: Array<{ section: ModuleSection; items: MasterModule[] }> = [
  {
    section: "CLINICAL",
    items: MASTER_INTEGRATED_MODULES.filter((m) => m.section === "CLINICAL"),
  },
  {
    section: "OPERATIONS",
    items: [
      ...MASTER_INTEGRATED_MODULES.filter((m) => m.section === "OPERATIONS"),
      { id: "uhic", label: "UHIC", path: "/modules/uhic", icon: "mod.cic", section: "OPERATIONS", desc: "Actuarial · claims · fraud" },
      { id: "insurance", label: "Insurance", path: "/modules/insurance", icon: "mod.cic", section: "OPERATIONS", desc: "Alias to UHIC" },
      { id: "inventory_mod", label: "Inventory", path: "/modules/inventory", icon: "mod.inventory", section: "OPERATIONS", desc: "Stock management" },
      { id: "fleet", label: "Ambulance", path: "/modules/fleet", icon: "mod.fleet", section: "OPERATIONS", desc: "Fleet / EMS" },
      { id: "mortuary", label: "Mortuary", path: "/modules/mortuary", icon: "mod.mortuary", section: "OPERATIONS", desc: "Mortuary services" },
      { id: "rehab", label: "Rehabilitation", path: "/modules/rehab", icon: "mod.rehab", section: "OPERATIONS", desc: "Patient recovery" },
      { id: "nutrition", label: "Nutrition", path: "/modules/nutrition", icon: "mod.nutrition", section: "OPERATIONS", desc: "Nutritional care" },
    ],
  },
  {
    section: "MANAGEMENT",
    items: [
      { id: "administration", label: "Administration", path: "/modules/administration", icon: "mod.admin", section: "MANAGEMENT", desc: "System management" },
      { id: "hr", label: "HR & Payroll", path: "/modules/hr", icon: "mod.hr", section: "MANAGEMENT", desc: "Personnel" },
      { id: "research", label: "Research", path: "/modules/research", icon: "mod.research", section: "MANAGEMENT", desc: "Clinical research" },
      { id: "patient_portal", label: "Patient Portal", path: "/dashboard/patient", icon: "mod.patient", section: "MANAGEMENT", desc: "Patient dashboard" },
      { id: "admin_console", label: "Admin Console", path: "/dashboard/admin", icon: "mod.cic", section: "MANAGEMENT", desc: "Production admin" },
    ],
  },
  {
    section: "INTEGRATIONS",
    items: MASTER_INTEGRATED_MODULES.filter((m) => m.section === "INTEGRATIONS"),
  },
  {
    section: "PLATFORM",
    items: MASTER_INTEGRATED_MODULES.filter((m) => m.section === "PLATFORM"),
  },
];

export const MODULE_PULL_FLOW_STEPS = [
  { id: "login", icon: "flow.login", label: "Login" },
  { id: "auth", icon: "flow.auth", label: "Auth" },
  { id: "role", icon: "flow.role", label: "Role" },
  { id: "api", icon: "flow.api", label: "Module API" },
  { id: "dash", icon: "flow.dash", label: "Dashboard" },
] as const;

export function modulePullFlowIndex(signInStep: number): number {
  if (signInStep <= 1) return 0;
  if (signInStep === 2) return 1;
  if (signInStep === 3) return 3;
  return 4;
}
