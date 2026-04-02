# UniHealth EHR — frontend (sign-in skeleton)

Static **multi-step secure sign-in** prototype: role selection, staff vs patient flows, MFA tabs, success screen. **Visual design** (colors, typography, layout) matches the reference you provided; copy is rebranded to **UniHealth EHR** and generic pilot wording.

## Files

| File | Purpose |
| ------ | --------- |
| `sign-in.html` | Full skeleton (inline CSS + JS): left brand panel, card, stepper, forms, MFA |
| `dashboard-doctor.html` | Stub destination after **Launch Dashboard** (doctor) |
| `dashboard-nurse.html` | Stub (nurse / clinical officer) |
| `dashboard-admin.html` | Stub (administrator) |
| `dashboard-patient.html` | Stub (patient portal) |

## Preview locally

Serve the folder so relative links work:

```bash
cd frontend && python3 -m http.server 3000
```

Open <http://localhost:3000/sign-in.html>.

## Next steps toward production

- Split `sign-in.html` into shared **CSS** / **JS** modules and a component framework (React, Vue, Svelte).
- Map the same **`:root` tokens** into your design system (already aligned with the reference greens and neutrals).
- Wire forms to your **auth / OIDC** backend; replace simulated `setTimeout` flows with real API calls.
- Optionally serve under FastAPI with `StaticFiles` or deploy beside `ehr-api` behind a reverse proxy.

## Note

`doAlt(...)` is called as `doAlt('mode', this)` so the correct button is used for loading state (works across browsers).
