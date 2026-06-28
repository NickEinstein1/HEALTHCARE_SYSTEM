# UniHealth Comprehensive Dashboard Manual

Complete sign-in and tab-by-tab guide for **Doctor**, **Nurse**, **Patient**, **Administrator**, **Laboratory**, and **Pharmacy**.

**HTML version (recommended):** [comprehensive-dashboard-manual.html](comprehensive-dashboard-manual.html)

---

## System overview

UniHealth provides role-based dashboards after a unified four-step sign-in. Each section below includes sign-in screenshots and every sidebar tab for that role.

| Role | URL | Audience |
| ---- | --- | -------- |
| **Doctor** | `/dashboard/doctor` | Physicians & specialists |
| **Nurse / CO** | `/dashboard/nurse` | Nurses & clinical officers |
| **Patient** | `/dashboard/patient` | Patients & caregivers |
| **Administrator** | `/dashboard/admin` | System & facility administrators |
| **Laboratory** | `/dashboard/lab` | Laboratory & diagnostic imaging staff |
| **Pharmacy** | `/dashboard/pharmacy` | Pharmacists & dispensing staff |

---

## Universal sign-in

1. Select role from the carousel  
2. Enter credentials (staff ID + email + password, or patient ID + PIN + phone)  
3. Complete MFA (email/SMS OTP or Practice 360 in demo)  
4. Launch dashboard  

---

# Doctor Dashboard Manual

The Clinical Workstation is the physician command centre: queue management, longitudinal charts, orders, AI-assisted triage hints, e-signatures, and referrals — all in one sidebar.

**Audience:** Physicians & specialists · **URL:** `/dashboard/doctor`

## Sign-in

Doctors use the four-step staff sign-in: select role → credentials → MFA → launch dashboard.

<p align="center">
  <img src="doctor/images/01-signin-role-selected.png" alt="Select role" width="720" />
</p>

**Figure 1 · Doctor — Select role**  
The Doctor tile is highlighted in the role carousel. The audit panel logs authentication events for compliance.

---
<p align="center">
  <img src="doctor/images/02-signin-credentials.png" alt="Credentials" width="720" />
</p>

**Figure 2 · Doctor — Credentials**  
Enter Medical Registration No. (e.g. A4821), institutional email, and password. Policy requires uppercase, numbers, and ≥8 characters.

---
<p align="center">
  <img src="doctor/images/03-signin-mfa.png" alt="MFA" width="720" />
</p>

**Figure 3 · Doctor — MFA**  
Enter the six-digit OTP sent to your institutional email. In staging/demo, use Practice 360 or OTP 123456.

---
<p align="center">
  <img src="doctor/images/04-signin-launch.png" alt="Launch" width="720" />
</p>

**Figure 4 · Doctor — Launch**  
Confirms Doctor — Pilot Hospital A. Session token authorises API calls to the gateway (staging port 8100).

---
## Layout

The Clinical Workstation is organised into sidebar sections and a live top bar.

| Zone | Purpose |
| ---- | ------- |
| **Sidebar — Clinical** | Overview, chart, queue, workup, ward, labs, Rx, imaging |
| **Sidebar — Workflow** | Notes, incidents, e-sign, referrals, procedures, claims, schedule |
| **Sidebar — Admin** | Audit trail and system health |
| **Top bar** | Page title, patient context, search, notifications |

---

## Clinical tabs

### Today's Overview

<p align="center">
  <img src="doctor/images/05-tab-home-overview.png" alt="Today's Overview" width="720" />
</p>

**Figure 5 · Doctor — Today's Overview**  
Shift command centre: KPIs, AI alerts, ward badges. Polls every 5–8s when API is live.

---
### Patient Chart

<p align="center">
  <img src="doctor/images/06-tab-patient-chart.png" alt="Patient Chart" width="720" />
</p>

**Figure 6 · Doctor — Patient Chart**  
Longitudinal record: demographics, allergies, conditions, medications, observations.

---
### Patient Queue

<p align="center">
  <img src="doctor/images/07-tab-patient-queue.png" alt="Patient Queue" width="720" />
</p>

**Figure 7 · Doctor — Patient Queue**  
Outpatient waiting list with triage priority. Select a row to set the active patient.

---
### Patient Workup

<p align="center">
  <img src="doctor/images/08-tab-patient-workup.png" alt="Patient Workup" width="720" />
</p>

**Figure 8 · Doctor — Patient Workup**  
Structured assessment, AI risk score (pilot), clinical AI panel, and e-sign links.

---
### Ward / Beds

<p align="center">
  <img src="doctor/images/09-tab-ward-beds.png" alt="Ward / Beds" width="720" />
</p>

**Figure 9 · Doctor — Ward / Beds**  
Inpatient bed map, occupancy status, and ward capacity forecast.

