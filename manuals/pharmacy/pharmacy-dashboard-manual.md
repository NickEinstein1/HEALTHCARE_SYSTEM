# Pharmacy Dashboard Manual

**Audience:** Pharmacists & dispensing staff  
**URL:** `/dashboard/pharmacy`  
**HTML manual:** [pharmacy-dashboard-manual.html](pharmacy-dashboard-manual.html)

---

## 1. Sign-in — Pharmacy

Pharmacy staff sign in with Pharmacy Registration ID, email, password, and MFA.

<p align="center">
  <img src="images/01-signin-role-selected.png" alt="Role selection" width="720" />
</p>

**Figure 1 — Role selection**  
The Pharmacy tile is highlighted in the role carousel. The audit panel logs authentication events for compliance.

---
<p align="center">
  <img src="images/02-signin-credentials.png" alt="Credentials" width="720" />
</p>

**Figure 2 — Credentials**  
Enter Pharmacy Registration ID (e.g. PHARM-00441), email, and password.

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
Confirms Pharmacy — Clinical Dispensing. Opens dispensing workstation.

---
## 2. Dashboard layout

| Zone | Purpose |
| ---- | ------- |
| **Dispensing** | Overview, Rx queue, verify, patient lookup, compounding |
| **Inventory** | Stock, reorder, KEMSA, claims, vaccinations |
| **Clinical** | Drug interactions and pharmacist interventions |
| **Security & Compliance** | Audit trail, API reference, system health |

---

## 3. Dispensing tabs

### Overview

<p align="center">
  <img src="images/05-tab-overview.png" alt="Overview" width="720" />
</p>

**Figure 5 — Overview**  
Shift summary: pending Rx, stock alerts, and KPI cards.

---
### Prescription Queue

<p align="center">
  <img src="images/06-tab-prescription-queue.png" alt="Prescription Queue" width="720" />
</p>

**Figure 6 — Prescription Queue**  
Incoming prescriptions from clinicians — priority sorted.

---
### Verify & Approve

<p align="center">
  <img src="images/07-tab-verify-approve.png" alt="Verify & Approve" width="720" />
</p>

**Figure 7 — Verify & Approve**  
Clinical verification before dispensing.

---
### Patient Lookup

<p align="center">
  <img src="images/08-tab-patient-lookup.png" alt="Patient Lookup" width="720" />
</p>

**Figure 8 — Patient Lookup**  
Search patient allergy and medication history.

---
### Compounding

<p align="center">
  <img src="images/09-tab-compounding.png" alt="Compounding" width="720" />
</p>

**Figure 9 — Compounding**  
Non-sterile and sterile compounding workflows.

---
## 4. Inventory tabs

### Stock Levels

<p align="center">
  <img src="images/10-tab-stock-levels.png" alt="Stock Levels" width="720" />
</p>

**Figure 10 — Stock Levels**  
Real-time inventory with low-stock badges.

---
### Reorder List

<p align="center">
  <img src="images/11-tab-reorder-list.png" alt="Reorder List" width="720" />
</p>

**Figure 11 — Reorder List**  
Items below minimum — generate purchase requests.

---
### KEMSA Orders

<p align="center">
  <img src="images/12-tab-kemsa-orders.png" alt="KEMSA Orders" width="720" />
</p>

**Figure 12 — KEMSA Orders**  
Kenya Medical Supplies Authority order tracking.

---
### ModelCover Claims

<p align="center">
  <img src="images/13-tab-claims.png" alt="ModelCover Claims" width="720" />
</p>

**Figure 13 — ModelCover Claims**  
Insurance claim submission for dispensed items.

---
### Vaccinations

<p align="center">
  <img src="images/14-tab-vaccinations.png" alt="Vaccinations" width="720" />
</p>

**Figure 14 — Vaccinations**  
Immunisation stock and administration log.

---
## 5. Clinical & compliance tabs

### Drug Interactions

<p align="center">
  <img src="images/15-tab-drug-interactions.png" alt="Drug Interactions" width="720" />
</p>

**Figure 15 — Drug Interactions**  
Interaction checker for new prescriptions.

---
### Pharmacist Notes

<p align="center">
  <img src="images/16-tab-pharmacist-notes.png" alt="Pharmacist Notes" width="720" />
</p>

**Figure 16 — Pharmacist Notes**  
Interventions and counselling documentation.

---
### Audit Trail

<p align="center">
  <img src="images/17-tab-audit.png" alt="Audit Trail" width="720" />
</p>

**Figure 17 — Audit Trail**  
Dispensing and stock movement audit log.

---
### API Reference

<p align="center">
  <img src="images/18-tab-api-reference.png" alt="API Reference" width="720" />
</p>

**Figure 18 — API Reference**  
Integration endpoints for external systems.

---
### System Health

<p align="center">
  <img src="images/19-tab-system-health.png" alt="System Health" width="720" />
</p>

**Figure 19 — System Health**  
Gateway and inventory sync status.

---
## 6. Tips & troubleshooting

| Issue | Action |
| ----- | ------ |
| Rx queue empty | Confirm clinician orders reached /pharmacy API |
| Stock mismatch | Run stock reconcile; check audit trail |
| Interaction alert | Contact prescriber before overriding |

<strong>Patient safety:</strong> Never bypass verification for look-alike/sound-alike drugs.
