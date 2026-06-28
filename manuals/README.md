# Manuals — UniHealth Healthcare System

Comprehensive role-based user guides with **annotated, aligned screenshots** for every sign-in step and dashboard tab.

## Quick start

| Manual | Description |
| ------ | ----------- |
| **[Comprehensive (all roles)](comprehensive-dashboard-manual.html)** | **One combined manual** — Doctor, Nurse, Patient, Admin, Lab, Pharmacy |
| [Index](index.html) | Links to comprehensive + individual manuals |

### Individual role manuals

| Role | Open |
| ---- | ---- |
| Doctor | [doctor/doctor-dashboard-manual.html](doctor/doctor-dashboard-manual.html) |
| Nurse | [nurse/nurse-dashboard-manual.html](nurse/nurse-dashboard-manual.html) |
| Patient | [patient/patient-dashboard-manual.html](patient/patient-dashboard-manual.html) |
| Administrator | [admin/admin-dashboard-manual.html](admin/admin-dashboard-manual.html) |
| Laboratory | [lab/lab-dashboard-manual.html](lab/lab-dashboard-manual.html) |
| Pharmacy | [pharmacy/pharmacy-dashboard-manual.html](pharmacy/pharmacy-dashboard-manual.html) |

## Open the comprehensive manual

```bash
open manuals/comprehensive-dashboard-manual.html
```

Or serve locally:

```bash
cd manuals && python3 -m http.server 8080
# → http://localhost:8080/comprehensive-dashboard-manual.html
```

**Save as PDF:** Browser → Print → Save as PDF.

### Word document (.docx)

The comprehensive manual is also available as a formatted Word file with centred screenshots and aligned captions:

- **[UniHealth-Comprehensive-Dashboard-Manual.docx](UniHealth-Comprehensive-Dashboard-Manual.docx)**

### Innovation Metrics Canvas (PDF)

One-page landscape canvas with platform KPIs, AI innovation metrics, transformation outcomes, and compliance:

- **[Innovation-Metrics-Canvas.pdf](Innovation-Metrics-Canvas.pdf)** · [HTML source](innovation-metrics-canvas.html)

```bash
node scripts/build_innovation_metrics_canvas_pdf.mjs
```

## Regenerate

```bash
node scripts/generate_role_manuals.mjs          # individual + comprehensive HTML/MD
node scripts/capture_all_manual_screenshots.mjs   # refresh all screenshots
```

Config and captions: [`scripts/manual_roles.mjs`](../scripts/manual_roles.mjs)

## Related docs

Legacy combined manuals: [`docs/user-manuals/`](../docs/user-manuals/README.md)