---
### Lab Orders & Results

<p align="center">
  <img src="doctor/images/10-tab-labs.png" alt="Lab Orders & Results" width="720" />
</p>

**Figure 10 · Doctor — Lab Orders & Results**  
Place lab orders and review results; critical values per local protocol.

---
### Prescriptions

<p align="center">
  <img src="doctor/images/11-tab-prescriptions.png" alt="Prescriptions" width="720" />
</p>

**Figure 11 · Doctor — Prescriptions**  
Compose medication orders — drug, dose, route — sent to pharmacy queue.

---
### Imaging & Reports

<p align="center">
  <img src="doctor/images/12-tab-imaging.png" alt="Imaging & Reports" width="720" />
</p>

**Figure 12 · Doctor — Imaging & Reports**  
Request radiology studies and track report status.

---
## Workflow tabs

### Clinical Notes

<p align="center">
  <img src="doctor/images/13-tab-clinical-notes.png" alt="Clinical Notes" width="720" />
</p>

**Figure 13 · Doctor — Clinical Notes**  
Progress, admission, discharge, and procedure notes — audit-logged on save.

---
### Incident Reports

<p align="center">
  <img src="doctor/images/14-tab-incidents.png" alt="Incident Reports" width="720" />
</p>

**Figure 14 · Doctor — Incident Reports**  
Patient-linked incident reports for governance and quality.

---
### E-Signatures

<p align="center">
  <img src="doctor/images/15-tab-esign.png" alt="E-Signatures" width="720" />
</p>

**Figure 15 · Doctor — E-Signatures**  
Upload → AI Review → Sign → Verify document pipeline.

---
### Referrals

<p align="center">
  <img src="doctor/images/16-tab-referrals.png" alt="Referrals" width="720" />
</p>

**Figure 16 · Doctor — Referrals**  
Inter-facility referrals with hospital, department, and patient pickers.

---
### Procedures

<p align="center">
  <img src="doctor/images/17-tab-procedures.png" alt="Procedures" width="720" />
</p>

**Figure 17 · Doctor — Procedures**  
Log planned or completed procedures; links to e-sign consent.

---
### UniHealth Claims

<p align="center">
  <img src="doctor/images/18-tab-claims.png" alt="UniHealth Claims" width="720" />
</p>

**Figure 18 · Doctor — UniHealth Claims**  
Insurance and cover claims initiation and tracking.

---
### My Schedule

<p align="center">
  <img src="doctor/images/19-tab-schedule.png" alt="My Schedule" width="720" />
</p>

**Figure 19 · Doctor — My Schedule**  
Clinic blocks and theatre slots for the week.

---
## Admin & system tabs

### Audit Trail

<p align="center">
  <img src="doctor/images/20-tab-audit.png" alt="Audit Trail" width="720" />
</p>

**Figure 20 · Doctor — Audit Trail**  
Live UI action feed from /ui/actions for compliance review.

---
### System Health

<p align="center">
  <img src="doctor/images/21-tab-system-health.png" alt="System Health" width="720" />
</p>

**Figure 21 · Doctor — System Health**  
AI tier, rules engine, and gateway connectivity status.

---
## Tips — Doctor

| Issue | Action |
| ----- | ------ |
| Blank panels / Failed to fetch | Start ./scripts/run_staging.sh; hard-refresh; verify Vite proxy → :8100 |
| AI risk unavailable | System Health tab; verify /ai/risk-score endpoint |
| E-sign upload fails | Disable ad-blockers; API path is /esign not /legal |
| Wrong patient in orders | Re-select from queue or ward first |

<strong>AI disclaimer:</strong> Risk scores and hints are pilot aids only — always apply clinical judgement.

---

# Nurse Dashboard Manual

The Nurse Station supports shift-based ward care: triage, vitals capture, medication administration (MAR), SBAR handover, and supply requests with live patient context.

**Audience:** Nurses & clinical officers · **URL:** `/dashboard/nurse`

## Sign-in

Nursing staff sign in with registration number, email, password, and MFA — same four-step flow as other clinicians.

<p align="center">
  <img src="nurse/images/01-signin-role-selected.png" alt="Select role" width="720" />
</p>

**Figure 22 · Nurse / CO — Select role**  
The Nurse / CO tile is highlighted in the role carousel. The audit panel logs authentication events for compliance.

---
<p align="center">
  <img src="nurse/images/02-signin-credentials.png" alt="Credentials" width="720" />
</p>

**Figure 23 · Nurse / CO — Credentials**  
Enter Nursing Registration No. (e.g. RN/12345), institutional email, and password.

---
<p align="center">
  <img src="nurse/images/03-signin-mfa.png" alt="MFA" width="720" />
</p>

**Figure 24 · Nurse / CO — MFA**  
Enter the six-digit OTP sent to your institutional email. In staging/demo, use Practice 360 or OTP 123456.

