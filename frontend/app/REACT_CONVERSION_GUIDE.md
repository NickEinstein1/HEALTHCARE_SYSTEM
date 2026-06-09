# HTML to React Conversion - Integration Guide

This document provides instructions for integrating the converted React components from the HTML prototypes in `frontend/version 2.0/`.

## Overview

All 29 HTML files from `frontend/version 2.0/` have been converted to React components with the following structure:

```
frontend/app/src/
├── components/
│   ├── layout/
│   │   └── DashboardLayout.tsx    # Main layout wrapper
│   └── ui/
│       ├── Card.tsx               # Reusable card component
│       └── Tabs.tsx               # Tabbed interface
├── pages/
│   ├── PortalPage.tsx            # Portal/Landing page
│   ├── EMRDashboard.tsx          # Full EMR dashboard
│   ├── ModuleDashboard.tsx       # Generic module dashboard
│   ├── dashboards/
│   │   └── index.tsx             # All 24 module-specific dashboards
│   └── index.tsx                 # Page exports
```

## Component Architecture

### DashboardLayout
Base layout component wrapping all dashboard pages. Provides:
- Sidebar navigation
- Top bar with notifications
- Content area
- Responsive design

```tsx
import { DashboardLayout } from '../components/layout/DashboardLayout';

<DashboardLayout 
  pageTitle="Page Title"
  pageIcon="🏥"
  userName="Dr. Name"
  userRole="Doctor"
>
  {/* Page content */}
</DashboardLayout>
```

### Card Component
Reusable card for content sections. Variants: default, elevated, ai, danger

```tsx
import { Card } from '../components/ui/Card';

<Card 
  title="Card Title" 
  variant="default"
  action={<button>Action</button>}
>
  {/* Card content */}
</Card>
```

### Tabs Component
Tabbed interface for multi-section layouts.

```tsx
import { Tabs } from '../components/ui/Tabs';

<Tabs 
  tabs={[
    { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
    { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
  ]}
/>
```

## Page Components

### PortalPage
Converts `index.html` - Main landing/build index page showing all modules.

```tsx
import { PortalPage } from '../pages';

// In routing:
<Route path="/" element={<PortalPage />} />
```

### EMRDashboard
Converts `unihealth-emr.html` - Full electronic medical records dashboard with:
- Patient list with search
- Patient details card
- AI risk assessment
- SOAP notes tab
- Lab results
- Medications
- Medical history

```tsx
import { EMRDashboard } from '../pages';

// In routing:
<Route path="/emr" element={<EMRDashboard />} />
```

### Module Dashboards (24 total)
Generic dashboards for each role/department:

```tsx
import {
  DoctorDashboard,
  NurseDashboard,
  MaternityDashboard,
  // ... and 21 more
} from '../pages';

// In routing:
<Route path="/dashboard/doctor" element={<DoctorDashboard />} />
<Route path="/dashboard/nurse" element={<NurseDashboard />} />
<Route path="/dashboard/maternity" element={<MaternityDashboard />} />
// etc.
```

## Available Dashboards

| Module | Component | Icon | Route |
|--------|-----------|------|-------|
| EMR | EMRModuleDashboard | 🏥 | /dashboard/emr |
| Doctor | DoctorDashboard | 👨‍⚕️ | /dashboard/doctor |
| Nurse | NurseDashboard | ⚕️ | /dashboard/nurse |
| Maternity | MaternityDashboard | ❤️ | /dashboard/maternity |
| Laboratory | LaboratoryDashboard | 🧪 | /dashboard/lab |
| Radiology | RadiologyDashboard | 🔍 | /dashboard/radiology |
| Pharmacy | PharmacyDashboard | 💊 | /dashboard/pharmacy |
| ICU | ICUDashboard | ⚡ | /dashboard/icu |
| Surgery | SurgeryDashboard | ✂️ | /dashboard/surgery |
| Rehabilitation | RehabilitationDashboard | 🏃 | /dashboard/rehab |
| Nutrition | NutritionDashboard | 🍽️ | /dashboard/nutrition |
| Billing | BillingDashboard | 💰 | /dashboard/billing |
| Insurance | InsuranceDashboard | 🛡️ | /dashboard/insurance |
| Inventory | InventoryDashboard | 📦 | /dashboard/inventory |
| Fleet | FleetDashboard | 🚑 | /dashboard/fleet |
| Mortuary | MortuaryDashboard | 🕯️ | /dashboard/mortuary |
| Telemedicine | TelemediciDashboard | 📹 | /dashboard/teleconsult |
| Administration | AdministrationDashboard | ⚙️ | /dashboard/admin |
| HR & Payroll | HRDashboard | 👥 | /dashboard/hr |
| Analytics | AnalyticsDashboard | 📊 | /dashboard/analytics |
| Research | ResearchDashboard | 🔬 | /dashboard/research |
| Patient Portal | PatientDashboard | 👤 | /dashboard/patient |
| Super Admin | SuperAdminDashboard | 🏥 | /dashboard/superadmin |

