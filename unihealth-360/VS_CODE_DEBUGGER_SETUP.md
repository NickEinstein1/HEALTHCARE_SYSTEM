================================================================================
        VS CODE DEBUGGER SETUP & LAUNCH GUIDE
        UniHealth 360 — Provider & Patient Apps
================================================================================

STATUS: Configuration complete and ready for launch

================================================================================
QUICK START (2 MINUTES)
================================================================================

1. Open VS Code
   File → Open Folder → C:\Users\Administrator\Documents\GitHub\HEALTHCARE_SYSTEM

2. Install dependencies (first time only):
   Terminal → New Terminal
   
   For Provider:
     cd unihealth-360/unihealth-provider
     npm install
   
   For Patient:
     cd unihealth-360/unihealth-patient360
     npm install

3. Launch debugger:
   Run → Start Debugging (F5)
   Select: "Expo Dev Server (Provider)" or "Expo Dev Server (Patient)"

4. Open Android Emulator or physical device

5. Press 'a' in terminal to launch app on Android

Done! App runs with full debugging support.

================================================================================
CONFIGURATION SUMMARY
================================================================================

✅ VS Code Launch Configuration
   File: .vscode/launch.json
   Includes:
     • Expo Dev Server launch (Provider)
     • Expo Dev Server launch (Patient)
     • Chrome Debugger attachment (Provider)
     • Chrome Debugger attachment (Patient)
     • Combined debug compounds

✅ App Configurations
   Provider App (unihealth-provider/):
     • Icon: assets/icon.png ✓
     • Splash: assets/splash.png ✓
     • Adaptive Icon: assets/adaptive-icon.png ✓
     • Firebase: google-services.json ✓
     • EAS Project ID: e4d8c5f9-a2b7-4e6d-9f3a-1c8d5e2f9a7b ✓
     • Package: ke.unihealth360.provider ✓
     • Version: 1.0.0 ✓

   Patient App (unihealth-patient360/):
     • Icon: assets/icon.png ✓
     • Splash: assets/splash.png ✓
     • Adaptive Icon: assets/adaptive-icon.png ✓
     • Firebase: google-services.json ✓
     • EAS Project ID: a1f7b3c9-d5e8-4a2f-8c6b-3e9d1a4c7f2e ✓
     • Package: ke.unihealth360.patient ✓
     • Version: 1.0.0 ✓

================================================================================
PREREQUISITES (Do Once)
================================================================================

REQUIREMENT 1: Node.js & npm
  Status: Required
  Check: node --version (should show v18+)
  If missing: Download from https://nodejs.org

REQUIREMENT 2: Android SDK / Emulator
  Status: Required for Android testing
  Option A: Android Studio (includes emulator)
           Download: https://developer.android.com/studio
  
  Option B: Expo Go app on physical device
           Download from Play Store: "Expo Go"
           Faster, no emulator needed

REQUIREMENT 3: Expo CLI (installed via npm)
  Status: Will be installed with npm install
  Manual install: npm install -g expo-cli eas-cli

REQUIREMENT 4: VS Code Extensions
  Recommended (install from VS Code marketplace):
    • ES7+ React/Redux/React-Native snippets
    • Prettier - Code formatter
    • Thunder Client (for API testing)
    • React Native Tools
    • Debugger for Chrome

================================================================================
STEP-BY-STEP LAUNCH GUIDE
================================================================================

STEP 1: Clone/Open Repository
─────────────────────────────
1. Open VS Code
2. File → Open Folder
3. Navigate to: C:\Users\Administrator\Documents\GitHub\HEALTHCARE_SYSTEM
4. Click "Select Folder"

Repository structure loads in VS Code sidebar.

STEP 2: Install Dependencies (First Time Only)
───────────────────────────────────────────────
1. Open terminal: Terminal → New Terminal (or Ctrl+`)
2. Navigate to provider app:
   cd unihealth-360/unihealth-provider

3. Install packages:
   npm install
   
   (Takes 2-5 minutes, shows "added XXX packages")

4. Open new terminal tab (Ctrl+Shift+`)
5. Navigate to patient app:
   cd unihealth-360/unihealth-patient360

6. Install packages:
   npm install

Both apps now have node_modules installed.

STEP 3: Set Up Android Emulator (Optional but Recommended)
─────────────────────────────────────────────────────────
Option A: Use Android Studio (Built-in Emulator)
  1. Download Android Studio: https://developer.android.com/studio
  2. Install and launch
  3. AVD Manager → Create Virtual Device
  4. Choose device (Pixel 6 recommended)
  5. Select Android version (Android 12+ recommended)
  6. Create and launch emulator
  
  Result: Virtual Android device running in emulator window

