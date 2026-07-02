# UniHealth 360 — Complete Build & Play Store Submission Guide

## I. Project Structure

```
unihealth-360/
├── unihealth-provider/          # React Native app for healthcare providers
│   ├── app/
│   │   ├── (auth)/login.tsx
│   │   ├── (tabs)/
│   │   │   ├── index.tsx        # Dashboard
│   │   │   ├── encounters.tsx   # Encounter list & detail
│   │   │   ├── claims.tsx       # Claims portal
│   │   │   ├── compliance.tsx   # Compliance & audit console
│   │   │   ├── audit.tsx        # AI-flagged claims queue
│   │   │   ├── finance.tsx      # Actuarial dashboard
│   │   │   ├── settings.tsx
│   │   │   └── _layout.tsx
│   │   ├── claims/[id].tsx      # Claim detail & adjudication
│   │   ├── encounters/[id].tsx  # Encounter detail
│   │   ├── preauth/[id].tsx     # Pre-authorization detail
│   │   ├── store/authStore.ts
│   │   ├── components/toastConfig.tsx
│   │   ├── _layout.tsx
│   ├── app.json                 # Expo config
│   ├── eas.json                 # EAS build config
│   ├── package.json
│   ├── tsconfig.json
│   ├── babel.config.js
│   ├── .env.example
│   └── play-store/listing.txt
│
├── unihealth-patient360/        # React Native app for patients
│   ├── app/
│   │   ├── (auth)/login.tsx
│   │   ├── (tabs)/
│   │   │   ├── index.tsx        # Home
│   │   │   ├── coverage.tsx     # Coverage detail
│   │   │   ├── claims.tsx       # Claims history
│   │   │   ├── profile.tsx
│   │   │   └── _layout.tsx
│   │   ├── claims/[id].tsx      # Claim detail
│   │   ├── eob/[id].tsx         # Explanation of Benefits
│   │   ├── premium/pay.tsx      # M-Pesa payment flow
│   │   ├── dependants/manage.tsx
│   │   ├── documents/upload.tsx
│   │   ├── store/authStore.ts
│   │   ├── _layout.tsx
│   ├── app.json                 # Expo config
│   ├── eas.json                 # EAS build config
│   ├── package.json
│   ├── tsconfig.json
│   ├── babel.config.js
│   ├── .env.example
│   └── play-store/listing.txt
│
├── unihealth-shared/            # Shared library (both apps)
│   ├── tokens.ts                # Design system tokens
│   ├── components.tsx           # Shared component library
│   └── api.ts                   # Shared API client
│
├── docker-compose.yml           # Full backend dev environment
├── .env.example                 # Backend env template
└── README.md                    # This file
```

---

## II. Local Development Setup

### Prerequisites
- **Node.js 18+** and **npm** or **yarn**
- **Expo CLI**: `npm install -g eas-cli`
- **Docker & Docker Compose** (for backend)
- **Android Studio** or **Xcode** (optional, for testing on real devices)
- **Google Play Developer Account** ($25 one-time fee)

### 1. Clone & Install

```bash
git clone https://github.com/your-org/unihealth-360.git
cd unihealth-360

# Install shared library
cd unihealth-shared && npm install && cd ..

# Install Provider app
cd unihealth-provider
npm install
cp .env.example .env
# Edit .env with your API base URL

# Install Patient 360 app
cd ../unihealth-patient360
npm install
cp .env.example .env
# Edit .env similarly
```

### 2. Start Backend (Docker)

```bash
cd /path/to/unihealth-360

# Copy backend env template
cp .env.example .env

# Edit .env with real secrets (database password, Keycloak, M-Pesa keys, etc.)
nano .env

# Start all services
docker compose up -d

# Verify health
docker compose ps
# All should show "healthy" or "running"

# View logs
docker compose logs -f ehr_gateway
```

The backend will be available at:
- **EHR Clinical Gateway**: http://localhost:8100
- **Insurance Gateway**: http://localhost:8200
- **AI Audit Service**: http://localhost:8300
- **Keycloak**: http://localhost:8180 (admin: admin / password)
- **PostgreSQL**: localhost:5432 (user: unihealth)
- **Redis**: localhost:6379
- **Kafka**: localhost:9093

### 3. Start Provider App (Expo Dev Server)

```bash
cd unihealth-provider
npx expo start

# Press:
# 'a' for Android emulator
# 'i' for iOS simulator
# 's' to send link to your phone (scan QR code in Expo Go app)
```

### 4. Start Patient 360 App (Expo Dev Server)

```bash
cd unihealth-patient360
npx expo start

# Same options as above
```

---

## III. Building for Play Store — Step-by-Step

### Phase 1: Prepare (before first build)