---
<p align="center">
  <img src="nurse/images/04-signin-launch.png" alt="Launch" width="720" />
</p>

**Figure 25 · Nurse / CO — Launch**  
Confirms Nurse — Pilot Hospital B. Redirects to the Nursing Station dashboard.

---
## Layout

The Nurse Station sidebar groups ward workflows and extended care modules.

| Zone | Purpose |
| ---- | ------- |
| **Sidebar — Ward** | Shift overview, patients, chart, triage, vitals, MAR, tasks, handover |
| **Sidebar — More** | Fluids, wounds, incidents, e-sign, supplies |
| **Top bar** | Shift context, search, alerts, sign-out |

---

## Ward tabs

### Shift Overview

<p align="center">
  <img src="nurse/images/05-tab-shift-overview.png" alt="Shift Overview" width="720" />
</p>

**Figure 26 · Nurse / CO — Shift Overview**  
Start-of-shift summary: assigned patients, tasks due, ward alerts, and AI anomaly feed.

---
### My Patients

<p align="center">
  <img src="nurse/images/06-tab-my-patients.png" alt="My Patients" width="720" />
</p>

**Figure 27 · Nurse / CO — My Patients**  
Roster of patients under your care with acuity and last-vitals indicators.

---
### Patient Chart

<p align="center">
  <img src="nurse/images/07-tab-patient-chart.png" alt="Patient Chart" width="720" />
</p>

**Figure 28 · Nurse / CO — Patient Chart**  
Read-only longitudinal view for the active patient — allergies, meds, obs.

---
### Triage Queue

<p align="center">
  <img src="nurse/images/08-tab-triage-queue.png" alt="Triage Queue" width="720" />
</p>

**Figure 29 · Nurse / CO — Triage Queue**  
Emergency and walk-in triage queue with priority scoring.

---
### Record Vitals

<p align="center">
  <img src="nurse/images/09-tab-record-vitals.png" alt="Record Vitals" width="720" />
</p>

**Figure 30 · Nurse / CO — Record Vitals**  
Capture BP, HR, RR, temp, SpO₂, pain, and AVPU — body diagram assist.

---
### MAR

<p align="center">
  <img src="nurse/images/10-tab-mar.png" alt="MAR" width="720" />
</p>

**Figure 31 · Nurse / CO — MAR**  
Medication Administration Record — due doses, given/refused/hold actions.

---
### Tasks

<p align="center">
  <img src="nurse/images/11-tab-tasks.png" alt="Tasks" width="720" />
</p>

**Figure 32 · Nurse / CO — Tasks**  
Care plan tasks and reminders with completion logging.

---
### Handover

<p align="center">
  <img src="nurse/images/12-tab-handover.png" alt="Handover" width="720" />
</p>

**Figure 33 · Nurse / CO — Handover**  
SBAR-style shift handover notes for outgoing/incoming staff.

---
## Extended care tabs

### Fluid Balance

<p align="center">
  <img src="nurse/images/13-tab-fluid-balance.png" alt="Fluid Balance" width="720" />
</p>

**Figure 34 · Nurse / CO — Fluid Balance**  
Intake/output charting and fluid balance trends.

---
### Wound Care

<p align="center">
  <img src="nurse/images/14-tab-wound-care.png" alt="Wound Care" width="720" />
</p>

**Figure 35 · Nurse / CO — Wound Care**  
Wound assessment documentation and dressing plans.

---
### Incidents

<p align="center">
  <img src="nurse/images/15-tab-incidents.png" alt="Incidents" width="720" />
</p>

**Figure 36 · Nurse / CO — Incidents**  
File and review clinical incident reports.

---
### E-Signatures

<p align="center">
  <img src="nurse/images/16-tab-esign.png" alt="E-Signatures" width="720" />
</p>

**Figure 37 · Nurse / CO — E-Signatures**  
Consent and nursing document e-sign pipeline.

---
### Supplies

<p align="center">
  <img src="nurse/images/17-tab-supplies.png" alt="Supplies" width="720" />
</p>

**Figure 38 · Nurse / CO — Supplies**  
Ward supply requests and inventory levels.

---
## Tips — Nurse / CO

| Issue | Action |
| ----- | ------ |
| Vitals not saving | Check gateway; confirm patient ID selected |
| MAR empty | Verify medication requests exist for patient via API |
| AI alerts silent | WebSocket connects direct to :8100 in dev; REST fallback polls every 15s |

<strong>Clinical responsibility:</strong> Vitals and MAR entries must be verified at bedside before submission.

---

# Patient Portal Manual

The Patient Portal gives individuals control over appointments, results, medications, UniHealth cover, payments, and KDPA privacy settings — without calling the front desk.

