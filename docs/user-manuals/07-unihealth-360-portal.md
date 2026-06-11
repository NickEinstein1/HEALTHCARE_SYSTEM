# UniHealth 360 Portal — Web Interface Manual

**Audience:** Enterprise users, programme leads, and clinicians who need **module catalog** access beyond the six production role dashboards.

**URLs:**

| Entry | Path |
| ----- | ---- |
| Module catalog | `/portal` |
| Clinician EMR hub | `/modules/emr` |
| Any v2 module | `/modules/<slug>` |
| Legacy bookmark | `/dashboard/<slug>` redirects to `/modules/<slug>` for v2 slugs |

Production role dashboards (`/dashboard/doctor`, etc.) are documented in their respective manuals — this guide covers the **360 portal** and **module shell**.

See [Getting started](00-getting-started.md).

---

## Portal home (`/portal`)

The portal is a dark-themed **module launcher** for UniHealth 360 v4.0.

### Header

- Branding: **UniHealth 360** — National AI-Powered Healthcare Operating System.
- Status chips: systems live, module count, FHIR R5 / JWT / RBAC, feature flags (e.g. Maternity AI).

### Primary actions

| Button | Destination |
| ------ | ----------- |
| **Launch Clinician Portal** | `/modules/emr` |
| **Admin Console** | `/dashboard/admin` (production admin dashboard) |

### Module grid

Modules are grouped into three sections (same as sidebar registry):

#### Clinical

| Module | Path | Description |
| ------ | ---- | ----------- |
| EMR / EHR | `/modules/emr` | Electronic Medical Records hub |
| Maternity & NICU | `/modules/maternity` | Maternal and neonatal care |
| Laboratory | `/dashboard/lab` | Production lab dashboard |
| Radiology | `/modules/radiology` | Imaging and scans |
| Pharmacy | `/dashboard/pharmacy` | Production pharmacy dashboard |
| ICU & Emergency | `/modules/icu` | Critical care |
| Surgery | `/modules/surgery` | Surgical operations |
| Rehabilitation | `/modules/rehab` | Recovery programmes |
| Nutrition | `/modules/nutrition` | Dietetic services |

#### Operations

| Module | Path | Description |
| ------ | ---- | ----------- |
| Billing | `/modules/billing` | Financial management |
| Insurance | `/modules/insurance` | Claims and payers |
| Inventory | `/modules/inventory` | Stock management |
| Ambulance | `/modules/fleet` | Fleet / EMS |
| Mortuary | `/modules/mortuary` | Mortuary services |
| Telemedicine | `/modules/teleconsult` | Remote consultation |

#### Management

| Module | Path | Description |
| ------ | ---- | ----------- |
| Administration | `/modules/administration` | System management shell |
| HR & Payroll | `/modules/hr` | Personnel |
| AI Analytics | `/modules/analytics` | Data intelligence |
| Research | `/modules/research` | Clinical research |
| Patient Portal | `/dashboard/patient` | Production patient dashboard |

Additional slugs in the router (not all shown on portal cards): `nicu`, `telemedicine`, `superadmin`, `it` — reachable via `/modules/<slug>`.

---

## Module dashboard layout

Most v2 modules use a shared **DashboardLayout** (dark theme, emoji icons):

```text
┌──────────────┬────────────────────────────────────────────┐
│  Module nav  │  Module title + content area               │
│  (sections)  │                                            │
│              │  Feature panels / tables / placeholders    │
│  ← Portal    │                                            │
└──────────────┴────────────────────────────────────────────┘
```

- **Back to Portal** — returns to `/portal`.
- **EMR** (`/modules/emr`) has a richer dedicated UI (`EMRDashboard`) — treat it as the clinical hub when fully deployed.

### Production vs v2 modules

| Type | URL pattern | UI maturity |
| ---- | ----------- | ----------- |
| Production (6 roles) | `/dashboard/*` | Full feature dashboards |
| v2 clinical/ops | `/modules/*` | Module shell + staged features |
| Cross-links | Portal points lab/pharmacy/patient to production URLs | Intentional — avoid duplicate UIs |

---

## How to choose the right entry point

| Your job | Start here |
| -------- | ---------- |
| Daily ward doctor | `/sign-in` → Doctor → [01-doctor.md](01-doctor.md) |
| Daily ward nurse | `/sign-in` → Nurse → [02-nurse.md](02-nurse.md) |
| Lab bench / imaging | `/sign-in` → Laboratory → [05-laboratory.md](05-laboratory.md) |
| Dispensary | `/sign-in` → Pharmacy → [06-pharmacy.md](06-pharmacy.md) |
| Facility IT / admin | `/sign-in` → Administrator → [04-administrator.md](04-administrator.md) |
| Patient self-service | `/sign-in` → Patient → [03-patient.md](03-patient.md) |
| Programme demo / multi-module tour | `/portal` → pick module |

---

## Authentication notes

- The portal itself does not replace sign-in — deep links to `/dashboard/*` still expect role authentication.
- SSO / Keycloak pilots may gate `/modules/*` in production — follow facility IT instructions ([phase2-production.md](../phase2-production.md)).
- JWT and RBAC chips on the portal reflect target architecture; exact enforcement depends on deployment env.

---

## Bookmarking URLs

| Old link | New behaviour |
| -------- | ------------- |
| `/dashboard/emr` | Redirects to `/modules/emr` |
| `/dashboard/maternity` | Redirects to `/modules/maternity` |
| `/dashboard/doctor` | Unchanged — production doctor dashboard |

---

## Troubleshooting

| Issue | Action |
| ----- | ------ |
| Module shows placeholder content | v2 shell — feature still rolling out; use production dashboard if available |
| Portal 404 | Confirm frontend dev server or deployed SPA routes include `/portal` |
| Lab link leaves dark theme | Expected — lab uses production dashboard at `/dashboard/lab` |
| Unknown `/dashboard/foo` | Non-legacy slug may redirect to modules or fall back to admin |

---

## Related docs

- [frontend.md](../frontend.md) — routing architecture
- [UniHealth-EHR-Blueprint.md](../UniHealth-EHR-Blueprint.md) — programme vision
- Role manuals: [README](README.md)
