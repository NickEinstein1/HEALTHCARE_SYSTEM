# Administrator Dashboard Manual

**Audience:** System & facility administrators  
**URL:** `/dashboard/admin`  
**HTML manual:** [admin-dashboard-manual.html](admin-dashboard-manual.html)

---

## 1. Sign-in — Administrator

Administrators manage users, facilities, integrations, and security from the Admin Console.

<p align="center">
  <img src="images/01-signin-role-selected.png" alt="Role selection" width="720" />
</p>

**Figure 1 — Role selection**  
The Administrator tile is highlighted in the role carousel. The audit panel logs authentication events for compliance.

---
<p align="center">
  <img src="images/02-signin-credentials.png" alt="Credentials" width="720" />
</p>

**Figure 2 — Credentials**  
Enter HRIS Employee ID (e.g. ADMIN-KE-00441), email, and password.

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
Confirms Administrator — UniHealth Pilot. Full admin console access granted.

---
## 2. Dashboard layout

| Zone | Purpose |
| ---- | ------- |
| **Main** | Overview, users, facilities, county coverage |
| **Clinical** | Patient registry, staff directory, UniHealth integration |
| **Security & Intelligence** | AI monitor, RBAC, audit log |
| **System** | Health, reports, settings |

---

## 3. Main tabs

### Overview

<p align="center">
  <img src="images/05-tab-overview.png" alt="Overview" width="720" />
</p>

**Figure 5 — Overview**  
System KPIs, quick actions, facility status, and live metrics.

---
### User Management

<p align="center">
  <img src="images/06-tab-user-management.png" alt="User Management" width="720" />
</p>

**Figure 6 — User Management**  
Create, edit, disable users; assign roles and facilities.

---
### Facilities

<p align="center">
  <img src="images/07-tab-facilities.png" alt="Facilities" width="720" />
</p>

**Figure 7 — Facilities**  
Facility registry, levels, latency, and connection status.

---
### County Coverage

<p align="center">
  <img src="images/08-tab-county-coverage.png" alt="County Coverage" width="720" />
</p>

**Figure 8 — County Coverage**  
Geographic coverage map and county-level stats.

---
## 4. Clinical registry tabs

### Patient Registry

<p align="center">
  <img src="images/09-tab-patient-registry.png" alt="Patient Registry" width="720" />
</p>

**Figure 9 — Patient Registry**  
Search and manage registered patients across facilities.

---
### Staff Directory

<p align="center">
  <img src="images/10-tab-staff-directory.png" alt="Staff Directory" width="720" />
</p>

**Figure 10 — Staff Directory**  
Clinical and operational staff roster.

---
### UniHealth Integration

<p align="center">
  <img src="images/11-tab-unihealth-integration.png" alt="UniHealth Integration" width="720" />
</p>

**Figure 11 — UniHealth Integration**  
Claims, biometric, and Practice 360 integration status.

---
## 5. Security & system tabs

### AI Monitor

<p align="center">
  <img src="images/12-tab-ai-monitor.png" alt="AI Monitor" width="720" />
</p>

**Figure 12 — AI Monitor**  
AI tier usage, anomaly counts, and WebSocket connection stats.

---
### RBAC & Roles

<p align="center">
  <img src="images/13-tab-rbac.png" alt="RBAC & Roles" width="720" />
</p>

**Figure 13 — RBAC & Roles**  
Role definitions and permission matrix.

---
### Audit Log

<p align="center">
  <img src="images/14-tab-audit-log.png" alt="Audit Log" width="720" />
</p>

**Figure 14 — Audit Log**  
System-wide audit events and export.

---
### System Health

<p align="center">
  <img src="images/15-tab-system-health.png" alt="System Health" width="720" />
</p>

**Figure 15 — System Health**  
Gateway, database, and service health checks.

---
### Reports

<p align="center">
  <img src="images/16-tab-reports.png" alt="Reports" width="720" />
</p>

**Figure 16 — Reports**  
Operational and compliance report generation.

---
### Settings

<p align="center">
  <img src="images/17-tab-settings.png" alt="Settings" width="720" />
</p>

**Figure 17 — Settings**  
Policy toggles, feature flags, and facility defaults.

---
## 6. Tips & troubleshooting

| Issue | Action |
| ----- | ------ |
| Cannot create user | Verify RBAC permissions and unique email |
| Facility shows offline | Check gateway and KMHFL sync job |
| Metrics stale | Prometheus/metrics endpoint on :8100 |

<strong>Audit everything:</strong> Admin actions are logged — document changes in change-management tickets.
