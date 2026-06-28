# Laboratory Dashboard Manual

**Audience:** Laboratory & diagnostic imaging staff  
**URL:** `/dashboard/lab`  
**HTML manual:** [lab-dashboard-manual.html](lab-dashboard-manual.html)

---

## 1. Sign-in — Laboratory

Lab staff sign in with Laboratory Staff ID, email, password, and MFA.

<p align="center">
  <img src="images/01-signin-role-selected.png" alt="Role selection" width="720" />
</p>

**Figure 1 — Role selection**  
The Laboratory tile is highlighted in the role carousel. The audit panel logs authentication events for compliance.

---
<p align="center">
  <img src="images/02-signin-credentials.png" alt="Credentials" width="720" />
</p>

**Figure 2 — Credentials**  
Enter Laboratory Staff ID (e.g. LAB-KE-00231), email, and password.

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
Confirms Laboratory — Diagnostic Services. Opens Lab & Imaging portal.

---
## 2. Dashboard layout

| Zone | Purpose |
| ---- | ------- |
| **Lab Workflow** | Collection, test queue, results entry, QC |
| **Diagnostic Imaging** | X-ray, MRI/CT, ultrasound, mammography, nuclear |
| **Specialised Labs** | Pathology, microbiology, blood bank, molecular |
| **Inventory & Compliance** | Reagents, reports, audit, health |

---

## 3. Lab workflow tabs

### Overview

<p align="center">
  <img src="images/05-tab-overview.png" alt="Overview" width="720" />
</p>

**Figure 5 — Overview**  
Daily KPIs: pending collections, queue depth, studies, and QC status.

---
### Sample Collection

<p align="center">
  <img src="images/06-tab-sample-collection.png" alt="Sample Collection" width="720" />
</p>

**Figure 6 — Sample Collection**  
Barcode collection workflow and pending draws.

---
### Test Queue

<p align="center">
  <img src="images/07-tab-test-queue.png" alt="Test Queue" width="720" />
</p>

**Figure 7 — Test Queue**  
Active orders awaiting processing.

---
### Results Entry

<p align="center">
  <img src="images/08-tab-results-entry.png" alt="Results Entry" width="720" />
</p>

**Figure 8 — Results Entry**  
Enter and validate results; triggers critical alerts.

---
### Quality Control

<p align="center">
  <img src="images/09-tab-quality-control.png" alt="Quality Control" width="720" />
</p>

**Figure 9 — Quality Control**  
QC runs, Westgard rules, and instrument calibration.

---
## 4. Diagnostic imaging tabs

### All Imaging

<p align="center">
  <img src="images/10-tab-all-imaging.png" alt="All Imaging" width="720" />
</p>

**Figure 10 — All Imaging**  
Combined imaging worklist across modalities.

---
### X-Ray

<p align="center">
  <img src="images/11-tab-xray.png" alt="X-Ray" width="720" />
</p>

**Figure 11 — X-Ray**  
Radiography orders and reporting queue.

---
### MRI / CT

<p align="center">
  <img src="images/12-tab-mri-ct.png" alt="MRI / CT" width="720" />
</p>

**Figure 12 — MRI / CT**  
Cross-sectional imaging schedule and results.

---
### Ultrasound

<p align="center">
  <img src="images/13-tab-ultrasound.png" alt="Ultrasound" width="720" />
</p>

**Figure 13 — Ultrasound**  
Sonography studies and worksheets.

---
### Mammography

<p align="center">
  <img src="images/14-tab-mammography.png" alt="Mammography" width="720" />
</p>

**Figure 14 — Mammography**  
Screening and diagnostic mammography queue.

---
### Nuclear Medicine

<p align="center">
  <img src="images/15-tab-nuclear.png" alt="Nuclear Medicine" width="720" />
</p>

**Figure 15 — Nuclear Medicine**  
PET/SPECT and nuclear medicine orders.

---
## 5. Specialised & compliance tabs

### Pathology

<p align="center">
  <img src="images/16-tab-pathology.png" alt="Pathology" width="720" />
</p>

**Figure 16 — Pathology**  
Histopathology and cytology workflows.

---
### Microbiology

<p align="center">
  <img src="images/17-tab-microbiology.png" alt="Microbiology" width="720" />
</p>

**Figure 17 — Microbiology**  
Culture, sensitivity, and infection reporting.

---
### Blood Bank

<p align="center">
  <img src="images/18-tab-blood-bank.png" alt="Blood Bank" width="720" />
</p>

**Figure 18 — Blood Bank**  
Cross-match, issue, and inventory.

---
### Molecular Dx

<p align="center">
  <img src="images/19-tab-molecular.png" alt="Molecular Dx" width="720" />
</p>

**Figure 19 — Molecular Dx**  
PCR and molecular diagnostic panels.

---
### Reagents & Supplies

<p align="center">
  <img src="images/20-tab-reagents.png" alt="Reagents & Supplies" width="720" />
</p>

**Figure 20 — Reagents & Supplies**  
Stock levels and reorder alerts.

---
### Reports

<p align="center">
  <img src="images/21-tab-reports.png" alt="Reports" width="720" />
</p>

**Figure 21 — Reports**  
Turnaround, workload, and regulatory reports.

---
### Audit Trail

<p align="center">
  <img src="images/22-tab-audit.png" alt="Audit Trail" width="720" />
</p>

**Figure 22 — Audit Trail**  
Specimen and result audit history.

---
### System Health

<p align="center">
  <img src="images/23-tab-system-health.png" alt="System Health" width="720" />
</p>

**Figure 23 — System Health**  
LIS connectivity and gateway status.

---
## 6. Tips & troubleshooting

| Issue | Action |
| ----- | ------ |
| Order not in queue | Verify doctor order reached gateway; refresh polling |
| QC fail | Hold instrument; repeat controls per SOP |
| Imaging study missing | Check referring clinician order in imaging tab |

<strong>Result verification:</strong> Dual-check critical results before release where policy requires.