#### Step 1a: Create Google Play Developer Account
1. Go to [Google Play Console](https://play.google.com/console)
2. Pay $25 one-time registration fee
3. Accept Developer Agreement & Policies

#### Step 1b: Set up EAS (Expo App Services)

```bash
cd unihealth-provider
eas init
# Follow prompts. Choose existing Google Play project or create new one
# This generates EXPO_PUBLIC_EAS_PROJECT_ID in app.json

cd ../unihealth-patient360
eas init
# Same process for patient app
```

#### Step 1c: Create Keystore (Android Signing Key)

EAS will automatically generate and manage your Android signing key on first build.
You can also generate locally:

```bash
cd unihealth-provider
eas credentials
# Select 'Android keystore'
# Choose 'Generate new keystore'
# EAS stores it securely; you get the key hash
```

#### Step 1d: Update app.json metadata (both apps)

**unihealth-provider/app.json:**
```json
{
  "expo": {
    "name": "UniHealth Provider",
    "slug": "unihealth-provider",
    "version": "1.0.0",
    "android": {
      "package": "ke.unihealth360.provider",
      "versionCode": 1
    }
  }
}
```

**unihealth-patient360/app.json:**
```json
{
  "expo": {
    "name": "UniHealth 360",
    "slug": "unihealth-patient360",
    "version": "1.0.0",
    "android": {
      "package": "ke.unihealth360.patient",
      "versionCode": 1
    }
  }
}
```

### Phase 2: Build APK / App Bundle

#### Build Provider App (Production)

```bash
cd unihealth-provider

# Build for Play Store (App Bundle — recommended)
eas build --platform android --profile production

# OR build APK for testing
eas build --platform android --profile preview
```

This creates an `.aab` (Android App Bundle) file. EAS will:
1. Compile your app
2. Sign it with your keystore
3. Upload to Play Console (if you approve)
4. Give you a download link

**Build output:** `unihealth-provider.aab` (~15–25 MB for a typical React Native app)

#### Build Patient 360 App (Production)

```bash
cd unihealth-patient360

# Build for Play Store
eas build --platform android --profile production
```

**Build output:** `unihealth-patient360.aab`

### Phase 3: Upload to Play Console

#### Go to Google Play Console

1. **Create new app** (or link existing app)
   - Select "UniHealth Provider" (for provider app)
   - Select "Medical" category
   - Fill in required forms

2. **Upload .aab file**
   - Go to **Release** → **Production** (or Internal Testing first)
   - Click **"Create new release"**
   - Upload `.aab` file
   - Review and submit

3. **Complete Store Listing**
   - **Title**: "UniHealth Provider" (70 char max)
   - **Short description**: (80 char max) — see `play-store/listing.txt`
   - **Full description**: (4,000 char max)
   - **Screenshots**: 6–8 images (1080 × 1920 px portrait)
   - **Feature graphic**: 1024 × 500 px
   - **Privacy policy**: https://unihealth360.ke/privacy
   - **Category**: Medical
   - **Rating**: Everyone / Mature (auto-determined)

4. **Content Rating Questionnaire**
   - Complete Google Play's built-in form
   - Self-rate content (should be "Everyone" for health apps)

5. **Set Pricing & Distribution**
   - Price: Free
   - Devices: All
   - Countries: Kenya (and others as you expand)

6. **Review & Rollout**
   - Review compliance checklist
   - Click **"Review release"**
   - Click **"Start rollout to Production"**

**Rollout timing:** First release takes **2–7 days** for review. Subsequent updates may be faster (1–3 days).

### Phase 4: Monitor & Update

Once live:

1. **Monitor in Play Console**
   - View installs, crashes, ANRs
   - Read user reviews
   - Check version adoption

2. **Push Updates**

When you update your app:

```bash
# Increment version in app.json
{
  "version": "1.0.1",  // Changed from 1.0.0
  "android": {
    "versionCode": 2   // Increment for each build
  }
}

# Rebuild and upload
eas build --platform android --profile production

# Upload new .aab to Play Console > Production release
```

---

## IV. Key Metadata for Both Apps

### Provider App
- **Package name**: `ke.unihealth360.provider`
- **Category**: Medical
- **Target API level**: 34+ (current requirement)
- **Min API**: 23 (Android 6.0)
- **Permissions**: CAMERA, READ_EXTERNAL_STORAGE, BIOMETRIC, INTERNET, ACCESS_NETWORK_STATE

### Patient 360 App
- **Package name**: `ke.unihealth360.patient`
- **Category**: Medical
- **Target API level**: 34+
- **Min API**: 23
- **Permissions**: CAMERA, READ_EXTERNAL_STORAGE, BIOMETRIC, INTERNET, ACCESS_NETWORK_STATE

---

## V. Testing Before Release

### 1. Local Emulator Testing

```bash
# Build APK for testing
eas build --platform android --profile preview

# Download APK and install on emulator
adb install path/to/app.apk
```

### 2. Internal Testing Track (Play Console)

1. Upload `.aab` to **Internal Testing** release track
2. Add test users (your Gmail account)
3. Test on real device via Play Console link
4. Verify all screens, login, API calls, M-Pesa flow work

### 3. Closed Testing Track (optional)

1. Invite doctors/nurses (Provider) or patients (Patient 360) to test
2. Collect feedback via Play Console review form
3. Fix bugs and retest

### 4. Staged Rollout

After Internal/Closed testing passes, release to **Production** with **staged rollout**:
- Start at 5% of users
- Monitor crashes & reviews for 24 hours
- If healthy, roll out to 25%, then 100%

---

## VI. Continuous Integration (CI/CD)

### GitHub Actions Example

Create `.github/workflows/build.yml`:

```yaml
name: Build & Submit to Play Store

on:
  push:
    branches:
      - production
  workflow_dispatch:

jobs:
  build-provider:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install -g eas-cli
      - run: cd unihealth-provider && npm install
      - run: eas build --platform android --profile production
        env:
          EAS_TOKEN: ${{ secrets.EAS_TOKEN }}

  build-patient:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - run: npm install -g eas-cli
      - run: cd unihealth-patient360 && npm install
      - run: eas build --platform android --profile production
        env:
          EAS_TOKEN: ${{ secrets.EAS_TOKEN }}
```

To use, add your `EAS_TOKEN` as a GitHub secret.

---

## VII. Regulatory Compliance (Kenya)

Before releasing, ensure:

1. **Data Protection Act 2019**
   - ✅ Privacy policy published
   - ✅ ODPC registration submitted (data controller/processor)
   - ✅ DPIA completed for AI features

2. **Digital Health Act 2023**
   - ✅ Data stored on Kenyan servers
   - ✅ Interoperability with national HIE (via FHIR)
   - ✅ Incident response plan (48h notification to agency)

3. **Social Health Insurance Act 2023**
   - ✅ Compliant with SHA/SHIF rules
   - ✅ Accurate tariffs from Benefits Package & Tariffs Advisory Panel
   - ✅ Fair appeals process documented

4. **Insurance Act (IRA)**
   - ✅ Licensed insurer credentials verified (private mode)
   - ✅ Solvency & reserve adequacy reporting ready

5. **E-COMMERCE / APP STORE RULES**
   - ✅ No false health claims
   - ✅ Clear disclaimers (not a substitute for medical advice)
   - ✅ Appropriate for "Everyone" rating

---

## VIII. Post-Launch Checklist

After both apps go live:

- [ ] Monitor Play Store reviews & crash reports daily
- [ ] Set up Sentry / Crashlytics for real-time error tracking
- [ ] Establish support channel (email: support@unihealth360.ke, phone: 0800 720 601)
- [ ] Plan release cadence (e.g., monthly updates)
- [ ] Document known issues & roadmap
- [ ] Set up analytics (Firebase, Mixpanel) to track user behavior
- [ ] Prepare PR/media release for launch
- [ ] Train support team on handling app-specific user issues
- [ ] Schedule monthly security/compliance audits

---

## IX. Troubleshooting

### Build Fails: "Invalid App Bundle"
→ Ensure `versionCode` increments with each build and `targetSdkVersion` is ≥ 34

### App Crashes on Startup
→ Check `docker-compose logs` for backend issues; verify `.env` API URL is reachable

### M-Pesa Payment Fails
→ Ensure Daraja credentials in `.env` are correct; test in Daraja sandbox first

### Play Store Rejection
→ Review Play Store policy violations (often: health claims, inappropriate permissions); resubmit after fix

---

## X. Rollback & Versioning

If a release has critical bugs:

1. **Immediate**: Deploy patch to backend (backward-compatible)
2. **Within 24h**: Build & submit new app version to Play Console
3. **Staged rollout**: Start at 1% to catch new issues
4. **Communicate**: Notify users of rollback reason via in-app banner

---

## XI. Resources

- **Expo Docs**: https://docs.expo.dev
- **EAS Build**: https://docs.expo.dev/build/introduction
- **Play Console Help**: https://support.google.com/googleplay/android-developer
- **FHIR R5 Spec**: https://hl7.org/fhir/R5
- **Kenya Digital Health Act**: https://www.kenyalaw.org/lex/consolidated_laws/

---

## XII. Support & Next Steps

**For production issues:**
- Email: support@unihealth360.ke
- Phone: +254 800 720 601
- Dashboard: https://play.google.com/console

**For compliance questions:**
- Kenya ODPC: https://www.odpc.go.ke
- Ministry of Health: https://www.health.go.ke
- Insurance Regulatory Authority: https://www.ira.go.ke

---

**Version**: 1.0.0  
**Last Updated**: July 2026  
**Maintained by**: UniHealth 360 Team