**Audience:** Patients & caregivers · **URL:** `/dashboard/patient`

## Sign-in

Patients sign in with national ID (or passport), UniHealth PIN, and mobile number — then SMS MFA.

<p align="center">
  <img src="patient/images/01-signin-role-selected.png" alt="Select role" width="720" />
</p>

**Figure 39 · Patient — Select role**  
The Patient tile opens the self-service health records portal. Scroll the carousel if needed.

---
<p align="center">
  <img src="patient/images/02-signin-credentials.png" alt="Credentials" width="720" />
</p>

**Figure 40 · Patient — Credentials**  
Enter your ID type and number, 4-digit UniHealth PIN, and registered mobile number (+254 format).

---
<p align="center">
  <img src="patient/images/03-signin-mfa.png" alt="MFA" width="720" />
</p>

**Figure 41 · Patient — MFA**  
Verify via SMS OTP sent to your registered phone. Demo: Practice 360 or OTP 123456.

---
<p align="center">
  <img src="patient/images/04-signin-launch.png" alt="Launch" width="720" />
</p>

**Figure 42 · Patient — Launch**  
Success confirms Patient — UniHealth Self-Service. Launch opens My Dashboard at /dashboard/patient.

---
## Layout

The Patient Portal groups health, payments, privacy, and records in the sidebar.

| Zone | Purpose |
| ---- | ------- |
| **My Health** | Dashboard, appointments, visits, results, medications, vitals |
| **Payments** | Cover, contributions, bills, make a payment |
| **Privacy & Security** | KDPA consent controls |
| **My Records** | Health records, documents, e-sign, profile |

---

## My Health tabs

### My Dashboard

<p align="center">
  <img src="patient/images/05-tab-my-dashboard.png" alt="My Dashboard" width="720" />
</p>

**Figure 43 · Patient — My Dashboard**  
Personal health summary, quick links, and notifications.

---
### Appointments

<p align="center">
  <img src="patient/images/06-tab-appointments.png" alt="Appointments" width="720" />
</p>

**Figure 44 · Patient — Appointments**  
Book, view, and manage upcoming appointments.

---
### Visit History

<p align="center">
  <img src="patient/images/07-tab-visit-history.png" alt="Visit History" width="720" />
</p>

**Figure 45 · Patient — Visit History**  
Past encounters and facility visits.

---
### Test Results

<p align="center">
  <img src="patient/images/08-tab-test-results.png" alt="Test Results" width="720" />
</p>

**Figure 46 · Patient — Test Results**  
Laboratory and diagnostic results as they are released.

---
### Medications

<p align="center">
  <img src="patient/images/09-tab-medications.png" alt="Medications" width="720" />
</p>

**Figure 47 · Patient — Medications**  
Active prescriptions with refill request options.

---
### Vitals & Trends

<p align="center">
  <img src="patient/images/10-tab-vitals-trends.png" alt="Vitals & Trends" width="720" />
</p>

**Figure 48 · Patient — Vitals & Trends**  
Latest vitals and trend charts from your care team.

---
## Payments tabs

### My UniHealth Cover

<p align="center">
  <img src="patient/images/11-tab-coverage.png" alt="My UniHealth Cover" width="720" />
</p>

**Figure 49 · Patient — My UniHealth Cover**  
Benefits, claims status, and account linkage.

---
### Contributions

<p align="center">
  <img src="patient/images/12-tab-contributions.png" alt="Contributions" width="720" />
</p>

**Figure 50 · Patient — Contributions**  
Monthly contribution payment history.

---
### Bills & Invoices

<p align="center">
  <img src="patient/images/13-tab-bills.png" alt="Bills & Invoices" width="720" />
</p>

**Figure 51 · Patient — Bills & Invoices**  
Statements and downloadable invoices.

---
### Make a Payment

<p align="center">
  <img src="patient/images/14-tab-payments.png" alt="Make a Payment" width="720" />
</p>

**Figure 52 · Patient — Make a Payment**  
M-PESA, M-TIBA, and other payment methods.

---
## Records & privacy tabs

### Privacy & Consent

<p align="center">
  <img src="patient/images/15-tab-consent.png" alt="Privacy & Consent" width="720" />
</p>

**Figure 53 · Patient — Privacy & Consent**  
Granular consent toggles for data sharing.

---
### Health Records

<p align="center">
  <img src="patient/images/16-tab-records.png" alt="Health Records" width="720" />
</p>

**Figure 54 · Patient — Health Records**  
Longitudinal health record summary.

---
### Documents

<p align="center">
  <img src="patient/images/17-tab-documents.png" alt="Documents" width="720" />
</p>

**Figure 55 · Patient — Documents**  
Upload and view reports and files.

---
### E-Signatures

<p align="center">
  <img src="patient/images/18-tab-esign.png" alt="E-Signatures" width="720" />
