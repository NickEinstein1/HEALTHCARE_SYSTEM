# Nurse — Web Interface Manual

**Audience:** Registered nurses, enrolled nurses, and clinical officers on inpatient, outpatient, and emergency units.

**URL:** `/dashboard/nurse` (after sign-in as **Nurse / CO**)

See [Getting started](00-getting-started.md) for sign-in and MFA.

---

## Dashboard at a glance

The nurse dashboard centres on **ward operations**: who is on your panel, what vitals are due, medication administration, tasks, and handover. It shares the same shell as other production roles (sidebar, top bar, MOH stripe).

| Area | Purpose |
| ---- | ------- |
| Sidebar — **Ward** | Shift work: patients, triage, vitals, MAR, tasks, handover |
| Sidebar — **More** | Fluids, wound care, incidents, supplies |
| **AI Assist — Risk Score** | Rules-based early warning (NEWS2 pilot) for selected patients |

---

## Navigation reference

### Ward

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **Shift Overview** | Start-of-shift snapshot: occupancy, due vitals, escalations |
| **My Patients** | List of patients assigned to you this shift |
| **Patient Chart** | Full chart for the active patient (badge shows ID) |
| **Triage Queue** | Emergency / fast-track arrivals (red badge = waiting) |
| **Record Vitals** | Enter BP, HR, RR, temp, SpO₂, glucose, pain, AVPU |
| **MAR** | Medication Administration Record — due and given doses |
| **Tasks** | Nursing tasks and reminders |
| **Handover** | Structured end-of-shift report for the incoming team |

### More

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **Fluid Balance** | Intake/output charting |
| **Wound Care** | Dressing plans and wound assessments |
| **Incidents** | Report falls, near-misses, or safety events |
| **Supplies** | Request ward consumables |

---

## Common workflows

### 1. Shift start

1. Sign in as **Nurse / CO** → **Shift Overview**.
2. Review **My Patients** and red/amber badges (triage, vitals due).
3. Read overnight **Handover** notes if continuing care.
4. Glance at **AI Assist — Risk Score** for elevated patients (pilot — always verify at bedside).

### 2. Record vitals

1. Open **Record Vitals** (or from **Patient Chart**).
2. Select patient if not already active.
3. Enter measurements — reference ranges appear beside each field:

   | Vital | Typical range shown |
   | ----- | ------------------- |
   | Blood pressure | 90–140 / 60–90 mmHg |
   | Heart rate | 60–100 bpm |
   | Respiratory rate | 12–20 /min |
   | Temperature | 36.1–37.2 °C |
   | SpO₂ | ≥ 95% |
   | Random glucose | 3.9–7.8 mmol/L |
   | Pain | 0–10 |
   | AVPU | A–U |

4. Save — vitals feed the doctor chart and AI risk rules when API is online.

### 3. Administer medications (MAR)

1. Go to **MAR** for the active ward round.
2. Filter **due now** doses.
3. Scan patient ID where your facility requires barcode verification.
4. Mark **given**, **held**, or **refused** with reason.
5. Late or missed doses appear in task badges — document per protocol.

### 4. Triage (ED / OPD)

1. Open **Triage Queue**.
2. Take the next patient; capture chief complaint and initial vitals.
3. Assign acuity category per your facility triage scale.
4. Escalate to doctor queue when red flags appear.

### 5. End-of-shift handover

1. Open **Handover**.
2. Complete SBAR-style sections for each assigned patient.
3. Flag outstanding tasks, infusions, and pending labs.
4. Submit — incoming shift sees updates on **Shift Overview**.

### 6. Respond to NEWS2 escalation

When **AI Assist** or ward alerts show high risk:

1. Re-check vitals at bedside.
2. Notify covering doctor (document in chart / incident if delayed).
3. Follow local escalation protocol (oxygen, monitoring, rapid review).

---

## AI Assist — Risk Score (pilot)

The nurse dashboard uses the same **rules-based** panel as doctors. Scores update when vitals are saved and the gateway responds.

- **Pilot only** — not a substitute for bedside assessment.
- High scores should trigger **protocol**, not automatic treatment orders.
- Details: [ai-assist-scope.md](../ai-assist-scope.md).

---

## Coordination with other roles

| You do… | They see it in… |
| ------- | --------------- |
| Save vitals | Doctor **Patient Chart**, AI risk input |
| Complete MAR | Pharmacy audit, doctor prescription status |
| Triage entry | Doctor **Patient Queue** |
| Incident report | Admin **Audit Log** / safety workflows |

---

## Troubleshooting

| Issue | Action |
| ----- | ------ |
| Patient not in **My Patients** | Check assignment in ward board; ask charge nurse |
| Vitals won't save | Confirm API online; check required fields |
| MAR dose missing | Verify doctor order status in chart |
| Handover not visible | Ensure you submitted; refresh **Shift Overview** |

---

## Related manuals

- [Doctor manual](01-doctor.md) — orders and discharge
- [Patient manual](03-patient.md) — what patients see after you chart vitals
- [Administrator manual](04-administrator.md) — RBAC if you lack a menu item
