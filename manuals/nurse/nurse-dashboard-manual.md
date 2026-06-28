# Nurse Dashboard Manual

**Audience:** Nurses & clinical officers  
**URL:** `/dashboard/nurse`  
**HTML manual:** [nurse-dashboard-manual.html](nurse-dashboard-manual.html)

---

## 1. Sign-in — Nurse / CO

Nursing staff sign in with registration number, email, password, and MFA — same four-step flow as other clinicians.

<p align="center">
  <img src="images/01-signin-role-selected.png" alt="Role selection" width="720" />
</p>

**Figure 1 — Role selection**  
The Nurse / CO tile is highlighted in the role carousel. The audit panel logs authentication events for compliance.

---
<p align="center">
  <img src="images/02-signin-credentials.png" alt="Credentials" width="720" />
</p>

**Figure 2 — Credentials**  
Enter Nursing Registration No. (e.g. RN/12345), institutional email, and password.

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
Confirms Nurse — Pilot Hospital B. Redirects to the Nursing Station dashboard.

---
## 2. Dashboard layout

| Zone | Purpose |
| ---- | ------- |
| **Sidebar — Ward** | Shift overview, patients, chart, triage, vitals, MAR, tasks, handover |
| **Sidebar — More** | Fluids, wounds, incidents, e-sign, supplies |
| **Top bar** | Shift context, search, alerts, sign-out |

---

## 3. Ward tabs

### Shift Overview

<p align="center">
  <img src="images/05-tab-shift-overview.png" alt="Shift Overview" width="720" />
</p>

**Figure 5 — Shift Overview**  
Start-of-shift summary: assigned patients, tasks due, ward alerts, and AI anomaly feed.

---
### My Patients

<p align="center">
  <img src="images/06-tab-my-patients.png" alt="My Patients" width="720" />
</p>

**Figure 6 — My Patients**  
Roster of patients under your care with acuity and last-vitals indicators.

---
### Patient Chart

<p align="center">
  <img src="images/07-tab-patient-chart.png" alt="Patient Chart" width="720" />
</p>

**Figure 7 — Patient Chart**  
Read-only longitudinal view for the active patient — allergies, meds, obs.

---
### Triage Queue

<p align="center">
  <img src="images/08-tab-triage-queue.png" alt="Triage Queue" width="720" />
</p>

**Figure 8 — Triage Queue**  
Emergency and walk-in triage queue with priority scoring.

---
### Record Vitals

<p align="center">
  <img src="images/09-tab-record-vitals.png" alt="Record Vitals" width="720" />
</p>

**Figure 9 — Record Vitals**  
Capture BP, HR, RR, temp, SpO₂, pain, and AVPU — body diagram assist.

---
### MAR

<p align="center">
  <img src="images/10-tab-mar.png" alt="MAR" width="720" />
</p>

**Figure 10 — MAR**  
Medication Administration Record — due doses, given/refused/hold actions.

---
### Tasks

<p align="center">
  <img src="images/11-tab-tasks.png" alt="Tasks" width="720" />
</p>

**Figure 11 — Tasks**  
Care plan tasks and reminders with completion logging.

---
### Handover

<p align="center">
  <img src="images/12-tab-handover.png" alt="Handover" width="720" />
</p>

**Figure 12 — Handover**  
SBAR-style shift handover notes for outgoing/incoming staff.

---
## 4. Extended care tabs

### Fluid Balance

<p align="center">
  <img src="images/13-tab-fluid-balance.png" alt="Fluid Balance" width="720" />
</p>

**Figure 13 — Fluid Balance**  
Intake/output charting and fluid balance trends.

---
### Wound Care

<p align="center">
  <img src="images/14-tab-wound-care.png" alt="Wound Care" width="720" />
</p>

**Figure 14 — Wound Care**  
Wound assessment documentation and dressing plans.

---
### Incidents

<p align="center">
  <img src="images/15-tab-incidents.png" alt="Incidents" width="720" />
</p>

**Figure 15 — Incidents**  
File and review clinical incident reports.

---
### E-Signatures

<p align="center">
  <img src="images/16-tab-esign.png" alt="E-Signatures" width="720" />
</p>

**Figure 16 — E-Signatures**  
Consent and nursing document e-sign pipeline.

---
### Supplies

<p align="center">
  <img src="images/17-tab-supplies.png" alt="Supplies" width="720" />
</p>

**Figure 17 — Supplies**  
Ward supply requests and inventory levels.

---
## 5. Tips & troubleshooting

| Issue | Action |
| ----- | ------ |
| Vitals not saving | Check gateway; confirm patient ID selected |
| MAR empty | Verify medication requests exist for patient via API |
| AI alerts silent | WebSocket connects direct to :8100 in dev; REST fallback polls every 15s |

<strong>Clinical responsibility:</strong> Vitals and MAR entries must be verified at bedside before submission.
