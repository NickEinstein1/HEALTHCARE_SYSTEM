# React Component Integration Guide

## Quick Start: Adding Components to Your App

### Step 1: Import Components

Add the following imports to your `App.tsx` file:

```typescript
import {
  PortalPage,
  EMRDashboard,
  EMRModuleDashboard,
  DoctorDashboard,
  NurseDashboard,
  PatientDashboard,
  AdminDashboard,
  PharmacyDashboard,
  LabDashboard,
  // Import all dashboards you need
} from '@/pages';
```

### Step 2: Add Routes

Update your Routes in App.tsx:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Landing/Portal Page */}
        <Route path="/" element={<PortalPage />} />
        
        {/* Authentication Pages (keep existing) */}
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/register" element={<CreateAccountPage />} />
        
        {/* Dashboard Pages */}
        <Route path="/dashboard/emr" element={<EMRDashboard />} />
        <Route path="/dashboard/doctor" element={<DoctorDashboard />} />
        <Route path="/dashboard/nurse" element={<NurseDashboard />} />
        <Route path="/dashboard/patient" element={<PatientDashboard />} />
        <Route path="/dashboard/pharmacy" element={<PharmacyDashboard />} />
        <Route path="/dashboard/lab" element={<LabDashboard />} />
        <Route path="/dashboard/admin" element={<AdminDashboard />} />
        {/* Add more dashboard routes as needed */}
      </Routes>
    </BrowserRouter>
  );
}
```

### Step 3: Dynamic Routing (Optional - Recommended)

For cleaner maintenance, use dynamic routing:

```typescript
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import * as DashboardComponents from '@/pages/dashboards';

const DASHBOARD_ROUTES = {
  emr: 'EMRModuleDashboard',
  doctor: 'DoctorDashboard',
  nurse: 'NurseDashboard',
  patient: 'PatientDashboard',
  pharmacy: 'PharmacyDashboard',
  lab: 'LabDashboard',
  admin: 'AdminDashboard',
  // Add all 24 dashboards here
};

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<PortalPage />} />
        <Route path="/sign-in" element={<SignInPage />} />
        <Route path="/register" element={<CreateAccountPage />} />
        
        {/* Dynamic dashboard routes */}
        {Object.entries(DASHBOARD_ROUTES).map(([path, componentName]) => {
          const Component = DashboardComponents[componentName as keyof typeof DashboardComponents];
          return (
            <Route
              key={path}
              path={`/dashboard/${path}`}
              element={<Component />}
            />
          );
        })}
      </Routes>
    </BrowserRouter>
  );
}
```

### Step 4: Use Components in Custom Pages

Using components in your own pages:

```typescript
import { DashboardLayout } from '@/components/layout';
import { Card, Tabs } from '@/components/ui';

export function CustomPage() {
  return (
    <DashboardLayout
      pageTitle="My Custom Page"
      pageIcon="📋"
      currentSection="CLINICAL"
    >
      <Card 
        title="Card Title"
        variant="elevated"
      >
        Card content here
      </Card>

      <Tabs
        tabs={[
          { id: 'tab1', label: 'Tab 1', content: <div>Content 1</div> },
          { id: 'tab2', label: 'Tab 2', content: <div>Content 2</div> },
        ]}
      />
    </DashboardLayout>
  );
}
```

## Available Dashboards

### Main Pages
- `PortalPage` - Landing page with all modules
- `EMRDashboard` - Full electronic medical records
- `ModuleDashboard` - Generic template for custom dashboards

### 24 Role/Department Dashboards

**CLINICAL**
1. `EMRModuleDashboard` - Electronic Medical Records (🏥)
2. `MaternityDashboard` - Maternal & Neonatal Care (❤️)
3. `LaboratoryDashboard` - Laboratory Services (🧪)
4. `RadiologyDashboard` - Radiology & Imaging (🔍)
5. `PharmacyDashboard` - Pharmacy Management (💊)
6. `ICUDashboard` - ICU & Emergency Care (⚡)
7. `SurgeryDashboard` - Surgical Services (✂️)
8. `RehabilitationDashboard` - Rehabilitation Services (🏃)
9. `NutritionDashboard` - Nutritional Services (🍽️)

**OPERATIONS**
10. `BillingDashboard` - Financial Management (💰)
11. `InsuranceDashboard` - Insurance Management (🛡️)
12. `InventoryDashboard` - Inventory Management (📦)
13. `FleetDashboard` - Ambulance & Fleet Management (🚑)
14. `MortuaryDashboard` - Mortuary Services (🕯️)

**MANAGEMENT**
15. `TelemediciDashboard` - Telemedicine Services (📹)
16. `AdministrationDashboard` - System Administration (⚙️)
17. `HRDashboard` - HR & Payroll Management (👥)
18. `AnalyticsDashboard` - AI Analytics (📊)
19. `ResearchDashboard` - Research Management (🔬)

**ROLES**
20. `DoctorDashboard` - Doctor's Clinic (👨‍⚕️)
21. `NurseDashboard` - Nursing Station (⚕️)
22. `PatientDashboard` - Patient Portal (👤)
23. `AdminDashboard` - Admin Portal (⚙️)
24. `SuperAdminDashboard` - Super Admin Console (🏥)

## Layout Components

### DashboardLayout

Provides the main dashboard wrapper with sidebar and topbar.

```typescript
<DashboardLayout
  pageTitle="Page Title"
  pageIcon="📋"
  currentSection="CLINICAL"
  userRole="Attending Physician"
  userName="Dr. Smith"
