# Getting Started — UniHealth Web Interface

This guide applies to **all users** before you open a role-specific manual.

## What you need

| Requirement | Details |
| ----------- | ------- |
| Browser | Recent Chrome, Firefox, Safari, or Edge |
| Network | Access to your facility’s UniHealth gateway (staging: port **8100**) |
| Credentials | Issued by your facility HR/IT (staging pilot accounts in [runbook-staging.md](../runbook-staging.md)) |
| Screen | Desktop recommended for clinical workstations; tablet acceptable for ward use |

## Opening the application

1. Open your facility URL (development: `http://localhost:5173`).
2. Click **Sign in** (or go directly to `/sign-in`).
3. Alternatively, open **UniHealth 360** at `/portal` to browse module dashboards without the six-role sign-in flow.

## Sign-in flow (four steps)

### Step 1 — Select your role

**Scroll horizontally** through the role cards and tap the one that matches your job:

| Tile | Who uses it |
| ---- | ----------- |
| Doctor | Physicians and specialists |
| Nurse / CO | Nurses and clinical officers |
| Laboratory | Lab and diagnostic imaging staff |
| Pharmacy | Pharmacists and dispensing staff |
| Administrator | System and facility administrators |
| Patient | Personal health portal |

### Step 2 — Enter credentials

#### Staff (doctor, nurse, lab, pharmacy, admin)

- Professional registration or staff ID (role-specific field).
- Institutional email address.
- Password.
- Complete the captcha when shown.
- If your site uses **Keycloak OIDC**, you may also sign in via the institutional SSO button when enabled.

#### Patient

- National ID, passport, or other supported ID type.
- ID number.
- Four-digit **UniHealth PIN** (set at registration).
- Mobile number (`+254…` format).

### Step 3 — Multi-factor authentication (MFA)

| Method | Typical use |
| ------ | ----------- |
| Email OTP | Staff roles |
| SMS OTP | Patient portal |
| Biometric | Optional where supported |
| Practice 360 | Demo / pilot option |

Enter the code you receive. If MFA fails, wait and request a new code; after repeated failures, contact IT.

### Step 4 — Launch dashboard

Click **Launch Dashboard →**. You are taken to:

```text
/dashboard/<your-role>
```

Examples: `/dashboard/doctor`, `/dashboard/patient`.

## Registration (new patients)

1. Go to `/register`.
2. Complete the four-step wizard (identity, contact, UniHealth linkage, confirmation).
3. After registration, sign in as **Patient** with your ID and PIN.

Staff accounts are normally created by an **Administrator** — not self-service registration.

## Dashboard layout (production roles)

All six production dashboards share the same shell:

```text
┌──────────────┬────────────────────────────────────────────┐
│   Sidebar    │  Top bar (title · search · notifications)  │
│   (nav)      ├────────────────────────────────────────────┤
│              │  Main content (pages switch here)          │
│              │                                            │
│  MOH stripe  │                                            │
│  Sign out    │                                            │
└──────────────┴────────────────────────────────────────────┘
```

- **Sidebar** — click a menu item to change the page (no full page reload).
- **Top bar** — shows the current section name and quick actions.
- **Sign out** — returns you to `/sign-in` and clears your session context.

## Staging / pilot environment (developers and trainers)

```bash
./scripts/run_staging.sh
./scripts/setup_frontend_staging.sh
cd frontend/app && npm run dev
```

| Service | URL |
| ------- | --- |
| Web app | `http://localhost:5173` |
| API gateway | `http://localhost:8100` |
| API docs | `http://localhost:8100/docs` |

Example staging staff (Keycloak): `doctor` / `Changeme1!` — see [runbook-staging.md](../runbook-staging.md).

## When something does not work

| Symptom | What to try |
| ------- | ----------- |
| Blank data or “API offline” | Confirm gateway is running (`:8100`); refresh the page |
| Sign-in loops back to step 1 | Clear browser cache; verify email/ID format |
| MFA code never arrives | Check spam folder (email) or network (SMS); contact IT |
| Wrong dashboard after sign-in | You may have selected the wrong role tile — sign out and retry |
| 404 on a bookmarked URL | Production dashboards use `/dashboard/<role>`; v2 modules use `/modules/<name>` |

## Next steps

Open the manual for your role:

- [Doctor](01-doctor.md)
- [Nurse](02-nurse.md)
- [Patient](03-patient.md)
- [Administrator](04-administrator.md)
- [Laboratory](05-laboratory.md)
- [Pharmacy](06-pharmacy.md)
- [UniHealth 360 portal](07-unihealth-360-portal.md)
