================================================================================
              EAS INITIALIZATION & CONFIGURATION GUIDE
================================================================================

CURRENT STATUS: Assets created, Firebase configured, now initialize EAS

This guide will help you:
  1. Set up EAS account at expo.dev
  2. Initialize EAS for both apps
  3. Configure signing credentials
  4. Update eas.json with real project IDs (no more REPLACE_WITH_...)

TIME REQUIRED: 1-2 hours (includes account creation)

================================================================================
STEP 1: CREATE EXPO/EAS ACCOUNT
================================================================================

1. Go to: https://expo.dev

2. Click "Sign up" (or "Get started")

3. Create account (use your GitHub email preferred):
   Email: your-email@example.com
   Password: (create strong password)
   Username: (choose username, e.g., your-github-username)

4. Verify email (check inbox for verification link)

5. Click "Create organization" or skip (not required for individual use)

RESULT: EAS account created

================================================================================
STEP 2: INITIALIZE EAS FOR PROVIDER APP
================================================================================

1. Open command prompt or terminal

2. Navigate to provider app:
   cd C:\Users\Administrator\Documents\GitHub\HEALTHCARE_SYSTEM\unihealth-360\unihealth-provider

3. Run EAS initialization:
   eas init

4. Follow the prompts:
   
   Prompt 1: "Select your account"
   → Choose: Create a new account (if first time) or select your account
   
   Prompt 2: "Project name"
   → Enter: unihealth-provider (or similar)
   
   Prompt 3: "Which platform are you planning to build for?"
   → Select: Android (or choose "All" for flexibility)
   
   Prompt 4: "Continue to EAS Web?"
   → Select: Yes (or press Enter)

5. Web browser opens to complete setup
   → Confirm project linking
   → Wait for linking to complete
   → Return to terminal

6. eas.json is now updated with real project ID:
   ✓ "projectId" is now actual ID (not REPLACE_WITH_...)
   ✓ File automatically saved

RESULT: EAS initialized for provider app with real project ID

================================================================================
STEP 3: CONFIGURE SIGNING CREDENTIALS (PROVIDER)
================================================================================

1. In the same terminal (still in unihealth-provider/):

2. Run credentials command:
   eas credentials

3. Follow the prompts:
   
   Prompt 1: "Platform"
   → Select: Android
   
   Prompt 2: "Environment"
   → Select: Production (for Play Store signing)
   
   Prompt 3: "Action"
   → Select: Set up a new key store
   
   Prompt 4: "Key store setup"
   → Select: Let EAS manage signing (RECOMMENDED)
   
   Prompt 5: "Continue?"
   → Select: Yes

4. EAS generates signing credentials automatically:
   ✓ Creates keystore
   ✓ Generates signing keys
   ✓ Stores securely in EAS servers
   ✓ Updates eas.json automatically

5. Terminal shows success message:
   "Credentials saved successfully"

RESULT: Signing credentials configured for provider app

================================================================================
STEP 4: INITIALIZE EAS FOR PATIENT APP
================================================================================

1. Navigate to patient app:
   cd ..\unihealth-patient360

2. Run EAS initialization:
   eas init

3. Follow the same prompts as provider:
   Project name: unihealth-patient360
   Platform: Android
   Continue: Yes
   (Web browser opens again - confirm linking)

4. eas.json is updated with real project ID

RESULT: EAS initialized for patient app

================================================================================
STEP 5: CONFIGURE SIGNING CREDENTIALS (PATIENT)
================================================================================

1. In unihealth-patient360/ directory:

2. Run credentials command:
   eas credentials

3. Follow the same prompts as provider:
   Platform: Android
   Environment: Production
   Action: Set up a new key store
   Key store setup: Let EAS manage signing
   Continue: Yes

4. Credentials saved successfully

RESULT: Signing credentials configured for patient app

================================================================================
VERIFICATION: Check eas.json Files
================================================================================

After both apps are initialized, verify the files are updated:

Provider app (unihealth-provider/eas.json):
  ✓ "projectId" is NOT "REPLACE_WITH_EAS_PROJECT_ID"
  ✓ "projectId" shows: "abc123def456@exposed" or similar
  ✓ android.signingCredentials is configured

