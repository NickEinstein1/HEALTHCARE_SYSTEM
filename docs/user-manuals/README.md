# UniHealth Web Interface — User Manuals

End-user guides for the **React web application** (`frontend/app`). These manuals describe what each role sees in the browser and how to complete common tasks. They do not replace clinical policy, MOH directives, or your facility’s SOPs.

## Combined manual (recommended)

| Format | File | Size / notes |
| ------ | ---- | ------------ |
| **Full PDF** | [UniHealth-Web-User-Manual.pdf](UniHealth-Web-User-Manual.pdf) | Branded cover + all sections (auto-generated) |
| **Cover PDF** | [UniHealth-Web-User-Manual-Cover.pdf](UniHealth-Web-User-Manual-Cover.pdf) | Standalone A4 cover — UniHealth + KNH pilot facility logos |
| **HTML** | [UniHealth-Web-User-Manual.html](UniHealth-Web-User-Manual.html) | Same content; optimized PNG figures (~2.7 MB total) |
| **Email images** | [images/email/](images/email/) | WebP bundle ~432 KB; JPEG fallback ~678 KB |
| **Email zip** | [UniHealth-Manual-Email-Images.zip](UniHealth-Manual-Email-Images.zip) | WebP figures for attachment |

### Word documents (.docx)

| File | Purpose |
| ---- | ------- |
| [docx/UniHealth-Web-User-Manual-Combined.docx](docx/UniHealth-Web-User-Manual-Combined.docx) | **Combined manual** — all roles + optimized screenshots |
| [docx/00-Getting-Started.docx](docx/00-Getting-Started.docx) | Getting started |
| [docx/01-Doctor-Manual.docx](docx/01-Doctor-Manual.docx) | Doctor |
| [docx/02-Nurse-Manual.docx](docx/02-Nurse-Manual.docx) | Nurse |
| [docx/03-Patient-Manual.docx](docx/03-Patient-Manual.docx) | Patient |
| [docx/04-Administrator-Manual.docx](docx/04-Administrator-Manual.docx) | Administrator |
| [docx/05-Laboratory-Manual.docx](docx/05-Laboratory-Manual.docx) | Laboratory |
| [docx/06-Pharmacy-Manual.docx](docx/06-Pharmacy-Manual.docx) | Pharmacy |
| [docx/07-UniHealth-360-Portal.docx](docx/07-UniHealth-360-Portal.docx) | UniHealth 360 portal |

### Regenerate assets

```bash
# 1. Screenshots (dev server on :5173)
node scripts/capture_manual_screenshots.mjs

# 2. Compress for email + manual
node scripts/optimize_manual_images.mjs

# 3. Branded PDFs
node scripts/build_manual_pdf.mjs

# 4. Word (.docx) manuals
node scripts/build_manual_docx.mjs
```

Full-resolution originals are archived under `images/archive/full-res/` after optimization.

## Who should read which manual

| Role | Manual | Sign-in tile | Dashboard URL |
| ---- | ------ | ------------ | ------------- |
| Doctor / physician / specialist | [Doctor manual](01-doctor.md) | Doctor | `/dashboard/doctor` |
| Nurse / clinical officer | [Nurse manual](02-nurse.md) | Nurse / CO | `/dashboard/nurse` |
| Patient | [Patient manual](03-patient.md) | Patient | `/dashboard/patient` |
| System / facility administrator | [Administrator manual](04-administrator.md) | Administrator | `/dashboard/admin` |
| Laboratory & imaging staff | [Laboratory manual](05-laboratory.md) | Laboratory | `/dashboard/lab` |
| Pharmacist / dispensing staff | [Pharmacy manual](06-pharmacy.md) | Pharmacy | `/dashboard/pharmacy` |
| Multi-module / enterprise users | [UniHealth 360 portal](07-unihealth-360-portal.md) | — (use `/portal`) | `/modules/*` |

Everyone should start with **[Getting started](00-getting-started.md)** for sign-in, MFA, and environment setup.

## Quick access URLs (development / staging)

| Page | URL |
| ---- | --- |
| Marketing home | `http://localhost:5173/` |
| Sign in | `http://localhost:5173/sign-in` |
| Register (demo) | `http://localhost:5173/register` |
| UniHealth 360 module catalog | `http://localhost:5173/portal` |
| API gateway (staging) | `http://localhost:8100` |

Production URLs will be provided by your facility IT team.

## Shared concepts (all roles)

- **Sidebar** — primary navigation; sections group related tasks.
- **Top bar** — page title, breadcrumbs, search (where enabled), notifications, and status.
- **Toasts** — short confirmation messages after actions (auto-dismiss after a few seconds).
- **Modals** — pop-up forms for create/edit workflows (admit patient, new order, etc.).
- **Live data** — many panels refresh automatically every few seconds when the API gateway is running.
- **Offline mode** — if the gateway is down, demo/static content may still appear; actions that need the API will show an error toast.

## AI Assist (pilot)

Doctor and nurse dashboards include **rules-based clinical decision support** (NEWS2, vitals/lab thresholds). Patient dashboards may show **health insights** in static or live form depending on configuration. This is a **pilot**, not diagnostic AI — clinical judgement always applies. See [AI scope](../ai-assist-scope.md) for technical detail.

## Privacy (Kenya)

Patient-facing screens reference **KDPA 2019** (Kenya Data Protection Act). Administrators maintain audit trails aligned with MOH and facility policy. Do not share credentials or patient identifiers outside authorised workflows.

## Related technical docs

| Doc | Purpose |
| --- | ------- |
| [getting-started.md](../getting-started.md) | Developer laptop setup |
| [runbook-staging.md](../runbook-staging.md) | Staging stack and test accounts |
| [frontend.md](../frontend.md) | SPA architecture and proxy |
| [ai-assist-scope.md](../ai-assist-scope.md) | AI pilot boundaries |

## Document history

| Version | Date | Notes |
| ------- | ---- | ----- |
| 1.0 | 2026 | Initial web interface manuals for six production roles + UniHealth 360 portal |
| 1.1 | Jun 2026 | Combined HTML manual with UI screenshots (`images/`) |
