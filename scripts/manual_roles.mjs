#!/usr/bin/env node
/**
 * Role manual definitions — tabs, captions, sign-in copy.
 * Used by generate_role_manuals.mjs and capture_all_manual_screenshots.mjs
 */

const staffSignIn = (roleName, credHint, launchHint) => ({
  select: `The ${roleName} tile is highlighted in the role carousel. The audit panel logs authentication events for compliance.`,
  credentials: credHint,
  mfa: "Enter the six-digit OTP sent to your institutional email. In staging/demo, use Practice 360 or OTP 123456.",
  launch: launchHint,
});

const patientSignIn = {
  select: "The Patient tile opens the self-service health records portal. Scroll the carousel if needed.",
  credentials: "Enter your ID type and number, 4-digit UniHealth PIN, and registered mobile number (+254 format).",
  mfa: "Verify via SMS OTP sent to your registered phone. Demo: Practice 360 or OTP 123456.",
  launch: "Success confirms Patient — UniHealth Self-Service. Launch opens My Dashboard at /dashboard/patient.",
};

function tab(nav, file, title, caption) {
  return { nav, file, slug: file.replace(/^\d+-tab-/, "tab-"), title, caption };
}

export const MANUAL_ROLES = [
  {
    slug: "doctor",
    title: "Doctor Dashboard Manual",
    subtitle: "Sign-in, navigation, and every clinical workstation tab — with annotated screenshots.",
    audience: "Physicians & specialists",
    url: "/dashboard/doctor",
    signInName: "Doctor",
    signInRoleButton: "Doctor",
    signInType: "staff",
    signInIntro: "Doctors use the four-step staff sign-in: select role → credentials → MFA → launch dashboard.",
    signInSteps: staffSignIn(
      "Doctor",
      "Enter Medical Registration No. (e.g. A4821), institutional email, and password. Policy requires uppercase, numbers, and ≥8 characters.",
      "Confirms Doctor — Pilot Hospital A. Session token authorises API calls to the gateway (staging port 8100).",
    ),
    layoutIntro: "The Clinical Workstation is organised into sidebar sections and a live top bar.",
    layoutZones: [
      ["Sidebar — Clinical", "Overview, chart, queue, workup, ward, labs, Rx, imaging"],
      ["Sidebar — Workflow", "Notes, incidents, e-sign, referrals, procedures, claims, schedule"],
      ["Sidebar — Admin", "Audit trail and system health"],
      ["Top bar", "Page title, patient context, search, notifications"],
    ],
    layoutCallout: "<strong>Active patient:</strong> Many tabs use the selected patient ID (badge on Patient Chart). Re-select from queue or ward before ordering.",
    tabSections: [
      {
        id: "clinical",
        number: 3,
        title: "Clinical tabs",
        tabs: [
          tab("Today's Overview", "05-tab-home-overview", "Today's Overview", "Shift command centre: KPIs, AI alerts, ward badges. Polls every 5–8s when API is live."),
          tab("Patient Chart", "06-tab-patient-chart", "Patient Chart", "Longitudinal record: demographics, allergies, conditions, medications, observations."),
          tab("Patient Queue", "07-tab-patient-queue", "Patient Queue", "Outpatient waiting list with triage priority. Select a row to set the active patient."),
          tab("Patient Workup", "08-tab-patient-workup", "Patient Workup", "Structured assessment, AI risk score (pilot), clinical AI panel, and e-sign links."),
          tab("Ward / Beds", "09-tab-ward-beds", "Ward / Beds", "Inpatient bed map, occupancy status, and ward capacity forecast."),
          tab("Lab Orders & Results", "10-tab-labs", "Lab Orders & Results", "Place lab orders and review results; critical values per local protocol."),
          tab("Prescriptions", "11-tab-prescriptions", "Prescriptions", "Compose medication orders — drug, dose, route — sent to pharmacy queue."),
          tab("Imaging & Reports", "12-tab-imaging", "Imaging & Reports", "Request radiology studies and track report status."),
        ],
      },
      {
        id: "workflow",
        number: 4,
        title: "Workflow tabs",
        tabs: [
          tab("Clinical Notes", "13-tab-clinical-notes", "Clinical Notes", "Progress, admission, discharge, and procedure notes — audit-logged on save."),
          tab("Incident Reports", "14-tab-incidents", "Incident Reports", "Patient-linked incident reports for governance and quality."),
          tab("E-Signatures", "15-tab-esign", "E-Signatures", "Upload → AI Review → Sign → Verify document pipeline."),
          tab("Referrals", "16-tab-referrals", "Referrals", "Inter-facility referrals with hospital, department, and patient pickers."),
          tab("Procedures", "17-tab-procedures", "Procedures", "Log planned or completed procedures; links to e-sign consent."),
          tab("UniHealth Claims", "18-tab-claims", "UniHealth Claims", "Insurance and cover claims initiation and tracking."),
          tab("My Schedule", "19-tab-schedule", "My Schedule", "Clinic blocks and theatre slots for the week."),
        ],
      },
      {
        id: "admin",
        number: 5,
        title: "Admin & system tabs",
        tabs: [
          tab("Audit Trail", "20-tab-audit", "Audit Trail", "Live UI action feed from /ui/actions for compliance review."),
          tab("System Health", "21-tab-system-health", "System Health", "AI tier, rules engine, and gateway connectivity status."),
        ],
      },
    ],
    dailyWorkflow: [
      "Sign in and complete MFA.",
      "Review Today's Overview for KPIs and alerts.",
      "Work Patient Queue — set active patient per consult.",
      "Document in Clinical Notes; order labs, imaging, and Rx as needed.",
      "Check System Health if panels show offline data.",
    ],
    troubleshooting: [
      ["Blank panels / Failed to fetch", "Start ./scripts/run_staging.sh; hard-refresh; verify Vite proxy → :8100"],
      ["AI risk unavailable", "System Health tab; verify /ai/risk-score endpoint"],
      ["E-sign upload fails", "Disable ad-blockers; API path is /esign not /legal"],
      ["Wrong patient in orders", "Re-select from queue or ward first"],
    ],
    disclaimer: "<strong>AI disclaimer:</strong> Risk scores and hints are pilot aids only — always apply clinical judgement.",
  },

  {
    slug: "nurse",
    title: "Nurse Dashboard Manual",
    subtitle: "Ward operations, vitals, MAR, triage, and handover — every nurse station tab documented.",
    audience: "Nurses & clinical officers",
    url: "/dashboard/nurse",
    signInName: "Nurse / CO",
    signInRoleButton: "Nurse / CO",
    signInType: "staff",
    signInIntro: "Nursing staff sign in with registration number, email, password, and MFA — same four-step flow as other clinicians.",
    signInSteps: staffSignIn(
      "Nurse / CO",
      "Enter Nursing Registration No. (e.g. RN/12345), institutional email, and password.",
      "Confirms Nurse — Pilot Hospital B. Redirects to the Nursing Station dashboard.",
    ),
    layoutIntro: "The Nurse Station sidebar groups ward workflows and extended care modules.",
    layoutZones: [
      ["Sidebar — Ward", "Shift overview, patients, chart, triage, vitals, MAR, tasks, handover"],
      ["Sidebar — More", "Fluids, wounds, incidents, e-sign, supplies"],
      ["Top bar", "Shift context, search, alerts, sign-out"],
    ],
    layoutCallout: "<strong>Active patient:</strong> Chart and vitals tabs use the selected patient ID shown in the sidebar badge.",
    tabSections: [
      {
        id: "ward",
        number: 3,
        title: "Ward tabs",
        tabs: [
          tab("Shift Overview", "05-tab-shift-overview", "Shift Overview", "Start-of-shift summary: assigned patients, tasks due, ward alerts, and AI anomaly feed."),
          tab("My Patients", "06-tab-my-patients", "My Patients", "Roster of patients under your care with acuity and last-vitals indicators."),
          tab("Patient Chart", "07-tab-patient-chart", "Patient Chart", "Read-only longitudinal view for the active patient — allergies, meds, obs."),
          tab("Triage Queue", "08-tab-triage-queue", "Triage Queue", "Emergency and walk-in triage queue with priority scoring."),
          tab("Record Vitals", "09-tab-record-vitals", "Record Vitals", "Capture BP, HR, RR, temp, SpO₂, pain, and AVPU — body diagram assist."),
          tab("MAR", "10-tab-mar", "MAR", "Medication Administration Record — due doses, given/refused/hold actions."),
          tab("Tasks", "11-tab-tasks", "Tasks", "Care plan tasks and reminders with completion logging."),
          tab("Handover", "12-tab-handover", "Handover", "SBAR-style shift handover notes for outgoing/incoming staff."),
        ],
      },
      {
        id: "more",
        number: 4,
        title: "Extended care tabs",
        tabs: [
          tab("Fluid Balance", "13-tab-fluid-balance", "Fluid Balance", "Intake/output charting and fluid balance trends."),
          tab("Wound Care", "14-tab-wound-care", "Wound Care", "Wound assessment documentation and dressing plans."),
          tab("Incidents", "15-tab-incidents", "Incidents", "File and review clinical incident reports."),
          tab("E-Signatures", "16-tab-esign", "E-Signatures", "Consent and nursing document e-sign pipeline."),
          tab("Supplies", "17-tab-supplies", "Supplies", "Ward supply requests and inventory levels."),
        ],
      },
    ],
    dailyWorkflow: [
      "Open Shift Overview and review assignments.",
      "Process Triage Queue for new arrivals.",
      "Record Vitals and administer MAR doses on schedule.",
      "Complete Tasks and document Handover at shift end.",
    ],
    troubleshooting: [
      ["Vitals not saving", "Check gateway; confirm patient ID selected"],
      ["MAR empty", "Verify medication requests exist for patient via API"],
      ["AI alerts silent", "WebSocket connects direct to :8100 in dev; REST fallback polls every 15s"],
    ],
    disclaimer: "<strong>Clinical responsibility:</strong> Vitals and MAR entries must be verified at bedside before submission.",
  },

  {
    slug: "patient",
    title: "Patient Portal Manual",
    subtitle: "Self-service health records, appointments, results, payments, and privacy controls.",
    audience: "Patients & caregivers",
    url: "/dashboard/patient",
    signInName: "Patient",
    signInRoleButton: "Patient",
    signInType: "patient",
    signInIntro: "Patients sign in with national ID (or passport), UniHealth PIN, and mobile number — then SMS MFA.",
    signInSteps: patientSignIn,
    layoutIntro: "The Patient Portal groups health, payments, privacy, and records in the sidebar.",
    layoutZones: [
      ["My Health", "Dashboard, appointments, visits, results, medications, vitals"],
      ["Payments", "Cover, contributions, bills, make a payment"],
      ["Privacy & Security", "KDPA consent controls"],
      ["My Records", "Health records, documents, e-sign, profile"],
    ],
    layoutCallout: "<strong>Data rights:</strong> Privacy & Consent lets you control sharing under KDPA 2019.",
    tabSections: [
      {
        id: "health",
        number: 3,
        title: "My Health tabs",
        tabs: [
          tab("My Dashboard", "05-tab-my-dashboard", "My Dashboard", "Personal health summary, quick links, and notifications."),
          tab("Appointments", "06-tab-appointments", "Appointments", "Book, view, and manage upcoming appointments."),
          tab("Visit History", "07-tab-visit-history", "Visit History", "Past encounters and facility visits."),
          tab("Test Results", "08-tab-test-results", "Test Results", "Laboratory and diagnostic results as they are released."),
          tab("Medications", "09-tab-medications", "Medications", "Active prescriptions with refill request options."),
          tab("Vitals & Trends", "10-tab-vitals-trends", "Vitals & Trends", "Latest vitals and trend charts from your care team."),
        ],
      },
      {
        id: "payments",
        number: 4,
        title: "Payments tabs",
        tabs: [
          tab("My UniHealth Cover", "11-tab-coverage", "My UniHealth Cover", "Benefits, claims status, and account linkage."),
          tab("Contributions", "12-tab-contributions", "Contributions", "Monthly contribution payment history."),
          tab("Bills & Invoices", "13-tab-bills", "Bills & Invoices", "Statements and downloadable invoices."),
          tab("Make a Payment", "14-tab-payments", "Make a Payment", "M-PESA, M-TIBA, and other payment methods."),
        ],
      },
      {
        id: "records",
        number: 5,
        title: "Records & privacy tabs",
        tabs: [
          tab("Privacy & Consent", "15-tab-consent", "Privacy & Consent", "Granular consent toggles for data sharing."),
          tab("Health Records", "16-tab-records", "Health Records", "Longitudinal health record summary."),
          tab("Documents", "17-tab-documents", "Documents", "Upload and view reports and files."),
          tab("E-Signatures", "18-tab-esign", "E-Signatures", "Sign consent forms and power-of-attorney documents."),
          tab("My Profile", "19-tab-profile", "My Profile", "Update contact details and account settings."),
        ],
      },
    ],
    dailyWorkflow: [
      "Sign in with ID, PIN, and phone OTP.",
      "Check My Dashboard for new results or messages.",
      "Book appointments and review medications.",
      "Manage Privacy & Consent before sharing records.",
    ],
    troubleshooting: [
      ["PIN rejected", "Use 4-digit PIN from registration; contact facility if forgotten"],
      ["Results not visible", "Lab may not have released results; check Test Results after 24h"],
      ["Payment failed", "Confirm M-PESA number matches registered phone"],
    ],
    disclaimer: "<strong>Not for emergencies:</strong> Call emergency services or visit A&E — this portal is not monitored 24/7.",
  },

  {
    slug: "admin",
    title: "Administrator Dashboard Manual",
    subtitle: "Facility control, users, RBAC, AI monitoring, and system administration.",
    audience: "System & facility administrators",
    url: "/dashboard/admin",
    signInName: "Administrator",
    signInRoleButton: "Administrator",
    signInType: "staff",
    signInIntro: "Administrators manage users, facilities, integrations, and security from the Admin Console.",
    signInSteps: staffSignIn(
      "Administrator",
      "Enter HRIS Employee ID (e.g. ADMIN-KE-00441), email, and password.",
      "Confirms Administrator — UniHealth Pilot. Full admin console access granted.",
    ),
    layoutIntro: "Admin Console sidebar spans main operations, clinical registries, security, and system settings.",
    layoutZones: [
      ["Main", "Overview, users, facilities, county coverage"],
      ["Clinical", "Patient registry, staff directory, UniHealth integration"],
      ["Security & Intelligence", "AI monitor, RBAC, audit log"],
      ["System", "Health, reports, settings"],
    ],
    layoutCallout: "<strong>Least privilege:</strong> Provision roles via RBAC — avoid sharing admin credentials.",
    tabSections: [
      {
        id: "main",
        number: 3,
        title: "Main tabs",
        tabs: [
          tab("Overview", "05-tab-overview", "Overview", "System KPIs, quick actions, facility status, and live metrics."),
          tab("User Management", "06-tab-user-management", "User Management", "Create, edit, disable users; assign roles and facilities."),
          tab("Facilities", "07-tab-facilities", "Facilities", "Facility registry, levels, latency, and connection status."),
          tab("County Coverage", "08-tab-county-coverage", "County Coverage", "Geographic coverage map and county-level stats."),
        ],
      },
      {
        id: "clinical",
        number: 4,
        title: "Clinical registry tabs",
        tabs: [
          tab("Patient Registry", "09-tab-patient-registry", "Patient Registry", "Search and manage registered patients across facilities."),
          tab("Staff Directory", "10-tab-staff-directory", "Staff Directory", "Clinical and operational staff roster."),
          tab("UniHealth Integration", "11-tab-unihealth-integration", "UniHealth Integration", "Claims, biometric, and Practice 360 integration status."),
        ],
      },
      {
        id: "security",
        number: 5,
        title: "Security & system tabs",
        tabs: [
          tab("AI Monitor", "12-tab-ai-monitor", "AI Monitor", "AI tier usage, anomaly counts, and WebSocket connection stats."),
          tab("RBAC & Roles", "13-tab-rbac", "RBAC & Roles", "Role definitions and permission matrix."),
          tab("Audit Log", "14-tab-audit-log", "Audit Log", "System-wide audit events and export."),
          tab("System Health", "15-tab-system-health", "System Health", "Gateway, database, and service health checks."),
          tab("Reports", "16-tab-reports", "Reports", "Operational and compliance report generation."),
          tab("Settings", "17-tab-settings", "Settings", "Policy toggles, feature flags, and facility defaults."),
        ],
      },
    ],
    dailyWorkflow: [
      "Review Overview for alerts and offline facilities.",
      "Process User Management requests from HR.",
      "Scan Audit Log for failed auth attempts.",
      "Check System Health before go-live windows.",
    ],
    troubleshooting: [
      ["Cannot create user", "Verify RBAC permissions and unique email"],
      ["Facility shows offline", "Check gateway and KMHFL sync job"],
      ["Metrics stale", "Prometheus/metrics endpoint on :8100"],
    ],
    disclaimer: "<strong>Audit everything:</strong> Admin actions are logged — document changes in change-management tickets.",
  },

  {
    slug: "lab",
    title: "Laboratory Dashboard Manual",
    subtitle: "Specimen workflow, test queue, imaging modalities, QC, and specialised lab modules.",
    audience: "Laboratory & diagnostic imaging staff",
    url: "/dashboard/lab",
    signInName: "Laboratory",
    signInRoleButton: "Laboratory",
    signInType: "staff",
    signInIntro: "Lab staff sign in with Laboratory Staff ID, email, password, and MFA.",
    signInSteps: staffSignIn(
      "Laboratory",
      "Enter Laboratory Staff ID (e.g. LAB-KE-00231), email, and password.",
      "Confirms Laboratory — Diagnostic Services. Opens Lab & Imaging portal.",
    ),
    layoutIntro: "The lab dashboard covers core workflow, imaging modalities, specialised labs, and compliance.",
    layoutZones: [
      ["Lab Workflow", "Collection, test queue, results entry, QC"],
      ["Diagnostic Imaging", "X-ray, MRI/CT, ultrasound, mammography, nuclear"],
      ["Specialised Labs", "Pathology, microbiology, blood bank, molecular"],
      ["Inventory & Compliance", "Reagents, reports, audit, health"],
    ],
    layoutCallout: "<strong>Critical values:</strong> Acknowledge and escalate per protocol when entering abnormal results.",
    tabSections: [
      {
        id: "workflow",
        number: 3,
        title: "Lab workflow tabs",
        tabs: [
          tab("Overview", "05-tab-overview", "Overview", "Daily KPIs: pending collections, queue depth, studies, and QC status."),
          tab("Sample Collection", "06-tab-sample-collection", "Sample Collection", "Barcode collection workflow and pending draws."),
          tab("Test Queue", "07-tab-test-queue", "Test Queue", "Active orders awaiting processing."),
          tab("Results Entry", "08-tab-results-entry", "Results Entry", "Enter and validate results; triggers critical alerts."),
          tab("Quality Control", "09-tab-quality-control", "Quality Control", "QC runs, Westgard rules, and instrument calibration."),
        ],
      },
      {
        id: "imaging",
        number: 4,
        title: "Diagnostic imaging tabs",
        tabs: [
          tab("All Imaging", "10-tab-all-imaging", "All Imaging", "Combined imaging worklist across modalities."),
          tab("X-Ray", "11-tab-xray", "X-Ray", "Radiography orders and reporting queue."),
          tab("MRI / CT", "12-tab-mri-ct", "MRI / CT", "Cross-sectional imaging schedule and results."),
          tab("Ultrasound", "13-tab-ultrasound", "Ultrasound", "Sonography studies and worksheets."),
          tab("Mammography", "14-tab-mammography", "Mammography", "Screening and diagnostic mammography queue."),
          tab("Nuclear Medicine", "15-tab-nuclear", "Nuclear Medicine", "PET/SPECT and nuclear medicine orders."),
        ],
      },
      {
        id: "specialised",
        number: 5,
        title: "Specialised & compliance tabs",
        tabs: [
          tab("Pathology", "16-tab-pathology", "Pathology", "Histopathology and cytology workflows."),
          tab("Microbiology", "17-tab-microbiology", "Microbiology", "Culture, sensitivity, and infection reporting."),
          tab("Blood Bank", "18-tab-blood-bank", "Blood Bank", "Cross-match, issue, and inventory."),
          tab("Molecular Dx", "19-tab-molecular", "Molecular Dx", "PCR and molecular diagnostic panels."),
          tab("Reagents & Supplies", "20-tab-reagents", "Reagents & Supplies", "Stock levels and reorder alerts."),
          tab("Reports", "21-tab-reports", "Reports", "Turnaround, workload, and regulatory reports."),
          tab("Audit Trail", "22-tab-audit", "Audit Trail", "Specimen and result audit history."),
          tab("System Health", "23-tab-system-health", "System Health", "LIS connectivity and gateway status."),
        ],
      },
    ],
    dailyWorkflow: [
      "Check Overview KPIs at shift start.",
      "Process Sample Collection then Test Queue.",
      "Enter Results with QC verification.",
      "Route critical values to ordering clinicians.",
    ],
    troubleshooting: [
      ["Order not in queue", "Verify doctor order reached gateway; refresh polling"],
      ["QC fail", "Hold instrument; repeat controls per SOP"],
      ["Imaging study missing", "Check referring clinician order in imaging tab"],
    ],
    disclaimer: "<strong>Result verification:</strong> Dual-check critical results before release where policy requires.",
  },

  {
    slug: "pharmacy",
    title: "Pharmacy Dashboard Manual",
    subtitle: "Dispensing queue, verification, stock, KEMSA orders, and clinical pharmacy tools.",
    audience: "Pharmacists & dispensing staff",
    url: "/dashboard/pharmacy",
    signInName: "Pharmacy",
    signInRoleButton: "Pharmacy",
    signInType: "staff",
    signInIntro: "Pharmacy staff sign in with Pharmacy Registration ID, email, password, and MFA.",
    signInSteps: staffSignIn(
      "Pharmacy",
      "Enter Pharmacy Registration ID (e.g. PHARM-00441), email, and password.",
      "Confirms Pharmacy — Clinical Dispensing. Opens dispensing workstation.",
    ),
    layoutIntro: "Pharmacy portal sidebar covers dispensing, inventory, clinical checks, and compliance.",
    layoutZones: [
      ["Dispensing", "Overview, Rx queue, verify, patient lookup, compounding"],
      ["Inventory", "Stock, reorder, KEMSA, claims, vaccinations"],
      ["Clinical", "Drug interactions and pharmacist interventions"],
      ["Security & Compliance", "Audit trail, API reference, system health"],
    ],
    layoutCallout: "<strong>Verify before dispense:</strong> Always complete Verify & Approve for high-risk medications.",
    tabSections: [
      {
        id: "dispensing",
        number: 3,
        title: "Dispensing tabs",
        tabs: [
          tab("Overview", "05-tab-overview", "Overview", "Shift summary: pending Rx, stock alerts, and KPI cards."),
          tab("Prescription Queue", "06-tab-prescription-queue", "Prescription Queue", "Incoming prescriptions from clinicians — priority sorted."),
          tab("Verify & Approve", "07-tab-verify-approve", "Verify & Approve", "Clinical verification before dispensing."),
          tab("Patient Lookup", "08-tab-patient-lookup", "Patient Lookup", "Search patient allergy and medication history."),
          tab("Compounding", "09-tab-compounding", "Compounding", "Non-sterile and sterile compounding workflows."),
        ],
      },
      {
        id: "inventory",
        number: 4,
        title: "Inventory tabs",
        tabs: [
          tab("Stock Levels", "10-tab-stock-levels", "Stock Levels", "Real-time inventory with low-stock badges."),
          tab("Reorder List", "11-tab-reorder-list", "Reorder List", "Items below minimum — generate purchase requests."),
          tab("KEMSA Orders", "12-tab-kemsa-orders", "KEMSA Orders", "Kenya Medical Supplies Authority order tracking."),
          tab("ModelCover Claims", "13-tab-claims", "ModelCover Claims", "Insurance claim submission for dispensed items."),
          tab("Vaccinations", "14-tab-vaccinations", "Vaccinations", "Immunisation stock and administration log."),
        ],
      },
      {
        id: "clinical",
        number: 5,
        title: "Clinical & compliance tabs",
        tabs: [
          tab("Drug Interactions", "15-tab-drug-interactions", "Drug Interactions", "Interaction checker for new prescriptions."),
          tab("Pharmacist Notes", "16-tab-pharmacist-notes", "Pharmacist Notes", "Interventions and counselling documentation."),
          tab("Audit Trail", "17-tab-audit", "Audit Trail", "Dispensing and stock movement audit log."),
          tab("API Reference", "18-tab-api-reference", "API Reference", "Integration endpoints for external systems."),
          tab("System Health", "19-tab-system-health", "System Health", "Gateway and inventory sync status."),
        ],
      },
    ],
    dailyWorkflow: [
      "Review Overview and Prescription Queue.",
      "Verify & Approve each Rx — check interactions.",
      "Dispense and update stock levels.",
      "Process KEMSA reorders before cutoff.",
    ],
    troubleshooting: [
      ["Rx queue empty", "Confirm clinician orders reached /pharmacy API"],
      ["Stock mismatch", "Run stock reconcile; check audit trail"],
      ["Interaction alert", "Contact prescriber before overriding"],
    ],
    disclaimer: "<strong>Patient safety:</strong> Never bypass verification for look-alike/sound-alike drugs.",
  },
];

/** Flat list of dashboard nav labels per role (for screenshot capture). */
export function getTabsForCapture(role) {
  const tabs = [];
  for (const section of role.tabSections) {
    for (const t of section.tabs) tabs.push({ nav: t.nav, file: t.file });
  }
  return tabs;
}