Patient app (unihealth-patient360/eas.json):
  ✓ "projectId" is NOT "REPLACE_WITH_EAS_PROJECT_ID"
  ✓ "projectId" shows: "xyz789uvw123@exposed" or similar
  ✓ android.signingCredentials is configured

If you see REPLACE_WITH_... still, something went wrong - re-run eas init

================================================================================
STEP 6: COMMIT CHANGES TO GITHUB
================================================================================

1. Go to repo root:
   cd C:\Users\Administrator\Documents\GitHub\HEALTHCARE_SYSTEM

2. Add both eas.json files:
   git add unihealth-360/unihealth-provider/eas.json
   git add unihealth-360/unihealth-patient360/eas.json

3. Commit:
   git commit -m "feat: Initialize EAS projects with real project IDs and signing credentials"

4. Push:
   git push origin main

RESULT: Changes saved to GitHub

================================================================================
STEP 7: TEST BUILD (DEVELOPMENT)
================================================================================

Before production build, test with development profile:

1. In unihealth-provider/:
   eas build --platform android --profile development

2. Follow prompts:
   "Build type: apk"
   "Validate your project"
   
3. EAS starts build process:
   - Takes 3-5 minutes
   - Shows progress in terminal
   - Uploads source files to EAS
   - Builds on EAS servers (not on your machine)
   - Downloads APK when complete

4. Build completes:
   "Build finished"
   "Download link: https://..."

5. Download APK (optional for testing)

RESULT: Verified that build process works

================================================================================
PRODUCTION BUILD (When Ready)
================================================================================

When ready for Play Store:

1. Build production APK (as .aab - required for Play Store):
   eas build --platform android --profile production

2. Wait for build completion (5-10 minutes)

3. Download AAB file

4. Upload to Google Play Console

5. Submit to testing/production track

(See PLAY_STORE_SUBMISSION.md for detailed Play Console steps)

================================================================================
TROUBLESHOOTING
================================================================================

Q: "Project not found" error
A: Make sure you're logged into expo.dev in terminal
   Run: eas whoami (should show your account)
   If not logged in: eas login

Q: GitHub authorization fails
A: Make sure your GitHub account is connected to Expo
   Go to https://expo.dev/settings
   Check GitHub connection
   Re-authorize if needed

Q: "Cannot find eas command"
A: Install EAS CLI globally:
   npm install -g eas-cli

Q: Credentials setup fails
A: Try again with: eas credentials --reset
   Then re-run: eas credentials

Q: I don't see real project ID in eas.json
A: Check that eas init completed successfully
   Look for "✓" checkmarks in terminal output
   If not, try: eas init --force

Q: Build fails after configuration
A: Check that all assets are in place:
   - icon.png, splash.png, adaptive-icon.png in assets/
   - google-services.json in app root
   - eas.json has real project ID (not placeholder)
   
   If all present, try: eas build --platform android --profile development --wait

================================================================================
WHAT HAPPENS NEXT
================================================================================

After successful builds:

1. Apps are signed and ready for Play Store

2. You can distribute via:
   - Play Store (recommended for public)
   - Internal testing track (for team testing first)
   - Direct APK download (for testing)

3. EAS handles:
   ✓ Building (compilation)
   ✓ Signing (security)
   ✓ Signing key management (storage)
   ✓ Version management
   ✓ Multiple build profiles (dev, staging, production)

4. You control:
   ✓ Source code changes
   ✓ Build triggers
   ✓ Deployment to Play Store
   ✓ Release management

================================================================================
NEXT STEPS
================================================================================

After EAS is initialized:

1. [ ] Test build to verify setup works
       eas build --platform android --profile development

2. [ ] Create Play Store developer account ($25)
       https://play.google.com/console

3. [ ] Upload first build to Play Console internal testing

4. [ ] Gather team feedback on beta builds

5. [ ] Fix any issues and rebuild

6. [ ] Submit to production track for wider rollout

================================================================================
SUPPORT
================================================================================

EAS documentation:
  https://docs.expo.dev/eas-update/introduction/
  https://docs.expo.dev/eas-build/introduction/

Troubleshooting:
  https://docs.expo.dev/build-reference/troubleshooting/

If you get stuck:
  Email: support@unihealth360.ke
  Phone: +254 800 720 601

================================================================================