</p>

**Figure 56 · Patient — E-Signatures**  
Sign consent forms and power-of-attorney documents.

---
### My Profile

<p align="center">
  <img src="patient/images/19-tab-profile.png" alt="My Profile" width="720" />
</p>

**Figure 57 · Patient — My Profile**  
Update contact details and account settings.

---
## Tips — Patient

| Issue | Action |
| ----- | ------ |
| PIN rejected | Use 4-digit PIN from registration; contact facility if forgotten |
| Results not visible | Lab may not have released results; check Test Results after 24h |
| Payment failed | Confirm M-PESA number matches registered phone |

<strong>Not for emergencies:</strong> Call emergency services or visit A&E — this portal is not monitored 24/7.

---

# Administrator Dashboard Manual

The Admin Console is the facility control plane: user provisioning, facility registry, RBAC, AI monitoring, audit logs, and integration health for the entire pilot.

**Audience:** System & facility administrators · **URL:** `/dashboard/admin`

## Sign-in

Administrators manage users, facilities, integrations, and security from the Admin Console.

<p align="center">
  <img src="admin/images/01-signin-role-selected.png" alt="Select role" width="720" />
</p>

**Figure 58 · Administrator — Select role**  
The Administrator tile is highlighted in the role carousel. The audit panel logs authentication events for compliance.

---
<p align="center">
  <img src="admin/images/02-signin-credentials.png" alt="Credentials" width="720" />
</p>

**Figure 59 · Administrator — Credentials**  
Enter HRIS Employee ID (e.g. ADMIN-KE-00441), email, and password.

---
<p align="center">
  <img src="admin/images/03-signin-mfa.png" alt="MFA" width="720" />
</p>

**Figure 60 · Administrator — MFA**  
Enter the six-digit OTP sent to your institutional email. In staging/demo, use Practice 360 or OTP 123456.

---
<p align="center">
  <img src="admin/images/04-signin-launch.png" alt="Launch" width="720" />
</p>

**Figure 61 · Administrator — Launch**  
Confirms Administrator — UniHealth Pilot. Full admin console access granted.

---
## Layout

Admin Console sidebar spans main operations, clinical registries, security, and system settings.

| Zone | Purpose |
| ---- | ------- |
| **Main** | Overview, users, facilities, county coverage |
| **Clinical** | Patient registry, staff directory, UniHealth integration |
| **Security & Intelligence** | AI monitor, RBAC, audit log |
| **System** | Health, reports, settings |

---

## Main tabs

### Overview

<p align="center">
  <img src="admin/images/05-tab-overview.png" alt="Overview" width="720" />
</p>

**Figure 62 · Administrator — Overview**  
System KPIs, quick actions, facility status, and live metrics.

---
### User Management

<p align="center">
  <img src="admin/images/06-tab-user-management.png" alt="User Management" width="720" />
</p>

**Figure 63 · Administrator — User Management**  
Create, edit, disable users; assign roles and facilities.

---
### Facilities

<p align="center">
  <img src="admin/images/07-tab-facilities.png" alt="Facilities" width="720" />
</p>

**Figure 64 · Administrator — Facilities**  
Facility registry, levels, latency, and connection status.

---
### County Coverage

<p align="center">
  <img src="admin/images/08-tab-county-coverage.png" alt="County Coverage" width="720" />
</p>

**Figure 65 · Administrator — County Coverage**  
Geographic coverage map and county-level stats.

---
## Clinical registry tabs

### Patient Registry

<p align="center">
  <img src="admin/images/09-tab-patient-registry.png" alt="Patient Registry" width="720" />
</p>

**Figure 66 · Administrator — Patient Registry**  
Search and manage registered patients across facilities.

---
### Staff Directory

<p align="center">
  <img src="admin/images/10-tab-staff-directory.png" alt="Staff Directory" width="720" />
</p>

**Figure 67 · Administrator — Staff Directory**  
Clinical and operational staff roster.

---
### UniHealth Integration

<p align="center">
  <img src="admin/images/11-tab-unihealth-integration.png" alt="UniHealth Integration" width="720" />
</p>

**Figure 68 · Administrator — UniHealth Integration**  
Claims, biometric, and Practice 360 integration status.

---
## Security & system tabs

### AI Monitor

<p align="center">
  <img src="admin/images/12-tab-ai-monitor.png" alt="AI Monitor" width="720" />
</p>

**Figure 69 · Administrator — AI Monitor**  
AI tier usage, anomaly counts, and WebSocket connection stats.

---
### RBAC & Roles

<p align="center">
  <img src="admin/images/13-tab-rbac.png" alt="RBAC & Roles" width="720" />
</p>

**Figure 70 · Administrator — RBAC & Roles**  
Role definitions and permission matrix.

---
### Audit Log