>
  {/* Page content goes here */}
</DashboardLayout>
```

**Props:**
- `children` (React.ReactNode) - Page content
- `pageTitle` (string) - Page/module title
- `pageIcon` (string, optional) - Icon/emoji for page
- `currentSection` (string, optional) - Section name (CLINICAL, OPERATIONS, etc.)
- `userRole` (string, optional) - User's role
- `userName` (string, optional) - User's name

## UI Components

### Card Component

Reusable card container with optional title, subtitle, and icon.

```typescript
<Card
  title="Card Title"
  subtitle="Card Subtitle"
  icon={<Heart size={20} />}
  variant="elevated"
  action={<button>Action</button>}
>
  Card content
</Card>
```

**Props:**
- `children` (React.ReactNode) - Card content
- `title` (string, optional) - Card title
- `subtitle` (string, optional) - Card subtitle
- `icon` (React.ReactNode, optional) - Icon to display
- `variant` ('default' | 'elevated' | 'ai' | 'danger') - Card style
- `action` (React.ReactNode, optional) - Action element
- `onClick` (function, optional) - Click handler
- `className` (string, optional) - Additional CSS classes

**Variants:**
- `default` - Light border style
- `elevated` - Shadowed style
- `ai` - Purple gradient (for AI features)
- `danger` - Red accent style

### Tabs Component

Tabbed interface with automatic active state management.

```typescript
<Tabs
  tabs={[
    {
      id: 'overview',
      label: 'Overview',
      icon: <Home size={18} />,
      content: <OverviewContent />
    },
    {
      id: 'details',
      label: 'Details',
      icon: <File size={18} />,
      content: <DetailsContent />
    },
  ]}
  defaultTab="overview"
  onChange={(tabId) => console.log('Tab changed to:', tabId)}
/>
```

**Props:**
- `tabs` (TabItem[]) - Array of tab objects
- `defaultTab` (string, optional) - ID of tab to show by default
- `onChange` (function, optional) - Callback when tab changes

**TabItem:**
- `id` (string) - Unique tab identifier
- `label` (string) - Tab label text
- `icon` (React.ReactNode, optional) - Tab icon
- `content` (React.ReactNode) - Tab content

## Import Paths

All components can be imported from the barrel exports:

```typescript
// From pages
import { PortalPage, EMRDashboard, ModuleDashboard } from '@/pages';
import { DoctorDashboard, NurseDashboard } from '@/pages/dashboards';

// From components
import { DashboardLayout } from '@/components/layout';
import { Card, Tabs } from '@/components/ui';

// Or use barrel export
import { DashboardLayout, Card, Tabs } from '@/components';
```

## Working with Sample Data

Components come with sample data for testing:

```typescript
// EMRDashboard includes 6 sample patients:
// - Mary Wanjiku (KE-00847)
// - James Mwangi (KE-00945)
// - Patricia Kipchoge (KE-00756)
// - David Omondi (KE-00832)
// - Grace Koech (KE-00654)
// - Samuel Kipchoge (KE-00721)

// For production, replace sample data with real API calls:
const [patients, setPatients] = useState([]);

useEffect(() => {
  fetch('/api/patients')
    .then(res => res.json())
    .then(data => setPatients(data));
}, []);
```

## Styling & Theming

All components use CSS custom properties for theming:

```css
:root {
  --color-bg-primary: #030a05;
  --color-accent: #2ecc71;
  --color-text-primary: #ffffff;
  --color-text-secondary: #999999;
  --font-primary: 'Sora', sans-serif;
  --font-mono: 'JetBrains Mono', monospace;
}
```

To customize colors globally, override these properties in your main stylesheet:

```css
:root {
  --color-bg-primary: #0a0e1a;
  --color-accent: #00ff88;
  --color-text-primary: #f5f5f5;
  --color-text-secondary: #a0a0a0;
}
```

## Common Integration Issues

### Issue: Components not found
**Solution:** Make sure you're importing from the correct paths:
```typescript
// Correct
import { DashboardLayout } from '@/components/layout';
import { Card, Tabs } from '@/components/ui';

// These should use @ alias configured in vite.config.ts
```

### Issue: CSS not loading
**Solution:** Ensure all CSS files are imported in components:
- `DashboardLayout.tsx` imports `DashboardLayout.css`
- `Card.tsx` imports `Card.css`
- `Tabs.tsx` imports `Tabs.css`
- All page components import their CSS files

### Issue: TypeScript errors with props
**Solution:** Use the exported interfaces:
```typescript
import type { DashboardLayoutProps, CardProps, TabsProps } from '@/components';
```

## Next Steps

1. Add all import statements to `App.tsx`
2. Configure routes for all dashboards
3. Test navigation between pages
4. Connect components to backend API endpoints
5. Deploy to production

---

**All HTML pages are now fully integrated into React!** 🎉