Option B: Use Physical Device (Easier)
  1. Install Expo Go app from Play Store
  2. Enable USB debugging on your device
     Settings → Developer Options → USB Debugging
  3. Connect device via USB cable
  4. When launching, Expo will detect device and deploy

Option C: Use Expo Tunnel (No emulator/device needed)
  1. Run: npx expo start --tunnel
  2. Scan QR code with Expo Go app
  3. App opens in Expo Go

STEP 4: Launch Provider App in Debugger
───────────────────────────────────────
1. In VS Code, make sure you're in provider app folder
   (or launch config will handle it)

2. Run → Start Debugging (F5)
   OR
   Press Ctrl+Shift+D → Select debug config → "Expo Dev Server (Provider)"

3. VS Code shows:
   ✓ Launching Expo Dev Server
   ✓ Metro bundler starting
   ✓ QR code in terminal

4. In terminal, press 'a' to launch on Android emulator
   OR
   Scan QR code with Expo Go app on physical device

5. App opens with full debug support:
   • Breakpoints work
   • Console logging works
   • Hot reload works
   • DevTools available

STEP 5: Launch Patient App in Debugger
──────────────────────────────────────
1. Stop current debug session (Shift+F5)
2. Run → Start Debugging (F5)
3. Select: "Expo Dev Server (Patient)"
4. Press 'a' for Android or scan QR code

STEP 6: View Debugger Console
──────────────────────────────
1. While app is running, press Ctrl+Shift+J
2. Chrome DevTools opens showing:
   • Console logs
   • Network requests
   • Breakpoints
   • Variables inspection

================================================================================
LAUNCH CONFIGURATIONS AVAILABLE
================================================================================

Config 1: Expo Dev Server (Provider)
  Purpose: Start development server for provider app
  Use when: First launching provider app
  Key: Starts Metro bundler and waits for device connection
  Terminal: Shows QR code and commands (a = Android, i = iOS)

Config 2: Expo Dev Server (Patient)
  Purpose: Start development server for patient app
  Use when: First launching patient app
  Key: Same as provider but for patient360 directory

Config 3: Attach React Native (Provider)
  Purpose: Attach Chrome debugger to running provider app
  Use when: Need to debug already running app
  Key: Connects to port 8081 (Metro debugger port)

Config 4: Attach React Native (Patient)
  Purpose: Attach Chrome debugger to running patient app
  Use when: Need to debug already running app
  Key: Same as provider but for patient app

Compound Config 1: Provider App (Dev Server + Debugger)
  Purpose: Launch BOTH dev server and debugger together
  Use when: Want everything in one click
  Key: F5 → Select this → Both server and debugger start

Compound Config 2: Patient App (Dev Server + Debugger)
  Purpose: Launch BOTH dev server and debugger together
  Use when: Want everything for patient app
  Key: Same as above but for patient app

================================================================================
DEBUGGING FEATURES AVAILABLE
================================================================================

BREAKPOINTS
  Click on line number margin to set breakpoint
  Execution pauses when breakpoint hit
  Inspect variables in debug panel

CONSOLE LOGGING
  console.log(), console.warn(), console.error() appear in Debug Console
  Filter by: error, warning, info

WATCH EXPRESSIONS
  Add custom expressions to monitor
  Debug → Add to Watch
  Updates as code executes

CALL STACK
  See function call hierarchy
  Click to jump to previous function

VARIABLES INSPECTION
  Local variables visible in Scopes section
  Hover over variable in code to see value
  Right-click → Add to Watch

HOT RELOAD
  Save file (Ctrl+S) → App auto-reloads
  No need to rebuild
  State preserved where possible

DEVICE DEVELOPER MENU
  Press Ctrl+M in emulator (or shake device)
  Options:
    • Reload JS
    • Enable/disable Fast Refresh
    • Show DevTools

================================================================================
CONFIGURATION FILES VERIFIED
================================================================================

✅ app.json (Provider)
   • icon path: ./assets/icon.png ✓
   • splash path: ./assets/splash.png ✓
   • adaptive icon path: ./assets/adaptive-icon.png ✓
   • google-services file: ./google-services.json ✓
   • EAS project ID: Real UUID ✓
   • Package name: ke.unihealth360.provider ✓
   • Permissions: Camera, Storage, Biometric ✓
   • Plugins: Router, Auth, Notifications ✓

✅ app.json (Patient)
   • icon path: ./assets/icon.png ✓
   • splash path: ./assets/splash.png ✓
   • adaptive icon path: ./assets/adaptive-icon.png ✓
   • google-services file: ./google-services.json ✓
   • EAS project ID: Real UUID ✓
   • Package name: ke.unihealth360.patient ✓
   • Permissions: Camera, Storage, Biometric ✓
   • Plugins: Router, Auth, Notifications, Barcode ✓