<p align="center">
  <img src="admin/images/14-tab-audit-log.png" alt="Audit Log" width="720" />
</p>

**Figure 71 · Administrator — Audit Log**  
System-wide audit events and export.

---
### System Health

<p align="center">
  <img src="admin/images/15-tab-system-health.png" alt="System Health" width="720" />
</p>

**Figure 72 · Administrator — System Health**  
Gateway, database, and service health checks.

---
### Reports

<p align="center">
  <img src="admin/images/16-tab-reports.png" alt="Reports" width="720" />
</p>

**Figure 73 · Administrator — Reports**  
Operational and compliance report generation.

---
### Settings

<p align="center">
  <img src="admin/images/17-tab-settings.png" alt="Settings" width="720" />
</p>

**Figure 74 · Administrator — Settings**  
Policy toggles, feature flags, and facility defaults.

---
## Tips — Administrator

| Issue | Action |
| ----- | ------ |
| Cannot create user | Verify RBAC permissions and unique email |
| Facility shows offline | Check gateway and KMHFL sync job |
| Metrics stale | Prometheus/metrics endpoint on :8100 |

<strong>Audit everything:</strong> Admin actions are logged — document changes in change-management tickets.

---

# Laboratory Dashboard Manual

The Laboratory portal spans specimen collection through results entry, QC, imaging modalities, specialised labs, and compliance reporting for diagnostic services.

**Audience:** Laboratory & diagnostic imaging staff · **URL:** `/dashboard/lab`

## Sign-in

Lab staff sign in with Laboratory Staff ID, email, password, and MFA.

<p align="center">
  <img src="lab/images/01-signin-role-selected.png" alt="Select role" width="720" />
</p>

**Figure 75 · Laboratory — Select role**  
The Laboratory tile is highlighted in the role carousel. The audit panel logs authentication events for compliance.

---
<p align="center">
  <img src="lab/images/02-signin-credentials.png" alt="Credentials" width="720" />
</p>

**Figure 76 · Laboratory — Credentials**  
Enter Laboratory Staff ID (e.g. LAB-KE-00231), email, and password.

---
<p align="center">
  <img src="lab/images/03-signin-mfa.png" alt="MFA" width="720" />
</p>

**Figure 77 · Laboratory — MFA**  
Enter the six-digit OTP sent to your institutional email. In staging/demo, use Practice 360 or OTP 123456.

---
<p align="center">
  <img src="lab/images/04-signin-launch.png" alt="Launch" width="720" />
</p>

**Figure 78 · Laboratory — Launch**  
Confirms Laboratory — Diagnostic Services. Opens Lab & Imaging portal.

---
## Layout

The lab dashboard covers core workflow, imaging modalities, specialised labs, and compliance.

| Zone | Purpose |
| ---- | ------- |
| **Lab Workflow** | Collection, test queue, results entry, QC |
| **Diagnostic Imaging** | X-ray, MRI/CT, ultrasound, mammography, nuclear |
| **Specialised Labs** | Pathology, microbiology, blood bank, molecular |
| **Inventory & Compliance** | Reagents, reports, audit, health |

---

## Lab workflow tabs

### Overview

<p align="center">
  <img src="lab/images/05-tab-overview.png" alt="Overview" width="720" />
</p>

**Figure 79 · Laboratory — Overview**  
Daily KPIs: pending collections, queue depth, studies, and QC status.

---
### Sample Collection

<p align="center">
  <img src="lab/images/06-tab-sample-collection.png" alt="Sample Collection" width="720" />
</p>

**Figure 80 · Laboratory — Sample Collection**  
Barcode collection workflow and pending draws.

---
### Test Queue

<p align="center">
  <img src="lab/images/07-tab-test-queue.png" alt="Test Queue" width="720" />
</p>

**Figure 81 · Laboratory — Test Queue**  
Active orders awaiting processing.

---
### Results Entry

<p align="center">
  <img src="lab/images/08-tab-results-entry.png" alt="Results Entry" width="720" />
</p>

**Figure 82 · Laboratory — Results Entry**  
Enter and validate results; triggers critical alerts.

---
### Quality Control

<p align="center">
  <img src="lab/images/09-tab-quality-control.png" alt="Quality Control" width="720" />
</p>

**Figure 83 · Laboratory — Quality Control**  
QC runs, Westgard rules, and instrument calibration.

---
## Diagnostic imaging tabs

### All Imaging

<p align="center">
  <img src="lab/images/10-tab-all-imaging.png" alt="All Imaging" width="720" />
</p>

**Figure 84 · Laboratory — All Imaging**  
Combined imaging worklist across modalities.

---
### X-Ray

<p align="center">
  <img src="lab/images/11-tab-xray.png" alt="X-Ray" width="720" />
</p>

**Figure 85 · Laboratory — X-Ray**  
Radiography orders and reporting queue.

