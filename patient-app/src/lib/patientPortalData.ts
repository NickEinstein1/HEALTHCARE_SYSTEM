/** Demo + static portal content aligned with web PatientDashboard. */

export const MEMBER_ID = "AFL-MBR-884321";

export function displayAflId(patientId: string): string {
  return `AFL-2024-KE-${patientId.replace(/\W/g, "").toUpperCase() || "78841209"}`;
}

export const COVER = {
  balance: 48_200,
  limit: 50_000,
  used: 1_800,
  renewal: "31 Mar 2026",
  renewalDays: 21,
};

export const MTIBA_BALANCE = 3_200;

export type PortalNotification = {
  id: string;
  icon: string;
  title: string;
  sub: string;
  time: string;
  route: { tab: "Health" | "Wallet" | "Home"; screen?: string };
};

export const NOTIFICATIONS: PortalNotification[] = [
  { id: "1", icon: "🧪", title: "New lab result posted", sub: "Potassium (K⁺) flagged high · Review in Test Results", time: "2m", route: { tab: "Health", screen: "Results" } },
  { id: "2", icon: "📅", title: "Appointment reminder", sub: "KNH Cardiology · 15 Mar 2026 · 09:00", time: "1h", route: { tab: "Health", screen: "Appointments" } },
  { id: "3", icon: "💳", title: "Contribution due", sub: "Ksh 500 due by 31 Mar 2026", time: "2d", route: { tab: "Wallet", screen: "Contributions" } },
];

export type SearchItem = {
  key: string;
  label: string;
  sub: string;
  icon: string;
  tab: "Health" | "Wallet" | "Menu" | "Messages" | "Home";
  screen?: string;
};

export const SEARCH_ITEMS: SearchItem[] = [
  { key: "appointments", label: "Appointments", sub: "Book and manage visits", icon: "📅", tab: "Health", screen: "Appointments" },
  { key: "visits", label: "Visit History", sub: "Encounters across facilities", icon: "📋", tab: "Health", screen: "Visits" },
  { key: "results", label: "Test Results", sub: "Labs and diagnostics", icon: "🧪", tab: "Health", screen: "Results" },
  { key: "medications", label: "Medications", sub: "Prescriptions and refills", icon: "💊", tab: "Health", screen: "Medications" },
  { key: "vitals", label: "Vitals & Trends", sub: "Blood pressure, weight, SpO₂", icon: "💗", tab: "Health", screen: "Vitals" },
  { key: "messages", label: "Messages", sub: "Secure messaging with your care team", icon: "💬", tab: "Messages" },
  { key: "coverage", label: "My UniHealth Cover", sub: "Benefits and claims", icon: "🛡️", tab: "Wallet", screen: "Coverage" },
  { key: "contributions", label: "Contributions", sub: "Monthly cover payments", icon: "💳", tab: "Wallet", screen: "Contributions" },
  { key: "bills", label: "Bills & Invoices", sub: "Statements", icon: "📄", tab: "Wallet", screen: "Bills" },
  { key: "payments", label: "Make a Payment", sub: "M-PESA, M-TIBA", icon: "📱", tab: "Wallet", screen: "Pay" },
  { key: "records", label: "Health Records", sub: "Diagnoses, allergies, immunisations", icon: "📂", tab: "Menu", screen: "Records" },
  { key: "documents", label: "Documents", sub: "Reports and uploads", icon: "📋", tab: "Menu", screen: "Documents" },
  { key: "consent", label: "Privacy & Consent", sub: "KDPA 2019 controls", icon: "🔐", tab: "Menu", screen: "Consent" },
  { key: "profile", label: "My Profile", sub: "Personal details", icon: "👤", tab: "Menu", screen: "Profile" },
];

export const DEMO_VISITS = [
  { when: "04 Mar 2026", fac: "KNH Nairobi", type: "Outpatient", dept: "Cardiology", ref: "ENC-2026-1042" },
  { when: "12 Feb 2026", fac: "KNH Lab", type: "Lab", dept: "Phlebotomy", ref: "LAB-2026-0091" },
  { when: "03 Jan 2026", fac: "Coast General", type: "Inpatient", dept: "Internal Medicine", ref: "IP-2025-8831" },
];

export const BENEFIT_LIMITS = [
  { label: "Inpatient Cover", pct: 90, color: "#1a8a4a", text: "Ksh 22,500 / 25,000" },
  { label: "Outpatient Cover", pct: 88, color: "#3d8ef8", text: "Ksh 13,200 / 15,000" },
  { label: "Optical Benefit", pct: 30, color: "#ffb830", text: "Ksh 1,050 / 3,500" },
];

