# Administrator — Web Interface Manual

**Audience:** Facility administrators, ICT officers, and national programme operators managing users, facilities, integrations, and system health.

**URL:** `/dashboard/admin` (after sign-in as **Administrator**)

See [Getting started](00-getting-started.md) for sign-in. For enterprise module stubs, also see [UniHealth 360 portal](07-unihealth-360-portal.md).

---

## Dashboard at a glance

The administrator dashboard spans **user and facility governance**, **clinical registries**, **security**, and **platform health**. The overview page shows live-style activity feed items (registrations, claims, escalations, dedup events) when connected to the API.

| Area | Purpose |
| ---- | ------- |
| **Main** | Overview, users, facilities, county coverage |
| **Clinical** | Patient registry, UniHealth integration |
| **Security & Intelligence** | AI monitor, RBAC, audit log |
| **System** | Health checks, reports, settings |

---

## Navigation reference

### Main

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **Overview** | KPIs, activity stream, quick admin actions |
| **User Management** | Create, disable, reset staff and patient portal accounts |
| **Facilities** | Register hospitals, clinics, labs; KMHFL codes where used |
| **County Coverage** | Map rollout and facility counts by county |

### Clinical

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **Patient Registry** | Search master patient index; resolve duplicates |
| **UniHealth Integration** | Cover products, webhooks, sync status |

### Security & Intelligence

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **AI Monitor** | CDS pilot usage, blocked requests, model tier status |
| **RBAC & Roles** | Map roles to permissions (doctor, nurse, lab, etc.) |
| **Audit Log** | Immutable trail of sign-ins, chart access, config changes |

### System

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **System Health** | Gateway, Kafka, Redis, Postgres connectivity |
| **Reports** | Operational and compliance exports |
| **Settings** | Facility branding, session timeout, feature flags |

---

## Common workflows

### 1. Onboard a new staff member

1. **User Management** → **Add user**.
2. Enter name, email, role (doctor, nurse, lab, pharmacy, admin).
3. Assign **facility** and **RBAC** group.
4. Send invitation or set temporary password per policy.
5. Confirm user appears in list; ask them to complete MFA on first login.

### 2. Register a facility

1. **Facilities** → **New facility**.
2. Enter legal name, level, county, MOH identifiers, contact.
3. Link to **County Coverage** map for national dashboards.
4. Enable modules the facility is licensed for (lab, pharmacy, cover).

### 3. Resolve duplicate patients

1. **Patient Registry** → search by ID or name.
2. Open duplicate candidates flagged by the system.
3. Merge or mark “not duplicate” with reason — merges are audited.
4. Notify registration desk of golden record ID.

### 4. Review security audit

1. **Audit Log** — filter by user, action, date range.
2. Export CSV for compliance reviews (KDPA, MOH).
3. Investigate anomalies (after-hours bulk export, failed auth spikes).

### 5. Monitor AI / CDS pilot

1. **AI Monitor** — view request volume, latency, rule hits.
2. Confirm disclaimer banners are enabled for clinical roles.
3. Escalate to technical team if `/ai/risk-score` error rate rises.
4. Reference [ai-assist-scope.md](../ai-assist-scope.md) for allowed use.

### 6. Check platform health

1. **System Health** — green/amber/red service tiles.
2. If gateway down, clinical dashboards may show offline/demo mode.
3. Use [runbook-staging.md](../runbook-staging.md) or production runbooks for restart steps.

### 7. Configure UniHealth Cover integration

1. **UniHealth Integration** — API keys, callback URLs, product codes.
2. Test claim round-trip with a sandbox member.
3. Monitor failed sync badge on overview.

---

## RBAC overview

| Role (typical) | Access |
| -------------- | ------ |
| Doctor / Nurse | Clinical dashboards only |
| Lab / Pharmacy | Department dashboards |
| Patient | Own record via patient portal |
| Administrator | Full admin console |
| Super-admin (v2) | `/modules/superadmin` when deployed |

Fine-grained permissions are edited under **RBAC & Roles**. Principle of least privilege: grant only menus required for the job function.

---

## Kenya compliance notes

- **KDPA 2019** — patient consent changes originate in the patient portal; admin audit proves who accessed PII.
- **MOH reporting** — county and facility tiles support national visibility programmes.
- **KMHFL** — use standard facility codes where integrated for interoperability.

---

## Troubleshooting

| Issue | Action |
| ----- | ------ |
| User cannot sign in | Check account status, role tile vs RBAC, Keycloak lockout |
| Facility not on map | Verify county assignment and geocode |
| Audit export empty | Widen date filter; confirm gateway logging |
| AI Monitor blank | Enable AI routes on gateway; see [ehr-api.md](../ehr-api.md) |

---

## Related manuals

- All role manuals under [user-manuals/](README.md)
- [UniHealth 360 portal](07-unihealth-360-portal.md) — `/modules/administration`, `/modules/superadmin`
- [phase2-production.md](../phase2-production.md) — TLS and OIDC for production