## Integration Examples

### Example 1: Simple App.tsx with React Router

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import {
  PortalPage,
  EMRDashboard,
  DoctorDashboard,
  NurseDashboard,
  MaternityDashboard,
  // ... import others as needed
} from './pages';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PortalPage />} />
        <Route path="/emr" element={<EMRDashboard />} />
        <Route path="/dashboard/doctor" element={<DoctorDashboard />} />
        <Route path="/dashboard/nurse" element={<NurseDashboard />} />
        <Route path="/dashboard/maternity" element={<MaternityDashboard />} />
        {/* Add other routes */}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

### Example 2: Dynamic Route Registration

```tsx
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import * as pages from './pages';

const dashboardRoutes = [
  { path: '/dashboard/doctor', component: pages.DoctorDashboard },
  { path: '/dashboard/nurse', component: pages.NurseDashboard },
  { path: '/dashboard/maternity', component: pages.MaternityDashboard },
  // ... add all others
];

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<pages.PortalPage />} />
        <Route path="/emr" element={<pages.EMRDashboard />} />
        {dashboardRoutes.map(({ path, component: Component }) => (
          <Route key={path} path={path} element={<Component />} />
        ))}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

## Styling

All components use CSS custom properties (CSS variables) for theming:

```css
:root {
  --neon: #2ecc71;       /* Primary accent color */
  --g: #1a8a4a;         /* Dark green */
  --bg: #030a05;        /* Dark background */
  --t1: #f0fdf4;        /* Text primary */
  --t3: rgba(...);      /* Text tertiary */
  /* ... and more */
}
```

To customize colors, override these variables in your main CSS file.

## Responsiveness

All components are fully responsive with breakpoints at:
- 1100px - Remove patient list sidebar (EMR)
- 768px - Tablet layout
- 480px - Mobile layout

## Features Preserved from HTML

✅ Dark theme with neon green accents  
✅ Animated transitions and micro-interactions  
✅ Sidebar navigation with icons  
✅ Patient list with search (EMR)  
✅ Vital signs monitoring display  
✅ AI risk assessment cards  
✅ SOAP note templates  
✅ Lab results tables  
✅ Medication lists  
✅ Notification system  
✅ Tab-based content switching  
✅ Statistics dashboards  
✅ Mobile responsive design  

## Migration Path

To migrate from old HTML prototypes:

1. **Stop serving HTML files** from `frontend/version 2.0/`
2. **Update navigation links** to point to React routes
3. **Import dashboard components** as needed
4. **Add routing configuration** in App.tsx
5. **Test all pages** and interactions
6. **Deploy React app** using standard Vite build process

## Performance Notes

- Components use React hooks for state management
- Lazy loading supported for route-based code splitting
- CSS files are scoped per component
- Animations use CSS transforms for GPU acceleration
- No external dependencies for styling (pure CSS)

## Next Steps

1. **Connect to API**: Update dashboard components to fetch real data from `/api/` endpoints
2. **Add authentication**: Wrap routes with auth guards
3. **Implement WebSockets**: For real-time data updates (vital signs, notifications)
4. **Add PDF export**: For medical records and reports
5. **Mobile app**: Adapt components for React Native if needed

---

**Converted from**: 29 HTML files in `frontend/version 2.0/`  
**Created**: React components in `frontend/app/src/`  
**Status**: ✅ Complete - Ready for integration  
