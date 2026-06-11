# Doctor — Web Interface Manual

**Audience:** Physicians, specialists, and senior clinicians using the production doctor dashboard.

**URL:** `/dashboard/doctor` (after sign-in as **Doctor**)

See [Getting started](00-getting-started.md) for sign-in and MFA.

---

## Dashboard at a glance

The doctor dashboard is your daily command centre: ward status, patient queue, chart review, orders, prescriptions, and UniHealth claims. Data refreshes from the API gateway when staging or production is online.

| Area | Purpose |
| ---- | ------- |
| Sidebar — **Clinical** | Patient-facing work: overview, chart, queue, ward, labs, Rx, imaging |
| Sidebar — **Workflow** | Documentation, referrals, procedures, insurance, schedule |
| Top bar | Current page title, patient context, search, notifications |
| **AI Assist — Risk Score** | Rules-based NEWS2 / vitals pilot panel (see below) |

---

## Navigation reference

### Clinical

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **Today's Overview** | See shift summary, KPIs, alerts, and quick actions |
| **Patient Chart** | Open the longitudinal record for the active patient |
| **Patient Queue** | Work through waiting outpatients or consult requests (badge shows queue depth) |
| **Patient Workup** | Structured assessment: history, exam, differentials, plan |
| **Ward / Beds** | Inpatient list, bed occupancy, acuity flags |
| **Lab Orders & Results** | Order tests, review results, acknowledge critical values |
| **Prescriptions** | Create and manage medication orders |
| **Imaging & Reports** | Request studies and read radiology reports |

### Workflow

| Menu item | Use when you need to… |
| --------- | --------------------- |
| **Clinical Notes** | Document progress, admission, discharge, or procedure notes |
| **Referrals** | Send or track inter-facility / specialty referrals |
| **Procedures** | Log planned or completed procedures (consent workflow) |
| **UniHealth Claims** | Initiate or review insurance / cover claims |
| **My Schedule** | View clinic blocks and theatre slots |

---

## Common workflows

### 1. Start your shift

1. Sign in as **Doctor** and launch the dashboard.
2. Open **Today's Overview** — review KPIs, escalations, and ward badges.
3. Check **Patient Queue** for new arrivals; badge counts update when the API is live.
4. Scan the **AI Assist — Risk Score** panel for patients with elevated NEWS2 (pilot only — confirm clinically).

### 2. See the next patient (outpatient)

1. Go to **Patient Queue**.
2. Select the next patient row or use **Call next** (action buttons log to the audit trail via the API).
3. Switch to **Patient Workup** or **Patient Chart** for history and vitals.
4. Document in **Clinical Notes** when the encounter is complete.

### 3. Review an inpatient

1. Open **Ward / Beds** and filter by your ward if available.
2. Click the patient bed card → **Patient Chart**.
3. Review **Lab Orders & Results** and **Imaging & Reports** for pending items.
4. Update the plan in **Clinical Notes**; adjust **Prescriptions** as needed.

### 4. Order laboratory tests

1. From **Patient Chart** or **Lab Orders & Results**, choose **New lab order**.
2. Select test panel or individual tests (facility catalogue).
3. Set priority (routine / urgent) and clinical indication.
4. Submit — the order appears on the **Laboratory** dashboard queue for lab staff.

### 5. Prescribe medication

1. Open **Prescriptions** for the active patient.
2. Add drug, dose, route, frequency, and duration.
3. Check interaction warnings when shown.
4. Sign / authorise — pharmacy receives the order in **Prescription Queue**.

### 6. Discharge a patient

1. From **Ward / Beds** or **Patient Chart**, open **Discharge**.
2. Complete discharge summary and follow-up instructions.
3. Confirm bed release — ward and nursing views update on next refresh.

### 7. Submit a UniHealth claim

1. Go to **UniHealth Claims**.
2. Link encounter, diagnoses, and line items.
3. Attach supporting documentation if required.
4. Submit — track status in the claims list; patients may see updates in **My UniHealth Cover**.

---

## AI Assist — Risk Score (pilot)

On supported pages, a purple **AI Assist** panel shows a **rules-based** risk score derived from vitals and labs (NEWS2-style logic). It calls `POST /ai/risk-score` when the gateway is available.

| Do | Don't |
| -- | ----- |
| Use it as a **triage hint** alongside examination | Treat the score as a standalone diagnosis |
| Escalate per local protocol when score is high | Override clinical judgement without documentation |
| Note the **pilot** disclaimer on the panel | Assume ML validation where only rules are deployed |

Full technical scope: [ai-assist-scope.md](../ai-assist-scope.md).

---

## Notifications and audit

- Toast messages confirm actions (orders placed, notes saved).
- Sensitive actions are logged server-side (`uiAction` / clinical APIs).
- If you see **offline** toasts, the UI may still show demo data — retry when the gateway is up.

---

## Tips

- Keep one **active patient** selected — the chart badge in the sidebar shows the current ID.
- Use **My Schedule** before theatre days to confirm blocks.
- For enterprise modules (EMR hub, ICU, surgery), open [UniHealth 360 portal](07-unihealth-360-portal.md) at `/portal`.

---

## Troubleshooting

| Issue | Action |
| ----- | ------ |
| Queue empty but patients waiting | Refresh; verify API at `:8100`; check facility filter |
| Cannot sign prescription | Confirm your registration ID on sign-in step 2 |
| AI panel shows “unavailable” | Gateway or `/ai/risk-score` offline — use manual NEWS2 |
| Wrong patient in chart | Re-select from queue or ward list before ordering |

---

## Related manuals

- [Nurse manual](02-nurse.md) — vitals, MAR, handover
- [Laboratory manual](05-laboratory.md) — result turnaround
- [Pharmacy manual](06-pharmacy.md) — dispensing queue
- [Administrator manual](04-administrator.md) — user provisioning