---
### MRI / CT

<p align="center">
  <img src="lab/images/12-tab-mri-ct.png" alt="MRI / CT" width="720" />
</p>

**Figure 86 · Laboratory — MRI / CT**  
Cross-sectional imaging schedule and results.

---
### Ultrasound

<p align="center">
  <img src="lab/images/13-tab-ultrasound.png" alt="Ultrasound" width="720" />
</p>

**Figure 87 · Laboratory — Ultrasound**  
Sonography studies and worksheets.

---
### Mammography

<p align="center">
  <img src="lab/images/14-tab-mammography.png" alt="Mammography" width="720" />
</p>

**Figure 88 · Laboratory — Mammography**  
Screening and diagnostic mammography queue.

---
### Nuclear Medicine

<p align="center">
  <img src="lab/images/15-tab-nuclear.png" alt="Nuclear Medicine" width="720" />
</p>

**Figure 89 · Laboratory — Nuclear Medicine**  
PET/SPECT and nuclear medicine orders.

---
## Specialised & compliance tabs

### Pathology

<p align="center">
  <img src="lab/images/16-tab-pathology.png" alt="Pathology" width="720" />
</p>

**Figure 90 · Laboratory — Pathology**  
Histopathology and cytology workflows.

---
### Microbiology

<p align="center">
  <img src="lab/images/17-tab-microbiology.png" alt="Microbiology" width="720" />
</p>

**Figure 91 · Laboratory — Microbiology**  
Culture, sensitivity, and infection reporting.

---
### Blood Bank

<p align="center">
  <img src="lab/images/18-tab-blood-bank.png" alt="Blood Bank" width="720" />
</p>

**Figure 92 · Laboratory — Blood Bank**  
Cross-match, issue, and inventory.

---
### Molecular Dx

<p align="center">
  <img src="lab/images/19-tab-molecular.png" alt="Molecular Dx" width="720" />
</p>

**Figure 93 · Laboratory — Molecular Dx**  
PCR and molecular diagnostic panels.

---
### Reagents & Supplies

<p align="center">
  <img src="lab/images/20-tab-reagents.png" alt="Reagents & Supplies" width="720" />
</p>

**Figure 94 · Laboratory — Reagents & Supplies**  
Stock levels and reorder alerts.

---
### Reports

<p align="center">
  <img src="lab/images/21-tab-reports.png" alt="Reports" width="720" />
</p>

**Figure 95 · Laboratory — Reports**  
Turnaround, workload, and regulatory reports.

---
### Audit Trail

<p align="center">
  <img src="lab/images/22-tab-audit.png" alt="Audit Trail" width="720" />
</p>

**Figure 96 · Laboratory — Audit Trail**  
Specimen and result audit history.

---
### System Health

<p align="center">
  <img src="lab/images/23-tab-system-health.png" alt="System Health" width="720" />
</p>

**Figure 97 · Laboratory — System Health**  
LIS connectivity and gateway status.

---
## Tips — Laboratory

| Issue | Action |
| ----- | ------ |
| Order not in queue | Verify doctor order reached gateway; refresh polling |
| QC fail | Hold instrument; repeat controls per SOP |
| Imaging study missing | Check referring clinician order in imaging tab |

<strong>Result verification:</strong> Dual-check critical results before release where policy requires.

---

# Pharmacy Dashboard Manual

The Pharmacy workstation covers the full dispensing loop: Rx queue, clinical verification, stock and KEMSA orders, interaction checks, and ModelCover claims.

**Audience:** Pharmacists & dispensing staff · **URL:** `/dashboard/pharmacy`

## Sign-in

Pharmacy staff sign in with Pharmacy Registration ID, email, password, and MFA.

<p align="center">
  <img src="pharmacy/images/01-signin-role-selected.png" alt="Select role" width="720" />
</p>

**Figure 98 · Pharmacy — Select role**  
The Pharmacy tile is highlighted in the role carousel. The audit panel logs authentication events for compliance.

---
<p align="center">
  <img src="pharmacy/images/02-signin-credentials.png" alt="Credentials" width="720" />
</p>

**Figure 99 · Pharmacy — Credentials**  
Enter Pharmacy Registration ID (e.g. PHARM-00441), email, and password.

---
<p align="center">
  <img src="pharmacy/images/03-signin-mfa.png" alt="MFA" width="720" />
</p>

**Figure 100 · Pharmacy — MFA**  
Enter the six-digit OTP sent to your institutional email. In staging/demo, use Practice 360 or OTP 123456.

---
<p align="center">
  <img src="pharmacy/images/04-signin-launch.png" alt="Launch" width="720" />
</p>

**Figure 101 · Pharmacy — Launch**  
Confirms Pharmacy — Clinical Dispensing. Opens dispensing workstation.

