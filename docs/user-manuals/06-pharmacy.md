# Pharmacy — Web Interface Manual

**Audience:** Pharmacists, pharmaceutical technologists, and dispensary staff.

**URL:** `/dashboard/pharmacy` (after sign-in as **Pharmacy**)

See [Getting started](00-getting-started.md). Prescriptions originate from [Doctor manual](01-doctor.md); patients request refills via [Patient manual](03-patient.md).

---

## Dashboard at a glance

The pharmacy dashboard manages **dispensing**, **inventory**, **clinical checks**, and **compliance**. The prescription queue badge shows pending orders requiring verification or pickup.

| Area | Purpose |
| ---- | ------- |
| **Dispensing** | Queue, verification, patient lookup, compounding |
| **Inventory** | Stock, reorders, ModelCover claims, vaccinations |
| **Clinical** | Interactions, pharmacist interventions |
| **Security & Compliance** | Audit trail, system health |

---

## Navigation reference

### Dispensing

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **Overview** | Shift metrics, alerts, quick actions |
| **Prescription Queue** | Incoming Rx from doctors and refill requests |
| **Verify & Approve** | Clinical check, allergies, interactions |
| **Patient Lookup** | Search by ID, name, or member number |
| **Compounding** | Non-standard preparations and IV admixture |

### Inventory

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **Stock Levels** | On-hand quantity, expiry, low-stock badges |
| **Reorder List** | Generate PO suggestions |
| **ModelCover Claims** | Insurance medicine benefit claims |
| **Vaccinations** | Cold-chain vaccines and immunisation stock |

### Clinical

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **Drug Interactions** | Severity-ranked interaction review |
| **Pharmacist Notes** | Document interventions communicated to prescribers |

### Security & Compliance

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **Audit Trail** | Dispense events, controlled drug log |
| **System Health** | Gateway and inventory interface status |

---

## Common workflows

### 1. Process the prescription queue

1. Sign in as **Pharmacy** → **Prescription Queue** (red badge = waiting).
2. Sort by priority (stat, inpatient, outpatient).
3. Open first Rx → **Verify & Approve**.
4. Check allergies, renal/hepatic flags, interaction warnings.
5. Approve, modify (with prescriber contact), or reject with reason.

### 2. Dispense to patient

1. After approval, label and package medication.
2. **Patient Lookup** — confirm identity (ID + name).
3. Counsel on dose and storage; record **given** or **collected**.
4. Controlled substances require witness per local law.

### 3. Handle refill request (patient portal)

1. Refill appears in **Prescription Queue** with patient origin flag.
2. Verify remaining repeats and last fill date.
3. Approve refill or redirect patient to clinician if review needed.

### 4. Clinical intervention

1. **Drug Interactions** flags serious combination.
2. Contact prescriber; document in **Pharmacist Notes**.
3. Hold dispense until amended order received.

### 5. Stock and reorder

1. **Stock Levels** — address amber low-stock items.
2. **Reorder List** → submit to procurement.
3. Receive goods and update stock (negative adjustments audited).

### 6. Vaccination session

1. **Vaccinations** — select vaccine and batch.
2. Record administration linked to patient record.
3. Patient may download certificate from portal when enabled.

### 7. ModelCover claim

1. **ModelCover Claims** — attach dispense to benefit line.
2. Submit to UniHealth; track approval like doctor claims workflow.

---

## Safety checklist (every dispense)

| Step | Confirm |
| ---- | ------- |
| Right patient | Two identifiers |
| Right drug | Generic and brand match order |
| Right dose | Especially paediatric and renal |
| Right route | Oral vs IV vs topical |
| Right time | MAR alignment for inpatients |

---

## Troubleshooting

| Issue | Action |
| ----- | ------ |
| Rx missing from queue | Order not signed by doctor; check API |
| Interaction override needed | Prescriber must amend; do not silently override |
| Stock shows available but shelf empty | Cycle count; update **Stock Levels** |
| Patient refill denied | No repeats left — notify patient to book visit |

---

## Related manuals

- [Doctor manual](01-doctor.md) — prescribing
- [Nurse manual](02-nurse.md) — MAR administration
- [Administrator manual](04-administrator.md) — pharmacy user accounts
