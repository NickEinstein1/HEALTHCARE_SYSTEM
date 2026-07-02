================================================================================
                FIREBASE SETUP GUIDE — GOOGLE SERVICES JSON
================================================================================

CURRENT STATUS: Assets created, now need Firebase configuration

This guide will help you:
  1. Create Firebase project
  2. Add Android apps for both packages
  3. Download google-services.json files
  4. Place them in app directories

TIME REQUIRED: 15-30 minutes

================================================================================
STEP 1: CREATE FIREBASE PROJECT
================================================================================

1. Go to: https://console.firebase.google.com

2. Click "Create a project" or "Add project"

3. Fill in project details:
   Project name: UniHealth 360
   
4. Toggle settings:
   □ Enable Google Analytics: (optional, can skip)
   
5. Click "Create project"

6. Wait 2-3 minutes for project creation
   (You'll see a loading screen, then redirect to project dashboard)

RESULT: Firebase project "UniHealth 360" is now active

================================================================================
STEP 2: ADD ANDROID APP FOR PROVIDER
================================================================================

1. On Firebase Console, click "Add app" button (or icon)

2. Select "Android" as platform

3. Fill in app details:
   Package name: ke.unihealth360.provider
   App nickname: UniHealth Provider (optional)
   SHA-1 certificate fingerprint: (SKIP FOR NOW - can add later)

4. Click "Register app"

5. DOWNLOAD google-services.json
   → Large blue button "Download google-services.json"
   → Save the file to your computer

6. Click "Next" (rest is optional for now)

7. Firebase will show setup instructions
   → You can ignore these, we've already configured app.json

RESULT: google-services.json downloaded for provider app

================================================================================
STEP 3: ADD ANDROID APP FOR PATIENT
================================================================================

1. In Firebase Console, click "Add app" button again

2. Select "Android" as platform

3. Fill in app details:
   Package name: ke.unihealth360.patient
   App nickname: UniHealth Patient 360 (optional)
   SHA-1 certificate fingerprint: (SKIP - can add later)

4. Click "Register app"

5. DOWNLOAD google-services.json
   → Large blue button "Download google-services.json"
   → Save the file to your computer
   → Name it clearly (e.g., google-services-patient.json temporarily)

6. Click "Next" and you're done

RESULT: Second google-services.json downloaded for patient app

================================================================================
STEP 4: PLACE FILES IN APP DIRECTORIES
================================================================================

Now place the JSON files in your app directories:

For Provider App:
  1. Navigate to: unihealth-provider/
  2. Rename/copy the downloaded google-services.json
  3. Place it here: unihealth-provider/google-services.json
  
  Path should look like:
    C:\Users\Administrator\Documents\GitHub\HEALTHCARE_SYSTEM\
    unihealth-360\
    unihealth-provider\
    google-services.json  ← FILE HERE

For Patient App:
  1. Navigate to: unihealth-patient360/
  2. Rename/copy the second google-services.json
  3. Place it here: unihealth-patient360/google-services.json
  
  Path should look like:
    C:\Users\Administrator\Documents\GitHub\HEALTHCARE_SYSTEM\
    unihealth-360\
    unihealth-patient360\
    google-services.json  ← FILE HERE

VERIFICATION:
  Both files should be present:
  □ unihealth-provider/google-services.json
  □ unihealth-patient360/google-services.json

================================================================================
OPTIONAL: ADD SHA-1 CERTIFICATE (For full Firebase setup)
================================================================================

The SHA-1 fingerprint allows Firebase to fully verify your app signing key.
You can get this from EAS after initialization (see EAS guide next).

For now, you can skip this - the basic setup works without it.

If you want to add it later:
  1. In EAS, run: eas credentials
  2. Select Android → View credentials
  3. Copy the SHA-1 fingerprint
  4. Go back to Firebase Console
  5. Click your Android app
  6. Click "Settings" (gear icon)
  7. Add the SHA-1 under "Your apps" section

================================================================================
WHAT FIREBASE PROVIDES
================================================================================

With google-services.json in place, your apps can use:
  • Firebase Authentication (login, users)
  • Firebase Realtime Database (if needed later)
  • Firebase Cloud Messaging (push notifications)
  • Firebase Crashlytics (crash reporting)
  • Firebase Analytics (usage tracking)

For now, the file just needs to exist. The apps will build and work.

================================================================================
TROUBLESHOOTING
================================================================================

Q: I can't find the "Download google-services.json" button
A: Make sure you're on the "Add Firebase to your Android app" screen.
   Click "Add app" → select Android → fill in package name → next page
   has the download button.

Q: The JSON file looks empty or is very small
A: That's normal, it's typically 5-10 KB.

Q: I'm getting an error about package name
A: Make sure you typed:
   Provider: ke.unihealth360.provider (NOT ke.unihealth360.provider360)
   Patient: ke.unihealth360.patient (NOT ke.unihealth360.patientapp)

Q: Do I need to enable anything in Firebase Console?
A: No, basic setup is enough. The JSON file contains everything needed.

================================================================================
NEXT STEPS
================================================================================

After placing google-services.json files:

1. Commit to GitHub:
   git add unihealth-360/unihealth-provider/google-services.json
   git add unihealth-360/unihealth-patient360/google-services.json
   git commit -m "feat: Add Firebase google-services.json configuration"
   git push origin main

2. Initialize EAS (see FIREBASE_SETUP_AND_EAS_INITIALIZATION.md)

3. Test build:
   cd unihealth-provider
   eas build --platform android --profile development

================================================================================
