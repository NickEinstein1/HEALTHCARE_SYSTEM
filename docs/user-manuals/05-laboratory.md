# Laboratory — Web Interface Manual

**Audience:** Medical laboratory scientists, phlebotomists, pathology staff, and diagnostic imaging technicians.

**URL:** `/dashboard/lab` (after sign-in as **Laboratory**)

See [Getting started](00-getting-started.md). Doctors place orders via [Doctor manual](01-doctor.md); patients view results in [Patient manual](03-patient.md).

---

## Dashboard at a glance

The laboratory dashboard covers **specimen workflow**, **analyser queues**, **specialised labs**, **imaging modalities**, and **compliance**. Badge counts on the sidebar highlight backlog (collections, test queue, imaging studies).

| Area | Purpose |
| ---- | ------- |
| **Lab Workflow** | Collection → queue → results → QC |
| **Diagnostic Imaging** | X-ray, MRI/CT, ultrasound, mammography, nuclear |
| **Specialised Labs** | Pathology, microbiology, blood bank, molecular |
| **Inventory & Compliance** | Reagents, reports, audit, system health |

---

## Navigation reference

### Lab Workflow

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **Overview** | Department KPIs and shift priorities |
| **Sample Collection** | Phlebotomy list; label and collect specimens |
| **Test Queue** | Worklist for analysers and manual benches |
| **Results Entry** | Enter, validate, and authorise results |
| **Quality Control** | QC runs, Westgard rules, corrective action |

### Diagnostic Imaging

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **All Imaging** | Unified imaging worklist |
| **X-Ray** | Radiography studies |
| **MRI / CT** | Cross-sectional imaging queue |
| **Ultrasound** | Point-of-care and departmental US |
| **Mammography** | Screening and diagnostic mammo |
| **Nuclear Medicine** | PET/SPECT and related studies |

### Specialised Labs

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **Pathology** | Histology / cytology specimens |
| **Microbiology** | Cultures, sensitivities, infection control |
| **Blood Bank** | Cross-match, issue, stock (critical badge) |
| **Molecular Dx** | PCR and molecular panels |

### Inventory & Compliance

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **Reagents & Supplies** | Stock levels and expiry alerts |
| **Reports** | TAT, workload, accreditation metrics |
| **Audit Trail** | Who released results and when |
| **System Health** | LIS ↔ gateway connectivity |

---

## Common workflows

### 1. Morning setup

1. Sign in as **Laboratory** → **Overview**.
2. Check **Sample Collection** and **Test Queue** badges.
3. Review **Quality Control** for failed runs overnight.
4. Confirm **Reagents** amber alerts for low stock.

### 2. Collect a specimen

1. **Sample Collection** — sort by ward or priority.
2. Verify patient ID at bedside (two identifiers).
3. Print barcoded label; collect into correct container.
4. Mark **collected** — order moves to **Test Queue**.

### 3. Process and result a test

1. **Test Queue** — accept specimen on instrument or bench.
2. Enter raw results in **Results Entry** (or receive from analyser interface).
3. Apply delta checks and critical limits.
4. **Authorise** — result publishes to doctor chart and patient portal when configured.

### 4. Critical result notification

1. When a critical flag appears, follow **read-back** protocol.
2. Document notification time and recipient in the result record.
3. Doctor and nurse dashboards refresh on next API poll.

### 5. Imaging study

1. From modality menu (e.g. **X-Ray**), open scheduled study.
2. Complete acquisition; attach PACS instance if integrated.
3. Radiologist report uploaded under **Results Entry** / imaging report type.

### 6. Blood bank issue

1. **Blood Bank** — pending cross-matches (red badge).
2. Complete serology; assign unit number.
3. Issue with dual verification; audit trail records issue event.

---

## Integration points

| Source | Destination |
| ------ | ----------- |
| Doctor **Lab Orders** | **Test Queue** |
| **Results Entry** (authorised) | Doctor **Lab Orders & Results**, Patient **Test Results** |
| Duplicate order engine | Admin activity feed (“duplicate blocked”) |

---

## Quality and safety

- Never authorise results without QC acceptance for that analyte/run.
- Maintain cold chain for samples requiring refrigeration.
- Escalate instrument faults via **System Health** and local biomedical engineering.

---

## Troubleshooting

| Issue | Action |
| ----- | ------ |
| Order not in queue | Confirm collection status; check gateway sync |
| Cannot authorise | Verify your sign-off permission in RBAC |
| Patient sees old result only | Authorise step incomplete; check patient consent flags |
| Imaging worklist empty | Filter by date/modality; confirm scheduling feed |

---

## Related manuals

- [Doctor manual](01-doctor.md) — ordering
- [Administrator manual](04-administrator.md) — facility lab catalogue
- [UniHealth 360 portal](07-unihealth-360-portal.md) — `/modules/radiology` for extended imaging module UI
