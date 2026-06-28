# Doctor Dashboard Manual

**Audience:** Physicians & specialists  
**URL:** `/dashboard/doctor`  
**HTML manual:** [doctor-dashboard-manual.html](doctor-dashboard-manual.html)

---

## 1. Sign-in — Doctor

Doctors use the four-step staff sign-in: select role → credentials → MFA → launch dashboard.

<p align="center">
  <img src="images/01-signin-role-selected.png" alt="Role selection" width="720" />
</p>

**Figure 1 — Role selection**  
The Doctor tile is highlighted in the role carousel. The audit panel logs authentication events for compliance.

---
<p align="center">
  <img src="images/02-signin-credentials.png" alt="Credentials" width="720" />
</p>

**Figure 2 — Credentials**  
Enter Medical Registration No. (e.g. A4821), institutional email, and password. Policy requires uppercase, numbers, and ≥8 characters.

---
<p align="center">
  <img src="images/03-signin-mfa.png" alt="MFA" width="720" />
</p>

**Figure 3 — MFA**  
Enter the six-digit OTP sent to your institutional email. In staging/demo, use Practice 360 or OTP 123456.

---
<p align="center">
  <img src="images/04-signin-launch.png" alt="Launch" width="720" />
</p>

**Figure 4 — Launch**  
Confirms Doctor — Pilot Hospital A. Session token authorises API calls to the gateway (staging port 8100).

---
## 2. Dashboard layout

| Zone | Purpose |
| ---- | ------- |
| **Sidebar — Clinical** | Overview, chart, queue, workup, ward, labs, Rx, imaging |
| **Sidebar — Workflow** | Notes, incidents, e-sign, referrals, procedures, claims, schedule |
| **Sidebar — Admin** | Audit trail and system health |
| **Top bar** | Page title, patient context, search, notifications |

---

## 3. Clinical tabs

### Today's Overview

<p align="center">
  <img src="images/05-tab-home-overview.png" alt="Today's Overview" width="720" />
</p>

**Figure 5 — Today's Overview**  
Shift command centre: KPIs, AI alerts, ward badges. Polls every 5–8s when API is live.

---
### Patient Chart

<p align="center">
  <img src="images/06-tab-patient-chart.png" alt="Patient Chart" width="720" />
</p>

**Figure 6 — Patient Chart**  
Longitudinal record: demographics, allergies, conditions, medications, observations.

---
### Patient Queue

<p align="center">
  <img src="images/07-tab-patient-queue.png" alt="Patient Queue" width="720" />
</p>

**Figure 7 — Patient Queue**  
Outpatient waiting list with triage priority. Select a row to set the active patient.

---
### Patient Workup

<p align="center">
  <img src="images/08-tab-patient-workup.png" alt="Patient Workup" width="720" />
</p>

**Figure 8 — Patient Workup**  
Structured assessment, AI risk score (pilot), clinical AI panel, and e-sign links.

---
### Ward / Beds

<p align="center">
  <img src="images/09-tab-ward-beds.png" alt="Ward / Beds" width="720" />
</p>

**Figure 9 — Ward / Beds**  
Inpatient bed map, occupancy status, and ward capacity forecast.

---
### Lab Orders & Results

<p align="center">
  <img src="images/10-tab-labs.png" alt="Lab Orders & Results" width="720" />
</p>

**Figure 10 — Lab Orders & Results**  
Place lab orders and review results; critical values per local protocol.

---
### Prescriptions

<p align="center">
  <img src="images/11-tab-prescriptions.png" alt="Prescriptions" width="720" />
</p>

**Figure 11 — Prescriptions**  
Compose medication orders — drug, dose, route — sent to pharmacy queue.

---
### Imaging & Reports

<p align="center">
  <img src="images/12-tab-imaging.png" alt="Imaging & Reports" width="720" />
</p>

**Figure 12 — Imaging & Reports**  
Request radiology studies and track report status.

---
## 4. Workflow tabs

### Clinical Notes

<p align="center">
  <img src="images/13-tab-clinical-notes.png" alt="Clinical Notes" width="720" />
</p>

**Figure 13 — Clinical Notes**  
Progress, admission, discharge, and procedure notes — audit-logged on save.

---
### Incident Reports

<p align="center">
  <img src="images/14-tab-incidents.png" alt="Incident Reports" width="720" />
</p>

**Figure 14 — Incident Reports**  
Patient-linked incident reports for governance and quality.

---
### E-Signatures

<p align="center">
  <img src="images/15-tab-esign.png" alt="E-Signatures" width="720" />
</p>

**Figure 15 — E-Signatures**  
Upload → AI Review → Sign → Verify document pipeline.

---
### Referrals

<p align="center">
  <img src="images/16-tab-referrals.png" alt="Referrals" width="720" />
</p>

**Figure 16 — Referrals**  
Inter-facility referrals with hospital, department, and patient pickers.

---
### Procedures

<p align="center">
  <img src="images/17-tab-procedures.png" alt="Procedures" width="720" />
</p>

**Figure 17 — Procedures**  
Log planned or completed procedures; links to e-sign consent.

---
### UniHealth Claims

<p align="center">
  <img src="images/18-tab-claims.png" alt="UniHealth Claims" width="720" />
</p>

**Figure 18 — UniHealth Claims**  
Insurance and cover claims initiation and tracking.

---
### My Schedule

<p align="center">
  <img src="images/19-tab-schedule.png" alt="My Schedule" width="720" />
</p>

**Figure 19 — My Schedule**  
Clinic blocks and theatre slots for the week.

---
## 5. Admin & system tabs

### Audit Trail

<p align="center">
  <img src="images/20-tab-audit.png" alt="Audit Trail" width="720" />
</p>

**Figure 20 — Audit Trail**  
Live UI action feed from /ui/actions for compliance review.

---
### System Health

<p align="center">
  <img src="images/21-tab-system-health.png" alt="System Health" width="720" />
</p>

**Figure 21 — System Health**  
AI tier, rules engine, and gateway connectivity status.

---
## 6. Tips & troubleshooting

| Issue | Action |
| ----- | ------ |
| Blank panels / Failed to fetch | Start ./scripts/run_staging.sh; hard-refresh; verify Vite proxy → :8100 |
| AI risk unavailable | System Health tab; verify /ai/risk-score endpoint |
| E-sign upload fails | Disable ad-blockers; API path is /esign not /legal |
| Wrong patient in orders | Re-select from queue or ward first |

<strong>AI disclaimer:</strong> Risk scores and hints are pilot aids only — always apply clinical judgement.
