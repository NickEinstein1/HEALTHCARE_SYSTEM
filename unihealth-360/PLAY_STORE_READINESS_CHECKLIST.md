================================================================================
         PLAY STORE READINESS CHECKLIST — UNIHEALTH 360
================================================================================

STATUS: ❌ NOT YET READY FOR SUBMISSION

These items MUST be completed before Play Store submission can proceed.

================================================================================
SECTION 1: CRITICAL BLOCKING ISSUES (Must Fix)
================================================================================

ISSUE 1: Missing App Icons & Assets
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FILES REQUIRED:
  Provider App (unihealth-provider/):
    □ app.json references: icon, splash, adaptiveIcon
    □ Missing: assets/icon.png (1024×1024)
    □ Missing: assets/splash.png (1242×2436)
    □ Missing: assets/adaptive-icon.png (1024×1024 with safe zone)
    □ Missing: assets/favicon.png (48×48)
    □ Missing: assets/notification-icon.png (192×192)

  Patient App (unihealth-patient360/):
    □ Same assets required

  Play Store Listing (BOTH APPS):
    □ play-store/feature-graphic.png (1024×500)
    □ play-store/app-store-icon.png (512×512)
    □ play-store/screenshots/ (need 4-8 screenshots, 1080×1920 each)
    □ play-store/privacy-policy.html

ACTION REQUIRED:
  1. Design or source 1024×1024 icon (transparent background recommended)
  2. Create splash screens (branded, 1242×2436)
  3. Create adaptive icons (follows Android guidelines)
  4. Create feature graphics for Play Store listing
  5. Take 4-8 app screenshots on Android device/emulator
  6. Write privacy policy document

ESTIMATED TIME: 2-4 hours (design/screenshot work)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ISSUE 2: Missing Google Services Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

FILES REQUIRED:
  □ unihealth-provider/google-services.json
  □ unihealth-patient360/google-services.json

These files are referenced in app.json but not present.

ACTION REQUIRED:
  1. Go to Firebase Console (console.firebase.google.com)
  2. Create Firebase project (or use existing)
  3. Add Android app to project
  4. Download google-services.json for each app
  5. Place in app root directory:
     - unihealth-provider/google-services.json
     - unihealth-patient360/google-services.json

ESTIMATED TIME: 15-30 minutes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ISSUE 3: Missing EAS Project Configuration & Signing Key
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT STATE:
  ❌ eas.json contains: "projectId": "REPLACE_WITH_EAS_PROJECT_ID"
  ❌ android.signingCredentials.keystore_path points to placeholder
  ❌ No Play Console signing key configured

REQUIRED CHANGES:
  Provider App (unihealth-provider/eas.json):
    □ Replace REPLACE_WITH_EAS_PROJECT_ID with actual EAS project ID
    □ Provide signing key path or let EAS manage it
    □ Configure Play Store signing in eas.json

  Patient App (unihealth-patient360/eas.json):
    □ Same as provider

ACTION REQUIRED:
  1. Create EAS account at https://expo.dev
  2. Link GitHub repository to EAS
  3. For each app, create EAS project:
     eas init (in unihealth-provider/)
     eas init (in unihealth-patient360/)
  4. Configure signing credentials:
     eas credentials (in each app directory)
     → Choose Android
     → Let EAS manage signing (recommended)
  5. Update eas.json with actual project IDs
  6. Generate and upload signing key to Google Play Console

ESTIMATED TIME: 1-2 hours

CRITICAL: Play Store requires signed APKs. EAS handles this automatically
if configured properly.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

ISSUE 4: Incomplete App Metadata
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CURRENT STATE:
  ❌ app.json metadata is minimal/incomplete
  ❌ play-store/listing.txt exists but may need Play Console-specific data
  ❌ Privacy policy URL not specified
  ❌ Terms of Service not specified

REQUIRED FOR PLAY CONSOLE:
  Provider App:
    □ App title (max 50 chars): "UniHealth Provider" or similar
    □ Short description (max 80 chars)
    □ Full description (max 4,000 chars)
    □ Screenshots (4-8 images, 1080×1920)
    □ Feature graphic (1024×500)
    □ Icon (512×512)
    □ Privacy policy URL
    □ Category (Medical/Healthcare)
    □ Content rating (fill questionnaire)
    □ Permissions justification for each permission

  Patient App:
    □ App title (max 50 chars): "UniHealth Patient 360" or similar
    □ Short description (max 80 chars)
    □ Full description (max 4,000 chars)
    □ Screenshots (4-8 images, 1080×1920)
    □ Feature graphic (1024×500)
    □ Icon (512×512)
    □ Privacy policy URL
    □ Category (Medical/Healthcare)
    □ Content rating (fill questionnaire)
    □ Permissions justification for each permission

