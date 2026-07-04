import React from 'react';
import { ModuleDashboard } from "../ModuleDashboard";
import { MaternityModule } from "../modules/MaternityModule";

// EMR Dashboard
export const EMRModuleDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'EMR',
      title: 'Electronic Medical Records',
      icon: '🏥',
      description: 'Complete patient medical records and clinical documentation',
      role: 'Attending Physician',
      stats: [
        { label: 'Active Patients', value: '1,245' },
        { label: 'Pending Orders', value: '38' },
        { label: 'Lab Results', value: '12' },
        { label: 'Alerts', value: '5' },
      ],
      widgets: [],
    }}
  />
);

// Maternity Dashboard — production shell with HTML-aligned clinical pages
export const MaternityDashboard: React.FC = () => <MaternityModule />;

// Laboratory Dashboard
export const LaboratoryDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Laboratory',
      title: 'Laboratory Services',
      icon: '🧪',
      description: 'Laboratory testing and result management',
      role: 'Lab Technician',
      stats: [
        { label: 'Tests Queued', value: '342' },
        { label: 'Completed Today', value: '1,204' },
        { label: 'Critical Values', value: '7' },
        { label: 'Equipment Status', value: '8/8 OK' },
      ],
      widgets: [],
    }}
  />
);

// Radiology Dashboard
export const RadiologyDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Radiology',
      title: 'Radiology & Imaging',
      icon: '🔍',
      description: 'Medical imaging and radiology services',
      role: 'Radiologist',
      stats: [
        { label: 'Studies Pending', value: '24' },
        { label: 'Completed Today', value: '156' },
        { label: 'Critical Findings', value: '3' },
        { label: 'Equipment Status', value: '4/4 OK' },
      ],
      widgets: [],
    }}
  />
);

// Pharmacy Dashboard
export const PharmacyDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Pharmacy',
      title: 'Pharmacy Management',
      icon: '💊',
      description: 'Medication dispensing and inventory management',
      role: 'Pharmacist',
      stats: [
        { label: 'Prescriptions Today', value: '287' },
        { label: 'Dispensed', value: '256' },
        { label: 'Pending Review', value: '31' },
        { label: 'Low Stock Items', value: '12' },
      ],
      widgets: [],
    }}
  />
);

// ICU Dashboard
export const ICUDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'ICU',
      title: 'ICU & Emergency Care',
      icon: '⚡',
      description: 'Intensive care and emergency department management',
      role: 'ICU Manager',
      stats: [
        { label: 'ICU Beds Occupied', value: '18/20' },
        { label: 'ER Patients', value: '34' },
        { label: 'Critical Cases', value: '7' },
        { label: 'Ventilators In Use', value: '5' },
      ],
      widgets: [],
    }}
  />
);

// Surgery Dashboard
export const SurgeryDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Surgery',
      title: 'Surgical Services',
      icon: '✂️',
      description: 'Operating room and surgical scheduling management',
      role: 'Surgical Coordinator',
      stats: [
        { label: 'OR Suites Available', value: '4/6' },
        { label: 'Scheduled Today', value: '8' },
        { label: 'In Progress', value: '2' },
        { label: 'Recovery Patients', value: '12' },
      ],
      widgets: [],
    }}
  />
);

// Rehabilitation Dashboard
export const RehabilitationDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Rehabilitation',
      title: 'Rehabilitation Services',
      icon: '🏃',
      description: 'Patient rehabilitation and physical therapy management',
      role: 'Rehabilitation Specialist',
      stats: [
        { label: 'Active Patients', value: '87' },
        { label: 'Sessions Today', value: '24' },
        { label: 'Completed This Week', value: '142' },
        { label: 'Therapists On Duty', value: '12' },
      ],
      widgets: [],
    }}
  />
);

// Nutrition Dashboard
export const NutritionDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Nutrition',
      title: 'Nutritional Services',
      icon: '🍽️',
      description: 'Meal planning and nutritional care management',
      role: 'Nutritionist',
      stats: [
        { label: 'Patients on Diet Plans', value: '234' },
        { label: 'Meals Prepared Today', value: '567' },
        { label: 'Special Diets', value: '45' },
        { label: 'Consultations', value: '18' },
      ],
      widgets: [],
    }}
  />
);

// Billing Dashboard — live invoices, payments, M-Pesa (see dashboards/BillingDashboard.tsx)
export { BillingDashboard } from "./BillingDashboard";

// Insurance Dashboard — UHIC (UniHealth Insurance Cover 2.0)
export { UHICModule as InsuranceDashboard } from "../modules/UHICModule";
export { UHICModule } from "../modules/UHICModule";

// Inventory Dashboard
export const InventoryDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Inventory',
      title: 'Inventory Management',
      icon: '📦',
      description: 'Medical supplies and equipment inventory tracking',
      role: 'Inventory Manager',
      stats: [
        { label: 'Total Items', value: '2,845' },
        { label: 'Low Stock', value: '34' },
        { label: 'Expiring Soon', value: '12' },
        { label: 'Turn-around Days', value: '2.1' },
      ],
      widgets: [],
    }}
  />
);

