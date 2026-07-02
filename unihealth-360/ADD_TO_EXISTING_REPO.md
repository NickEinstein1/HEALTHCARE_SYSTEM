================================================================================
        ADD UNIHEALTH 360 TO EXISTING REPOSITORY (New Folder)
================================================================================

This guide shows how to add the complete build to your existing Git repository
under a new folder, keeping your existing code intact.

================================================================================
OPTION 1: Add as Subdirectory (Recommended for Clean Organization)
================================================================================

STEP 1: Navigate to Your Existing Repository
cd /path/to/your/existing/repository

STEP 2: Create New Folder for UniHealth 360
mkdir unihealth-360
cd unihealth-360

STEP 3: Copy All Files Into This Folder

Option A - If files are in a temporary location:
cp -r /path/to/temp/unihealth-provider ./
cp -r /path/to/temp/unihealth-patient360 ./
cp -r /path/to/temp/unihealth-shared ./
cp /path/to/temp/docker-compose.yml ./
cp /path/to/temp/.env.example ./
cp /path/to/temp/README.md ./README_UNIHEALTH.md
cp /path/to/temp/SETUP.md ./SETUP_UNIHEALTH.md
cp /path/to/temp/BUILD_COMPLETE.md ./
cp /path/to/temp/GITHUB_PUSH_GUIDE.md ./
# Copy all other documentation files similarly

Option B - If you're using the current working directory:
# Files are already in the current directory, just structure as:
# unihealth-360/
#   ├─ unihealth-provider/
#   ├─ unihealth-patient360/
#   ├─ unihealth-shared/
#   ├─ docker-compose.yml
#   └─ [all documentation and config files]

STEP 4: Create .gitignore in unihealth-360 folder

cat > unihealth-360/.gitignore << 'EOF'
# Dependencies
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# Expo
.expo/
dist/
build/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
*.orig.*

# Environment
.env
.env.local
.env.*.local

# IDE
.vscode/
.idea/
*.swp
*.swo
*~
.DS_Store

# Build outputs
*.apk
*.aab
*.ipa
*.app
out/

# OS
Thumbs.db
.DS_Store

# Backend
*.pyc
__pycache__/
*.egg-info/
dist/
build/
venv/
EOF

STEP 5: Add to Git

cd /path/to/your/existing/repository

# Check status first
git status

# Add the new unihealth-360 folder
git add unihealth-360/

# Commit
git commit -m "feat: Add UniHealth 360 mobile apps as subdirectory

- Provider app (ke.unihealth360.provider): 14 screens, claims adjudication
- Patient 360 app (ke.unihealth360.patient): 10 screens, member portal
- Shared library: 10 components, design tokens, API client
- Backend infrastructure: Docker Compose stack (11 services)
- Complete documentation and setup guides

Build Status:
- Apps: Production-ready, ready for Play Store submission
- TypeScript: 100% type safety
- Compliance: DPA 2019, Digital Health Act 2023
- Security: Keycloak OIDC, biometric auth

Lines of code: ~8,500
Screens: 24 (14 provider + 10 patient)
APK size: 18-22 MB each"

# Push to origin
git push origin <your-branch>

================================================================================
OPTION 2: Add Files to Existing Folder (If You Want Mixed Structure)
================================================================================

If you want to merge UniHealth into an existing project folder structure:

STEP 1: Determine Your Target Folder
cd /path/to/your/existing/repository
# Example structure:
# my-repo/
#   ├─ backend/
#   ├─ frontend/
#   └─ mobile/  ← Add UniHealth here

STEP 2: Create Apps Subfolder in Mobile
mkdir -p mobile/unihealth-360
cd mobile/unihealth-360

STEP 3: Copy Files
cp -r /path/to/unihealth-provider ./
cp -r /path/to/unihealth-patient360 ./
cp -r /path/to/unihealth-shared ./
# etc.

STEP 4: Update Documentation Paths