ACTION REQUIRED:
  1. Prepare all Play Store listing content (see PLAY_STORE_LISTING.md)
  2. Create or upload privacy policy
  3. Take screenshots on Android device
  4. Complete content rating questionnaire
  5. Enter all metadata in Google Play Console

ESTIMATED TIME: 2-3 hours

================================================================================
SECTION 2: DEPLOYMENT SETUP (Required Before Building)
================================================================================

PREREQUISITE 1: Google Play Developer Account
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STATUS: ❌ (Needs verification)

REQUIRED:
  □ Create account at https://play.google.com/console
  □ Pay $25 one-time registration fee
  □ Complete profile information
  □ Create two apps in Play Console:
     • UniHealth Provider
     • UniHealth Patient 360

TIME: 30 minutes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PREREQUISITE 2: EAS Account & Project Setup
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STATUS: ❌ (Placeholder project IDs)

REQUIRED:
  □ Create account at https://expo.dev
  □ Link GitHub repository
  □ Create EAS projects (or run eas init in each app)
  □ Configure Android signing credentials
  □ Generate upload key for Play Console

TIME: 1-2 hours

================================================================================
SECTION 3: CODE & CONFIGURATION COMPLETION
================================================================================

REQUIREMENT 1: Environment Variables
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STATUS: ❌ (.env.example exists, needs production values)

REQUIRED:
  Provider App (unihealth-provider/):
    □ Copy .env.example to .env (DO NOT COMMIT)
    □ Update with production values:
      EXPO_PUBLIC_API_URL=https://api.unihealth360.ke
      EXPO_PUBLIC_KEYCLOAK_URL=https://auth.unihealth360.ke
      EXPO_PUBLIC_REALM=unihealth-360
      EXPO_PUBLIC_CLIENT_ID=unihealth-provider

  Patient App (unihealth-patient360/):
    □ Copy .env.example to .env (DO NOT COMMIT)
    □ Update with production values:
      EXPO_PUBLIC_API_URL=https://api.unihealth360.ke
      EXPO_PUBLIC_KEYCLOAK_URL=https://auth.unihealth360.ke
      EXPO_PUBLIC_REALM=unihealth-360
      EXPO_PUBLIC_CLIENT_ID=unihealth-patient

ENSURE: .env files are in .gitignore (already done)

TIME: 15 minutes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIREMENT 2: app.json Updates
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STATUS: ⚠️ (Exists but incomplete)

REQUIRED FOR PROVIDER APP (unihealth-provider/app.json):
  □ Update version to match release version (e.g., "1.0.0")
  □ Update buildNumber to match Play Console version code (e.g., 1)
  □ Verify icon path: "icon": "./assets/icon.png"
  □ Verify splash path: "splash": { "image": "./assets/splash.png" }
  □ Verify adaptive icon: "adaptiveIcon": { "foregroundImage": "./assets/adaptive-icon.png" }
  □ Set privacy policy URL: "privacyUrl": "https://..."
  □ Verify package name: "ke.unihealth360.provider"
  □ Verify permissions are documented

  REQUIRED FOR PATIENT APP (unihealth-patient360/app.json):
  □ Update version to match release version (e.g., "1.0.0")
  □ Update buildNumber to match Play Console version code (e.g., 1)
  □ Same asset path verification
  □ Set privacy policy URL
  □ Verify package name: "ke.unihealth360.patient"

TIME: 30 minutes

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIREMENT 3: eas.json Configuration
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STATUS: ❌ (Placeholder values)

REQUIRED FOR PROVIDER APP (unihealth-provider/eas.json):
  □ Replace "projectId": "REPLACE_WITH_EAS_PROJECT_ID" with actual ID
  □ Update android.signingCredentials with actual signing key
  □ Verify production profile is configured:
    "production": {
      "android": {
        "buildType": "app-bundle",
        "signingCredentials": { ... }
      }
    }

  REQUIRED FOR PATIENT APP (unihealth-patient360/eas.json):
  □ Same as provider

TIME: 30 minutes (after EAS setup complete)

================================================================================
SECTION 4: TESTING & VALIDATION
================================================================================

REQUIREMENT 1: Local Testing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STATUS: ❓ (Not verified)

REQUIRED:
  □ Test Provider App on Android emulator:
    cd unihealth-provider
    npm install
    npx expo start
    → Press 'a' to open Android emulator
    → Test all 14 screens
    → Verify no crashes
    → Check that API calls work (or mock correctly)

  □ Test Patient App on Android emulator:
    cd unihealth-patient360
    npm install
    npx expo start
    → Press 'a' to open Android emulator
    → Test all 10 screens
    → Verify no crashes

  □ Test on physical Android device (if possible)