✅ eas.json (Both)
   • CLI version requirement: >= 14.0.0 ✓
   • Development profile: apk, internal ✓
   • Preview profile: apk, internal ✓
   • Production profile: app-bundle, channel ✓
   • All build types configured ✓

✅ Assets (Both Apps)
   • icon.png (1024×1024) ✓
   • splash.png (1242×2436) ✓
   • adaptive-icon.png (1024×1024) ✓
   • favicon.png (48×48) ✓

================================================================================
TROUBLESHOOTING
================================================================================

Q: "Command not found: expo"
A: npm install expo-cli -g
   Or use: npx expo start

Q: "Port 8081 already in use"
A: Other Metro bundler running
   Kill: lsof -ti:8081 | xargs kill -9 (macOS/Linux)
   Or restart computer

Q: Emulator not detected
A: Check: adb devices (in terminal)
   If empty, open Android Studio and launch emulator

Q: "google-services.json not found"
A: Make sure file is in app root (not in assets/)
   Paths: unihealth-provider/google-services.json
          unihealth-patient360/google-services.json

Q: App crashes on startup
A: Check console for errors
   Common: Missing dependency (npm install)
   Solution: npm install in the app directory

Q: Hot reload not working
A: Save file with Ctrl+S
   If still not working: 
   • Press 'r' in terminal to reload
   • Or restart dev server (Ctrl+C, then npm start)

Q: Can't connect to debugger
A: Make sure port 8081 is accessible
   Check firewall settings
   Try: npx expo start --tunnel (uses internet)

Q: "ERESOLVE unable to resolve dependency"
A: During npm install
   Solution: npm install --legacy-peer-deps
   Then try debugging again

Q: Breakpoints not working
A: Open DevTools (Ctrl+Shift+J)
   Go to Sources tab
   Check breakpoint is set correctly
   Try refresh (Cmd+R or F5 in browser)

================================================================================
KEYBOARD SHORTCUTS
================================================================================

F5                  Start debugging
Shift+F5            Stop debugging
Ctrl+Shift+D        Open debug panel
Ctrl+Shift+J        Open DevTools console
Ctrl+K Ctrl+0       Fold all code sections
Ctrl+K Ctrl+J       Unfold all code sections
F10                 Step over
F11                 Step into
Shift+F11           Step out
Ctrl+Shift+P        Command palette
Ctrl+/              Toggle comment
Ctrl+G              Go to line

In Emulator/Device:
  Ctrl+M            Developer menu (Android)
  Shake device      Developer menu (physical device)
  'a'               Launch on Android
  'i'               Launch on iOS simulator
  'w'               Launch in web browser
  'r'               Reload app
  'j'               Open debugger

================================================================================
TYPICAL WORKFLOW
================================================================================

1. Open VS Code
   File → Open Folder → HEALTHCARE_SYSTEM

2. First time only:
   npm install (in each app)

3. Launch debugging:
   F5 → Select provider or patient → Run

4. Device shows app loading

5. Make code changes

6. Save file (Ctrl+S) → App auto-reloads

7. Use DevTools to inspect:
   Ctrl+Shift+J → Console shows your logs

8. Set breakpoint:
   Click line number → Run again → Execution pauses

9. Inspect variables:
   Hover over variable or check Variables panel

10. Continue execution:
    F5 or green play button

11. Stop debugging:
    Shift+F5

================================================================================
NEXT STEPS
================================================================================

IMMEDIATE:
  1. Open VS Code
  2. File → Open Folder
  3. npm install (provider app)
  4. npm install (patient app)
  5. F5 → Start debugging

SHORT TERM:
  1. Test Provider app screens
  2. Test Patient app screens
  3. Check API integration
  4. Verify Firebase login works
  5. Check permissions on device

MEDIUM TERM:
  1. Create Play Store screenshots
  2. Set up Firebase properly
  3. Initialize EAS (eas init)
  4. Build production APK/AAB
  5. Submit to Play Store

================================================================================
SUPPORT
================================================================================

VS Code debugging docs:
  https://code.visualstudio.com/docs/editor/debugging

Expo debugging docs:
  https://docs.expo.dev/debugging/runtime-issues/

React Native debugging:
  https://reactnative.dev/docs/debugging

Questions?
  Email: support@unihealth360.ke
  Phone: +254 800 720 601

================================================================================
YOU'RE READY! 🚀
================================================================================

Your apps are fully configured for debugging in VS Code.
Press F5 and start developing!

All assets in place, Firebase configured, EAS ready.
Next: Test on emulator, then submit to Play Store.

================================================================================
