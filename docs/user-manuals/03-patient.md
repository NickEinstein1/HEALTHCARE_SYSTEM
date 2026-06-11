# Patient — Web Interface Manual

**Audience:** Patients and carers using the **My Health** portal to view records, pay contributions, and manage privacy.

**URL:** `/dashboard/patient` (after sign-in as **Patient**)

New users: register at `/register`, then sign in with ID + **UniHealth PIN**. See [Getting started](00-getting-started.md).

---

## Dashboard at a glance

The patient portal is organised around **your health**, **payments**, **records**, and **privacy**. The home page shows quick links, notifications, and an **AI Health Insights** area (content may be static or live depending on deployment).

| Section | Topics |
| ------- | ------ |
| **My Health** | Dashboard, appointments, visits, results, medications, vitals |
| **Payments** | UniHealth Cover, contributions, bills, M-PESA / M-TIBA |
| **My Records** | Health record, documents, profile |
| **Privacy & Security** | KDPA 2019 consent controls |

---

## Navigation reference

### My Health

| Menu item | What you can do |
| --------- | --------------- |
| **My Dashboard** | Summary cards, notifications, shortcuts |
| **Appointments** | Upcoming visits; book or reschedule where enabled |
| **Visit History** | Past encounters and facilities |
| **Test Results** | Laboratory and diagnostic results |
| **Medications** | Active prescriptions; request refills |
| **Vitals & Trends** | Latest vitals and trend charts from your facilities |

### Payments

| Menu item | What you can do |
| --------- | --------------- |
| **My UniHealth Cover** | Benefits, member ID, claims status |
| **Contributions** | Monthly contribution history and due dates |
| **Bills & Invoices** | Statements; download invoices |
| **Make a Payment** | Pay via **M-PESA STK push**, **M-TIBA**, or other configured methods |

### My Records

| Menu item | What you can do |
| --------- | --------------- |
| **Health Records** | Longitudinal summary across linked facilities |
| **Documents** | Upload or view reports (PDF, images) |
| **My Profile** | Name, contact, emergency contact, PIN management |

### Privacy & Security

| Menu item | What you can do |
| --------- | --------------- |
| **Privacy & Consent** | KDPA toggles: data sharing, research, marketing, etc. |

---

## Common workflows

### 1. First login after registration

1. Complete `/register` (identity → contact → UniHealth linkage → confirm).
2. Sign in: choose **Patient**, enter ID type/number, **4-digit PIN**, mobile `+254…`.
3. Complete **SMS OTP** MFA.
4. On **My Dashboard**, link **UniHealth Cover** if not already connected.

### 2. View a new lab result

1. Check notifications on **My Dashboard** (e.g. “New lab result posted”).
2. Open **Test Results**.
3. Review value, reference range, and flags.
4. Contact your facility if you need clinical interpretation — the portal shows data, not medical advice.

### 3. Request a medication refill

1. Go to **Medications**.
2. Find the active prescription.
3. Tap **Request refill** — the request is sent to your pharmacy workflow.
4. Track status in medications or notifications.

### 4. Pay a contribution (M-PESA)

1. Open **Contributions** to see amount and due date.
2. Go to **Make a Payment**.
3. Select **M-PESA** and confirm STK push on your phone.
4. Payment confirmation appears in recent transactions.

### 5. Submit or track an insurance claim

1. **My UniHealth Cover** → view benefits and member details.
2. Use **New claim** when your deployment supports self-service claims.
3. Attach documents from **Documents** if required.

### 6. Manage privacy (KDPA 2019)

1. Open **Privacy & Consent**.
2. Review each consent category (treatment, sharing with facilities, research, etc.).
3. Toggle on/off — changes are logged for audit compliance.
4. Use **Data subject requests** options (access, correction, erasure) per Kenyan law and facility policy.

### 7. Message your care team

Where **Message care team** is available on the dashboard:

1. Type a short, non-urgent question.
2. Send — not for emergencies; call emergency services or your facility hotline for urgent care.

### 8. Update your profile

1. **My Profile** → edit contact details.
2. **Change PIN** or **Biometric re-enrol** when offered.
3. **Sign out all sessions** if you suspect unauthorised access.

---

## Notifications

The dashboard shows recent alerts, for example:

- New lab results
- Appointment reminders
- Contribution due dates

Click a notification to jump to the relevant page.

---

## AI Health Insights

The green **AI Health Insights** widget summarises trends (activity, vitals patterns). In pilot deployments this may be illustrative; live insights depend on API configuration. Insights are **informational** — discuss concerns with your clinician.

---

## Security tips

- Never share your **UniHealth PIN** or OTP codes.
- Use a private device for health and payment screens.
- Sign out when finished on shared computers.
- Report suspicious account activity via your facility contact centre.

---

## Troubleshooting

| Issue | Action |
| ----- | ------ |
| PIN forgotten | Use facility recovery process — not self-service reset in all deployments |
| No results visible | Facility may not have shared records yet; check **Privacy & Consent** |
| M-PESA failed | Confirm phone number on profile; retry; check M-PESA balance |
| Cannot upload document | Check file size/type; try again on stable network |

---

## Related manuals

- [Doctor](01-doctor.md) / [Nurse](02-nurse.md) — clinical source of your vitals and notes
- [Pharmacy](06-pharmacy.md) — refill fulfilment
- [Laboratory](05-laboratory.md) — how results are released