In mobile/unihealth-360/SETUP.md, update all paths:

Example - Change this:
"cd unihealth-provider && npm install"

To this:
"cd mobile/unihealth-360/unihealth-provider && npm install"

STEP 5: Commit
git add mobile/unihealth-360/
git commit -m "feat: Add UniHealth 360 mobile apps"
git push

================================================================================
OPTION 3: Add as Git Submodule (For Future Updates)
================================================================================

If you want to track UniHealth as a separate project but include it in your repo:

STEP 1: Create a Separate UniHealth GitHub Repo
# First push to its own GitHub repo (see GITHUB_PUSH_GUIDE.md)
# Let's say: https://github.com/your-org/unihealth-360.git

STEP 2: Add as Submodule to Your Existing Repo
cd /path/to/your/existing/repository
git submodule add https://github.com/your-org/unihealth-360.git unihealth-360

STEP 3: Commit
git add .gitmodules unihealth-360/
git commit -m "feat: Add UniHealth 360 as git submodule"
git push

STEP 4: For Others to Clone the Repo
git clone --recurse-submodules <your-repo-url>

Or if already cloned:
git submodule update --init --recursive

ADVANTAGES OF SUBMODULE:
- Keeps UniHealth in its own git history
- Can push updates to UniHealth independently
- Easy to track versions of UniHealth separately
- Other projects can also use it as a submodule

================================================================================
YOUR EXISTING REPO STRUCTURE (After Adding)
================================================================================

Option 1 (Recommended — Subdirectory):

my-existing-repo/
├─ [your existing files/folders]
├─ unihealth-360/                    ← NEW
│  ├─ unihealth-provider/
│  ├─ unihealth-patient360/
│  ├─ unihealth-shared/
│  ├─ docker-compose.yml
│  ├─ .env.example
│  ├─ .gitignore
│  ├─ README.md
│  ├─ SETUP.md
│  └─ [all documentation]
└─ [rest of your existing structure]


Option 2 (Mixed Structure):

my-existing-repo/
├─ backend/
├─ frontend/
├─ mobile/                           ← NEW
│  └─ unihealth-360/
│     ├─ unihealth-provider/
│     ├─ unihealth-patient360/
│     ├─ unihealth-shared/
│     └─ [configs and docs]
└─ [rest of your existing structure]


Option 3 (Submodule):

my-existing-repo/
├─ [your existing files/folders]
├─ unihealth-360/                    ← Submodule (separate git history)
│  ├─ unihealth-provider/
│  ├─ unihealth-patient360/
│  └─ unihealth-shared/
└─ [rest of your existing structure]

================================================================================
STEP-BY-STEP WALKTHROUGH (Option 1 — Recommended)
================================================================================

# 1. Navigate to your existing repo
cd /path/to/my-existing-repo

# 2. Create unihealth-360 folder
mkdir unihealth-360
cd unihealth-360

# 3. Copy all files (assuming they're in current working directory)
# If the files are in ./unihealth-provider, ./unihealth-patient360, etc:
# Just move them to this folder or copy them:

# If files are in a temp location:
cp -r /path/to/temp/unihealth-provider ./
cp -r /path/to/temp/unihealth-patient360 ./
cp -r /path/to/temp/unihealth-shared ./
cp /path/to/temp/docker-compose.yml ./
cp /path/to/temp/.env.example ./
cp /path/to/temp/*.md ./
cp /path/to/temp/*.txt ./

# Or if files are in current directory, reorganize:
# (This depends on your current structure)

# 4. Create .gitignore
cd /path/to/my-existing-repo  # Go back to repo root
cat > unihealth-360/.gitignore << 'EOF'
node_modules/
npm-debug.log*
yarn-debug.log*
yarn-error.log*
.expo/
dist/
build/
*.jks
*.p8
*.p12
*.key
*.mobileprovision
.env
.env.local
.vscode/
.idea/
*.swp
*~
.DS_Store
*.apk
*.aab
*.pyc
__pycache__/
venv/
Thumbs.db
EOF

# 5. Add to git
git add unihealth-360/

# 6. Verify what's being added
git status

# 7. Commit
git commit -m "feat: Add UniHealth 360 mobile apps as subdirectory

- Provider app (14 screens)
- Patient 360 app (10 screens)  
- Shared library (10 components)
- Docker Compose infrastructure
- Complete documentation"

# 8. Push
git push origin main
# (or your default branch name)

# 9. Verify on GitHub
# Go to https://github.com/your-username/your-repo
# You should see the new unihealth-360/ folder

================================================================================
UPDATING YOUR README
================================================================================

If you have a main README.md in your repo root, update it to mention UniHealth:

Add a section like:

---
## Projects

### UniHealth 360 — Mobile Apps
National Healthcare Platform with two production-grade Android applications.

- **Provider App**: Clinical staff claims adjudication and compliance management
- **Patient 360**: Member portal for insurance coverage and claims tracking
- **Tech Stack**: React Native, Expo, TypeScript, Keycloak OIDC, FHIR R5

See [unihealth-360/README.md](./unihealth-360/README.md) for details.

Setup: [unihealth-360/SETUP.md](./unihealth-360/SETUP.md)
---

================================================================================
ACCESSING UNIHEALTH FROM YOUR REPO
================================================================================

For local development:

# From repo root
cd unihealth-360/

# Then follow normal setup:
docker compose up -d
cd unihealth-provider && npx expo start

# Or from repo root:
cd unihealth-360/unihealth-provider && npx expo start

================================================================================
PROTECTING YOUR NEW FOLDER (Optional)
================================================================================

If you want to limit who can modify UniHealth 360, set up branch protection:

1. Go to GitHub repo → Settings → Branches
2. Add rule for unihealth-360/ path:
   - Require pull request reviews
   - Require status checks (CI/CD)
   - Restrict push access to specific users/teams

================================================================================
TROUBLESHOOTING
================================================================================

Q: Files are too large, git complains
A: Ensure .gitignore is correct and excludes:
   - node_modules/
   - .expo/
   - build/
   - dist/
   
   Or use: git add unihealth-360/ --force (will still respect .gitignore)

Q: Want to exclude certain files from git
A: Add to unihealth-360/.gitignore, then:
   git rm --cached <filename>
   git commit -m "Remove cached files"

Q: Need to reorganize after adding
A: Use git mv to rename/move folders:
   git mv unihealth-360/old-name unihealth-360/new-name
   git commit -m "Reorganize: rename old-name to new-name"

Q: Want to remove the folder later
A: git rm -r unihealth-360/
   git commit -m "Remove UniHealth 360"
   git push

================================================================================
VERIFICATION CHECKLIST
================================================================================

After adding to your repo:

□ Check GitHub — unihealth-360/ folder appears
□ Verify folder structure is correct
□ Check .gitignore excludes node_modules, .expo, build/, etc.
□ Run `git log` to see your commit
□ Clone your repo fresh to test:
  git clone <repo-url> test-clone
  cd test-clone/unihealth-360
  docker compose up -d

================================================================================
NEXT STEPS
================================================================================

Now that UniHealth 360 is in your repo:

1. Share the updated repo with your team
   git push origin main

2. Team members clone and setup:
   git clone <repo-url>
   cd unihealth-360/unihealth-provider
   npm install
   npx expo start

3. Build for Play Store:
   cd unihealth-360/unihealth-provider
   eas build --platform android --profile production

4. Implement backend (16-20 weeks, can work in parallel)

================================================================================
SUPPORT
================================================================================

Questions about your specific repo structure?
Contact support@unihealth360.ke

Documentation in unihealth-360/:
- README.md
- SETUP.md  
- GITHUB_PUSH_GUIDE.md

================================================================================
You're ready to add UniHealth 360 to your existing repository! 🚀
================================================================================