---
## Layout

Pharmacy portal sidebar covers dispensing, inventory, clinical checks, and compliance.

| Zone | Purpose |
| ---- | ------- |
| **Dispensing** | Overview, Rx queue, verify, patient lookup, compounding |
| **Inventory** | Stock, reorder, KEMSA, claims, vaccinations |
| **Clinical** | Drug interactions and pharmacist interventions |
| **Security & Compliance** | Audit trail, API reference, system health |

---

## Dispensing tabs

### Overview

<p align="center">
  <img src="pharmacy/images/05-tab-overview.png" alt="Overview" width="720" />
</p>

**Figure 102 · Pharmacy — Overview**  
Shift summary: pending Rx, stock alerts, and KPI cards.

---
### Prescription Queue

<p align="center">
  <img src="pharmacy/images/06-tab-prescription-queue.png" alt="Prescription Queue" width="720" />
</p>

**Figure 103 · Pharmacy — Prescription Queue**  
Incoming prescriptions from clinicians — priority sorted.

---
### Verify & Approve

<p align="center">
  <img src="pharmacy/images/07-tab-verify-approve.png" alt="Verify & Approve" width="720" />
</p>

**Figure 104 · Pharmacy — Verify & Approve**  
Clinical verification before dispensing.

---
### Patient Lookup

<p align="center">
  <img src="pharmacy/images/08-tab-patient-lookup.png" alt="Patient Lookup" width="720" />
</p>

**Figure 105 · Pharmacy — Patient Lookup**  
Search patient allergy and medication history.

---
### Compounding

<p align="center">
  <img src="pharmacy/images/09-tab-compounding.png" alt="Compounding" width="720" />
</p>

**Figure 106 · Pharmacy — Compounding**  
Non-sterile and sterile compounding workflows.

---
## Inventory tabs

### Stock Levels

<p align="center">
  <img src="pharmacy/images/10-tab-stock-levels.png" alt="Stock Levels" width="720" />
</p>

**Figure 107 · Pharmacy — Stock Levels**  
Real-time inventory with low-stock badges.

---
### Reorder List

<p align="center">
  <img src="pharmacy/images/11-tab-reorder-list.png" alt="Reorder List" width="720" />
</p>

**Figure 108 · Pharmacy — Reorder List**  
Items below minimum — generate purchase requests.

---
### KEMSA Orders

<p align="center">
  <img src="pharmacy/images/12-tab-kemsa-orders.png" alt="KEMSA Orders" width="720" />
</p>

**Figure 109 · Pharmacy — KEMSA Orders**  
Kenya Medical Supplies Authority order tracking.

---
### ModelCover Claims

<p align="center">
  <img src="pharmacy/images/13-tab-claims.png" alt="ModelCover Claims" width="720" />
</p>

**Figure 110 · Pharmacy — ModelCover Claims**  
Insurance claim submission for dispensed items.

---
### Vaccinations

<p align="center">
  <img src="pharmacy/images/14-tab-vaccinations.png" alt="Vaccinations" width="720" />
</p>

**Figure 111 · Pharmacy — Vaccinations**  
Immunisation stock and administration log.

---
## Clinical & compliance tabs

### Drug Interactions

<p align="center">
  <img src="pharmacy/images/15-tab-drug-interactions.png" alt="Drug Interactions" width="720" />
</p>

**Figure 112 · Pharmacy — Drug Interactions**  
Interaction checker for new prescriptions.

---
### Pharmacist Notes

<p align="center">
  <img src="pharmacy/images/16-tab-pharmacist-notes.png" alt="Pharmacist Notes" width="720" />
</p>

**Figure 113 · Pharmacy — Pharmacist Notes**  
Interventions and counselling documentation.

---
### Audit Trail

<p align="center">
  <img src="pharmacy/images/17-tab-audit.png" alt="Audit Trail" width="720" />
</p>

**Figure 114 · Pharmacy — Audit Trail**  
Dispensing and stock movement audit log.

---
### API Reference

<p align="center">
  <img src="pharmacy/images/18-tab-api-reference.png" alt="API Reference" width="720" />
</p>

**Figure 115 · Pharmacy — API Reference**  
Integration endpoints for external systems.

---
### System Health

<p align="center">
  <img src="pharmacy/images/19-tab-system-health.png" alt="System Health" width="720" />
</p>

**Figure 116 · Pharmacy — System Health**  
Gateway and inventory sync status.

---
## Tips — Pharmacy

| Issue | Action |
| ----- | ------ |
| Rx queue empty | Confirm clinician orders reached /pharmacy API |
| Stock mismatch | Run stock reconcile; check audit trail |
| Interaction alert | Contact prescriber before overriding |

<strong>Patient safety:</strong> Never bypass verification for look-alike/sound-alike drugs.

---