TIME: 2-3 hours

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

REQUIREMENT 2: Build Testing
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

STATUS: ❌ (Not attempted)

REQUIRED:
  □ Test EAS build (development profile):
    cd unihealth-provider
    eas build --platform android --profile development
    → Verify build succeeds
    → Download APK
    → Test on device

  □ Test EAS build (production profile):
    cd unihealth-provider
    eas build --platform android --profile production
    → Verify build succeeds
    → Download AAB (Android App Bundle)

  □ Repeat for patient app

TIME: 1-2 hours (builds take 3-5 minutes each)

================================================================================
SECTION 5: PLAY CONSOLE SETUP
================================================================================

STEP 1: Create App Listings
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Go to https://play.google.com/console

For PROVIDER APP:
  1. Create new app → "UniHealth Provider"
  2. Fill in all store listing fields (see PLAY_STORE_LISTING.md)
  3. Upload feature graphic, icon, screenshots
  4. Fill content rating questionnaire
  5. Add privacy policy URL
  6. Set category: "Medical"

For PATIENT APP:
  1. Create new app → "UniHealth Patient 360"
  2. Same steps as provider

TIME: 1-2 hours per app

STEP 2: Configure App Release
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Go to "Release" → "Testing" → "Internal testing"
2. Add AAB file from EAS build
3. Fill in release notes
4. Submit for review

TIME: 30 minutes

================================================================================
COMPLETE CHECKLIST — SUMMARY
================================================================================

BEFORE YOU BUILD:
  □ Icons & assets created (1024×1024, splash, adaptive icon)
  □ Google services JSON downloaded and placed in app directories
  □ EAS account created and projects initialized
  □ EAS project IDs updated in eas.json (both apps)
  □ Production environment variables configured (.env)
  □ app.json updated with version/build numbers and asset paths
  □ eas.json updated with actual signing credentials
  □ Google Play Developer account created ($25)

BEFORE YOU SUBMIT:
  □ Provider app builds successfully: eas build --platform android --profile production
  □ Patient app builds successfully: eas build --platform android --profile production
  □ Both AAB files downloaded from EAS
  □ Apps tested on Android emulator (all screens functional)
  □ Apps tested on physical Android device (if possible)

FOR PLAY CONSOLE:
  □ Two apps created in Play Console
  □ All store listing metadata entered (both apps)
  □ Feature graphics uploaded (both apps)
  □ App icons uploaded (both apps)
  □ Screenshots uploaded (both apps)
  □ Privacy policy URL set (both apps)
  □ Content rating questionnaire completed (both apps)
  □ AAB files uploaded to Internal Testing track

AFTER SUBMISSION:
  □ Monitor for build review feedback
  □ Fix any issues reported
  □ Move to Staged Rollout (5% → 25% → 100%)
  □ Monitor crash reports and reviews

================================================================================
ESTIMATED TOTAL TIME TO PRODUCTION
================================================================================

Setup & Configuration:        3-4 hours
Asset Creation:               2-4 hours
EAS Build & Testing:          1-2 hours
Play Console Setup:           2-3 hours
Internal Testing & Fixes:     2-5 hours
Staged Rollout:               1-2 weeks

TOTAL:                         2-3 weeks to production (live on Play Store)

================================================================================
WHAT HAPPENS IF YOU SKIP ITEMS
================================================================================

⚠️  CRITICAL ITEMS (Will cause submission rejection):
  • Missing icons/assets → Build fails
  • Missing google-services.json → Build fails
  • Missing signing credentials → Build fails
  • Incomplete app metadata → Rejected by Play Store review

⚠️  IMPORTANT ITEMS (Will delay approval):
  • Missing privacy policy → Rejected for content policy
  • Missing permissions justification → Rejected
  • Incomplete screenshots → Rejected
  • Low content rating → May be rejected

⚠️  NICE-TO-HAVE ITEMS (Can be done later):
  • Screenshots with text overlays
  • Additional store listing languages
  • Beta testing program setup

================================================================================
NEXT STEPS
================================================================================

1. REVIEW this checklist with your team
2. COLLECT approval to proceed with asset creation
3. CREATE app icons and screenshots
4. SET UP Google Play Developer account
5. CONFIGURE EAS and signing credentials
6. BUILD and test locally
7. SUBMIT to Play Console internal testing
8. GATHER feedback and fix issues
9. ROLL OUT to production

================================================================================
QUESTIONS?
================================================================================

For Play Store submission details, see:
  - unihealth-360/SETUP.md (Section III)
  - unihealth-360/BUILD_COMPLETE.md
  - Google Play Console docs: https://developer.android.com/distribute

Support: support@unihealth360.ke

================================================================================