export const CLAIMS = [
  { no: "AFL-CLM-2026-0012", facility: "KNH Outpatient", amount: "Ksh 1,200", status: "Approved" as const },
  { no: "AFL-CLM-2025-8841", facility: "Coast General", amount: "Ksh 600", status: "Approved" as const },
];

export const CONTRIBUTIONS = [
  { date: "28 Feb 2026", method: "M-PESA", amount: "Ksh 500", status: "Cleared" as const },
  { date: "28 Jan 2026", method: "Payroll", amount: "Ksh 500", status: "Cleared" as const },
  { date: "28 Dec 2025", method: "M-PESA", amount: "Ksh 500", status: "Cleared" as const },
];

export const BILLS = [
  { date: "04 Mar 2026", desc: "Cardiology consult", amount: "Ksh 0", status: "Covered" as const },
  { date: "12 Feb 2026", desc: "Lab panel — Lipids", amount: "Ksh 0", status: "Covered" as const },
];

export const TRANSACTIONS = [
  { date: "01 Mar 2026", type: "Contribution", amount: "Ksh 500" },
  { date: "04 Mar 2026", type: "Cover settlement", amount: "Ksh 1,200" },
];

export const HEALTH_RECORDS = {
  diagnoses: [{ icon: "💗", name: "Mild Hypertension", meta: "ICD-10: I10 · Oct 2024", tag: "Monitoring" as const }],
  allergies: [{ icon: "⚠️", name: "Penicillin", meta: "Anaphylaxis · On file", tag: "Active" as const }],
  immunisations: [{ icon: "💉", name: "Influenza (Flu)", meta: "Jul 2025", tag: "Current" as const }],
};

export const DOCUMENTS = [
  { name: "Discharge Summary — Coast General", date: "03 Jan 2026", type: "PDF", size: "248 KB" },
  { name: "Cardiology Consult Note", date: "04 Mar 2026", type: "PDF", size: "112 KB" },
  { name: "Lab Report — Lipid Panel", date: "12 Feb 2026", type: "PDF", size: "89 KB" },
];

export const CARE_TEAM = [
  { name: "Dr. James Mutuku", role: "Cardiologist · KNH", initials: "JM" },
  { name: "Sr. Faith Muthoni", role: "Primary Nurse · KNH", initials: "FM" },
];

export const DEMO_RESULTS = [
  { name: "Potassium (K⁺)", range: "Ref: 3.5–5.1 mmol/L", value: "6.8", flag: "high" as const, date: "2 Apr" },
  { name: "LDL Cholesterol", range: "Ref: < 3.0 mmol/L", value: "3.4", flag: "high" as const, date: "4 Mar" },
  { name: "HbA1c", range: "Ref: 4.0–6.0%", value: "5.6", flag: "normal" as const, date: "Feb" },
];

export const AI_INSIGHTS = [
  { icon: "⚠️", title: "Potassium levels require follow-up", body: "Latest K⁺ 6.8 mmol/L is above safe range. Attend follow-up 10 Apr 2026.", tag: "ACTION", tone: "red" as const },
  { icon: "💊", title: "Medication refill due in 5 days", body: "Amlodipine and Lisinopril due by 15 Apr 2026. Request refill from any UniHealth facility.", tag: "REMINDER", tone: "amber" as const },
  { icon: "💡", title: "Preventive care: annual eye check", body: "Fundoscopy recommended. Optical benefit Ksh 3,500 remaining.", tag: "PREVENTIVE", tone: "blue" as const },
];

export const VITALS_CATALOG = [
  { key: "bp", label: "Blood Pressure", unit: "mmHg", icon: "🩸", range: "90–120 / 60–80", match: ["blood pressure", "bp"] },
  { key: "hr", label: "Heart Rate", unit: "bpm", icon: "💗", range: "60–100", match: ["heart rate", "pulse", "hr"] },
  { key: "temp", label: "Temperature", unit: "°C", icon: "🌡️", range: "36.1–37.2", match: ["temperature", "temp"] },
  { key: "spo2", label: "SpO₂", unit: "%", icon: "🩺", range: "≥ 95", match: ["spo2", "oxygen"] },
  { key: "weight", label: "Weight", unit: "kg", icon: "⚖️", range: "—", match: ["weight"] },
  { key: "glucose", label: "Glucose", unit: "mmol/L", icon: "🩸", range: "3.9–7.8", match: ["glucose"] },
] as const;
