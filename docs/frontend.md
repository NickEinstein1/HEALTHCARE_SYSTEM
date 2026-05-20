# UniHealth — frontend

The clinician and patient portals are implemented as a **React + TypeScript SPA** ([Vite](https://vite.dev/)) under **`frontend/app/`**. The parent folder **`frontend/`** also keeps lightweight **legacy HTML/CSS prototypes** (sign-in shells and stubs) suitable for **`python -m http.server`** demos only.

Previously this README listed “next steps” that read like open problems; below is how each is resolved in the repo **today**, with honest notes where production OAuth is still a future enhancement.

---

## 1. Sign-in shell split into structured UI modules

**Status: done (React).** Role selection, MFA steps, dashboards, and API wiring live in **`frontend/app/src/`**. See [SignInPage.tsx](../frontend/app/src/pages/SignInPage.tsx), **`components/sign-in/`**, and **`steps/`**.

---

## 2. Design tokens aligned with `:root`

**Status: done.** CSS variables live in [unihealth.css](../frontend/app/src/styles/unihealth.css) (`:root { … }`). TypeScript-backed names mirror the same variables for documentation and tooling in [tokens.ts](../frontend/app/src/theme/tokens.ts).

---

## 3. Wire auth to backend (OIDC vs pilot)

**Status: pilot-complete; OAuth is a roadmap item.** Dashboard API calls attach **`X-UniHealth-Role`** (doctor, nurse, admin, …) matching the simulated role from the unihealth sign-in flow. That matches the **`ehr-api`** pilot contract documented in **[ehr-api.md](ehr-api.md)**. Replacing simulated sign-in with **OpenID Connect** should reuse the same role header after your IdP/session layer issues tokens; until then treat this as internal pilot auth only.

---

## 4. Dev proxy + production API routing

**Status: implemented for local dev.**

- **`npm run dev`** uses [vite.config.ts](../frontend/app/vite.config.ts) proxies to **`http://localhost:8000`** for REST includes **`/fhir`**, **`/admin`**, **`/ai`** (REST + **`ws`** for anomaly streams), **`/appointments`**, **`/consent`**, **`/integrations`**, and other routers.
- For **hosted SPA on a domain other than the API**, set **`VITE_API_BASE_URL`** at build/run time ([`.env.example`](../frontend/app/.env.example)).

Production reference pattern: TLS edge (NGINX / cloud LB) terminates TLS, serves **`vite build`** static files from **`frontend/app/dist`**, and reverse-proxies **`/fhir`**, **`/ai`**, etc. to the gateway.

---

## 5. “Optionally serve under FastAPI / reverse proxy”

**Status: recommended pattern documented (reverse proxy).** The gateway remains the authoritative API (`uvicorn app.main:app`). Co-located static hosting belongs at the proxy layer or a CDN so API routes (`/`, `/health`, `/fhir/...`) never collide with SPA **`index.html`**. Optionally mount **`StaticFiles`** under a dedicated subpath with an explicit **`EHR_*`** config later; the repo avoids mounting the SPA blindly on **`/`**.

---

## Run the SPA (recommended)

From **`frontend/app/`**:

```bash
npm install   # once
npm run dev   # opens Vite dev server (default http://localhost:5173)
```

Ensure the gateway is reachable at **`http://localhost:8000`** for proxied endpoints (staging: **:8100** — see [getting-started.md](getting-started.md)).

Typecheck (`tsc`) and bundle:

```bash
npm run lint
npm run build
```

---

## Legacy HTML prototypes (`frontend/` root)

Quick static preview:

```bash
cd frontend && python3 -m http.server 3000
```

Then open **`http://localhost:3000/sign-in.html`** (and **`dashboard-*.html`** stubs). These files are **not** the React app; prefer **`frontend/app`** for integrations with **`ehr-api`** (see [ehr-api.md](ehr-api.md)).

Legacy pages share **`brand-mark.svg`** and **`brand.css`** in this folder for the UniHealth logo (replacing the old 🏥 emoji). Re-apply branding to all `*.html` here with **`python3 scripts/update-html-branding.py`** if you add new prototypes.