// Ambulance/Fleet Dashboard
export const FleetDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Fleet',
      title: 'Ambulance & Fleet Management',
      icon: '🚑',
      description: 'Emergency transport and fleet vehicle management',
      role: 'Fleet Manager',
      stats: [
        { label: 'Vehicles Available', value: '12' },
        { label: 'On Call', value: '8' },
        { label: 'Maintenance Due', value: '2' },
        { label: 'Response Time', value: '8.3 min' },
      ],
      widgets: [],
    }}
  />
);

// Mortuary Dashboard
export const MortuaryDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Mortuary',
      title: 'Mortuary Services',
      icon: '🕯️',
      description: 'Deceased patient management and mortuary operations',
      role: 'Mortuary Manager',
      stats: [
        { label: 'Current Cases', value: '8' },
        { label: 'Pending Release', value: '3' },
        { label: 'Autopsies Pending', value: '2' },
        { label: 'Capacity Used', value: '40%' },
      ],
      widgets: [],
    }}
  />
);

// Telemedicine Dashboard
export const TelemediciDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Telemedicine',
      title: 'Telemedicine Services',
      icon: '📹',
      description: 'Remote consultation and telehealth services',
      role: 'Telemedicine Coordinator',
      stats: [
        { label: 'Active Consultations', value: '12' },
        { label: 'Scheduled Today', value: '28' },
        { label: 'Completed This Week', value: '142' },
        { label: 'Avg Rating', value: '4.8/5' },
      ],
      widgets: [],
    }}
  />
);

// Administration Dashboard
export const AdministrationDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Administration',
      title: 'System Administration',
      icon: '⚙️',
      description: 'System configuration and facility management',
      role: 'System Administrator',
      stats: [
        { label: 'System Uptime', value: '99.98%' },
        { label: 'Active Users', value: '347' },
        { label: 'Database Size', value: '245GB' },
        { label: 'Backup Status', value: '✓ Good' },
      ],
      widgets: [],
    }}
  />
);

// HR & Payroll Dashboard
export const HRDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'HR',
      title: 'HR & Payroll Management',
      icon: '👥',
      description: 'Human resources and staff payroll management',
      role: 'HR Manager',
      stats: [
        { label: 'Total Staff', value: '347' },
        { label: 'On Duty Today', value: '298' },
        { label: 'On Leave', value: '23' },
        { label: 'Payroll Processing', value: '100%' },
      ],
      widgets: [],
    }}
  />
);

// Analytics Dashboard
export const AnalyticsDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Analytics',
      title: 'AI Analytics',
      icon: '📊',
      description: 'Data intelligence and predictive analytics',
      role: 'Analytics Manager',
      stats: [
        { label: 'Data Points', value: '2.3M' },
        { label: 'Insights Generated', value: '156' },
        { label: 'Predictions Accuracy', value: '94.2%' },
        { label: 'Processing Time', value: '1.2s' },
      ],
      widgets: [],
    }}
  />
);

// Research Dashboard
export const ResearchDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Research',
      title: 'Research Management',
      icon: '🔬',
      description: 'Clinical research and study management',
      role: 'Research Director',
      stats: [
        { label: 'Active Studies', value: '18' },
        { label: 'Enrolled Patients', value: '342' },
        { label: 'Publications', value: '24' },
        { label: 'Funding Received', value: 'KES 50M' },
      ],
      widgets: [],
    }}
  />
);

// Patient Dashboard
export const PatientDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Patient',
      title: 'Patient Portal',
      icon: '👤',
      description: 'Personal health records and patient self-service',
      role: 'Patient',
      stats: [
        { label: 'Health Score', value: '78%' },
        { label: 'Appointments', value: '3' },
        { label: 'Medications', value: '4' },
        { label: 'Follow-ups', value: '1' },
      ],
      widgets: [],
    }}
  />
);

// Super Admin Dashboard (unified view)
export const SuperAdminDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'SuperAdmin',
      title: 'Super Admin Console',
      icon: '🏥',
      description: 'Complete system oversight and facility management',
      role: 'Super Administrator',
      stats: [
        { label: 'Total Patients', value: '12,456' },
        { label: 'Daily Revenue', value: 'KES 1.8M' },
        { label: 'System Uptime', value: '99.98%' },
        { label: 'Active Staff', value: '347' },
      ],
      widgets: [],
    }}
  />
);

// Nurse Dashboard
export const NurseDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Nurse',
      title: 'Nursing Station',
      icon: '⚕️',
      description: 'Patient care management and nursing operations',
      role: 'Registered Nurse',
      stats: [
        { label: 'Patients Under Care', value: '24' },
        { label: 'Vital Signs Due', value: '8' },
        { label: 'Medications to Administer', value: '12' },
        { label: 'Call Lights Active', value: '3' },
      ],
      widgets: [],
    }}
  />
);

// Doctor Dashboard
export const DoctorDashboard: React.FC = () => (
  <ModuleDashboard
    config={{
      name: 'Doctor',
      title: 'Doctor\'s Clinic',
      icon: '👨‍⚕️',
      description: 'Clinical practice and patient consultation management',
      role: 'Medical Doctor',
      stats: [
        { label: 'Appointments Today', value: '16' },
        { label: 'Waiting Patients', value: '4' },
        { label: 'Pending Results', value: '7' },
        { label: 'Outstanding Tasks', value: '5' },
      ],
      widgets: [],
    }}
  />
);
