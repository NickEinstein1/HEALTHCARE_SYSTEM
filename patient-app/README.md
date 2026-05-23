# UniHealth Patient App

Mobile patient portal for **UniHealth** — same API, design language, and navigation structure as the web patient dashboard (`frontend/app` → `PatientDashboard`).

## Patient 360 sections (MyChart-style + web parity)

| Area | Mobile tab | Screens |
| --- | --- | --- |
| Dashboard | Home | Hero, cover card, AI insights, appts, meds, results |
| Clinical | Health | Hub → Appointments, Visits, Results, Medications, Vitals, Messages |
| Payments | Wallet | Hub → Cover, Contributions, Bills, Pay (M-PESA / M-TIBA) |
| Messaging | Messages | Care team inbox + compose |
| Account | Menu | Hub → Profile, Records, Documents, Consent |

Global **search** and **notifications** (top bar) jump to any section — same items as web `PatientDashboard`.

## Auth flow (matches web patient portal)

| Step | Web route | Mobile screen |
| --- | --- | --- |
| Landing | `/` | `LandingScreen` |
| Sign in | `/sign-in` (patient) | `PatientSignInScreen` → `MfaScreen` → `AuthSuccessScreen` |
| Register | `/create-account` (patient) | `RegisterScreen` → `MfaScreen` → success |

Sign-out returns to the **landing page**, not a bare sign-in form. Demo launch uses patient **P001** after OTP (same as staging stub).

## Design parity with web

| Web | Mobile |
| --- | --- |
| `unihealth.css` tokens (green `#1a8a4a`, serif titles) | `src/theme/colors.ts` |
| Dark landing + `signin.css` | `src/theme/authTheme.ts`, `AuthShell` |
| Sora / DM Serif / JetBrains Mono | `@expo-google-fonts/*` |
| Green hero + quick actions | `HeroCard`, `QuickActions` |
| Panels, tags, notices | `Panel`, `Tag` |
| FHIR summary, meds, observations | `src/lib/api.ts` |
| Appointments + consent | `AppointmentsScreen`, `ConsentScreen` |

The web **3D vitals figure** (`BodyVitalsFigure`) is not ported to native yet; vitals use the same FHIR observation cards as the web fallback grid.

## Prerequisites

- Node 18+
- [Expo CLI](https://docs.expo.dev/) (via `npx expo`)
- Staging API: `./scripts/run_staging.sh` (gateway **:8100**)

## Setup

```bash
cd patient-app
cp .env.example .env
npm install
npx expo start
```

**Expo Go:** This project targets **Expo SDK 54** (`expo@~54.0.0`). Install [Expo Go](https://expo.dev/go) from the App Store / Play Store (SDK 54) — older Expo Go builds cannot open this app.

**Dependencies:** SDK 54 packages are pinned together in `package.json` (React **19.1**, React Native **0.81**). Do **not** run `npm audit fix --force` without checking compatibility. Security patches for transitive dev tools use `overrides` in `package.json`.

**Upgrade SDK** (when Expo releases a new minor):

```bash
npx expo install expo@^54.0.0 --fix
npm run doctor
```

Press `i` (iOS simulator), `a` (Android), `w` (web browser), or scan the QR code with Expo Go.

### Run in the laptop browser (web)

```bash
npm run web
# or: npx expo start --web
```

Opens at **http://localhost:8081** (or the next free port). Requires `react-dom` and `react-native-web` (installed via `npx expo install react-dom react-native-web`).

If you see “Port 8081 is running in another window”, stop the other Expo process (Ctrl+C in that terminal) or accept the alternate port.

### Environment (required)

Expo reads **`patient-app/.env`** on start (`env: load .env` in the terminal). Copy the template first:

```bash
cp .env.example .env
```

| Variable | Purpose |
| -------- | ------- |
| `EXPO_PUBLIC_API_BASE_URL` | Gateway URL (staging `:8100`) |
| `EXPO_PUBLIC_DEFAULT_PATIENT_ID` | Demo patient (`P001`) |
| `EXPO_PUBLIC_OIDC_ENABLED` | Optional OIDC (`true` / unset) |
| `EXPO_PUBLIC_OIDC_ISSUER` | Keycloak realm URL |
| `EXPO_PUBLIC_OIDC_CLIENT_ID` | OIDC client id |

Values flow: **`.env` → `app.config.ts` → `Constants.expoConfig.extra` → `src/lib/config.ts`**. Restart Metro after editing `.env`.

| Device | `EXPO_PUBLIC_API_BASE_URL` |
| ------ | -------------------------- |
| iOS simulator / same machine | `http://localhost:8100` |
| Android emulator | `http://10.0.2.2:8100` |
| Physical phone on LAN | `http://<your-laptop-ip>:8100` |

## Sign-in (demo)

1. Enter patient ID **`P001`** (or tap **Use demo patient P001**).
2. Any 4-digit PIN + mobile number (matches web stub patient sign-in).
3. Data loads from the same FHIR routes as the web portal.

Enable OIDC with `EXPO_PUBLIC_OIDC_ENABLED=true` when Keycloak is configured.

## Project layout

```
patient-app/
  App.tsx                 # Fonts, auth gate, navigation
  src/
    theme/                # Colors & typography (sync with unihealth.css)
    lib/                  # API, auth, config
    components/           # Hero, Panel, header, buttons
    screens/              # Home, appointments, meds, vitals, consent…
    navigation/           # Bottom tabs + stacks (mirrors web sidebar)
```

## Docs

- MVP scope: [docs/phase2-patient-app.md](../docs/phase2-patient-app.md)
- Staging runbook: [docs/runbook-staging.md](../docs/runbook-staging.md)
