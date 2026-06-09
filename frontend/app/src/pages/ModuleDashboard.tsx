import React, { useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import './ModuleDashboard.css';

export interface ModuleConfig {
  name: string;
  title: string;
  icon: string;
  description: string;
  role: string;
  stats: Array<{ label: string; value: string }>;
  widgets: Array<{
    title: string;
    content: string;
    metric?: string;
  }>;
}

export interface ModuleDashboardProps {
  config: ModuleConfig;
}

export const ModuleDashboard: React.FC<ModuleDashboardProps> = ({ config }) => {
  const [activeTab, setActiveTab] = useState('overview');

  const dashboardModules: { [key: string]: ModuleConfig } = {
    emr: {
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
      widgets: [
        {
          title: 'Today\'s Schedule',
          content: '8 appointments scheduled',
          metric: '3 completed',
        },
        {
          title: 'Patient Queue',
          content: 'Waiting room: 4 patients',
          metric: '2 in consultation',
        },
        {
          title: 'Critical Alerts',
          content: 'High BP readings detected',
          metric: '3 patients',
        },
        {
          title: 'Lab Processing',
          content: 'Samples in queue',
          metric: '45 samples',
        },
      ],
    },
    maternity: {
      name: 'Maternity & NICU',
      title: 'Maternal & Neonatal Care',
      icon: '❤️',
      description: 'Maternity and neonatal intensive care unit management',
      role: 'OB/GYN Specialist',
      stats: [
        { label: 'Expecting Mothers', value: '156' },
        { label: 'NICU Admissions', value: '24' },
        { label: 'Deliveries Today', value: '6' },
        { label: 'Critical Cases', value: '3' },
      ],
      widgets: [
        {
          title: 'Delivery Suite Status',
          content: 'All suites operational',
          metric: '3/3 in use',
        },
        {
          title: 'NICU Capacity',
          content: 'Current occupancy',
          metric: '24/30 beds',
        },
        {
          title: 'Vital Signs Monitoring',
          content: 'All mothers stable',
          metric: '156 monitored',
        },
        {
          title: 'Birth Certificates',
          content: 'Pending processing',
          metric: '8 documents',
        },
      ],
    },
    laboratory: {
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
      widgets: [
        {
          title: 'Analyzer Status',
          content: 'All machines operational',
          metric: '8 active',
        },
        {
          title: 'Sample Receipt',
          content: 'Currently processing',
          metric: '45 samples',
        },
        {
          title: 'Quality Control',
          content: 'Daily QC checks',
          metric: '✓ Passed',
        },
        {
          title: 'Turnaround Time',
          content: 'Average processing',
          metric: '2.3 hours',
        },
      ],
    },
    pharmacy: {
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
      widgets: [
        {
          title: 'Prescription Queue',
          content: 'Waiting for dispensing',
          metric: '31 pending',
        },
        {
          title: 'Inventory Status',
          content: 'Low stock alerts',
          metric: '12 items',
        },
        {
          title: 'Drug Interactions',
          content: 'Potential conflicts checked',
          metric: '0 flagged',
        },
        {
          title: 'Controlled Substances',
          content: 'Audit trail complete',
          metric: '✓ Compliant',
        },
      ],
    },
    billing: {
      name: 'Billing',
      title: 'Financial Management',
      icon: '💰',
      description: 'Billing, invoicing, and financial tracking',
      role: 'Billing Officer',
      stats: [
        { label: 'Invoices Today', value: '156' },
        { label: 'Amount Billed', value: 'KES 2.3M' },
        { label: 'Unpaid Invoices', value: '34' },
        { label: 'Collection Rate', value: '94%' },
      ],
      widgets: [
        {
          title: 'Daily Revenue',
          content: 'Amount collected today',
          metric: 'KES 1.8M',
        },
        {
          title: 'Outstanding Balance',
          content: 'Accounts receivable',
          metric: 'KES 450K',
        },
        {
          title: 'Insurance Claims',
          content: 'Pending approval',
          metric: '12 claims',
        },
        {
          title: 'Payment Methods',
          content: 'Cash vs Card payments',
          metric: '60/40',
        },
      ],
    },
    admin: {
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
      widgets: [
        {
          title: 'System Health',
          content: 'All services operational',
          metric: '15/15 OK',
        },
        {
          title: 'Disk Usage',
          content: 'Storage capacity',
          metric: '68% used',
        },
        {
          title: 'Active Licenses',
          content: 'Valid subscriptions',
          metric: '450/500',
        },
        {
          title: 'API Performance',
          content: 'Response time',
          metric: '124ms avg',
        },
      ],
    },
  };

  const moduleKey = config.name.toLowerCase();
  const module = dashboardModules[moduleKey] || config;

  return (
    <DashboardLayout
      pageTitle={module.title}
      pageIcon={module.icon}
      currentSection={module.name}
      userRole={module.role}
    >
      <div className="module-dashboard">
        {/* HEADER */}
        <Card className="module-header">
          <h2 className="module-title">{module.title}</h2>
          <p className="module-desc">{module.description}</p>
        </Card>

        {/* STATS */}
        <div className="stats-grid">
          {module.stats.map((stat, idx) => (
            <Card key={idx} className="stat-card">
              <div className="stat-value">{stat.value}</div>
              <div className="stat-label">{stat.label}</div>
            </Card>
          ))}
        </div>

        {/* TABS */}
        <div className="module-tabs">
          <button
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`tab-btn ${activeTab === 'operations' ? 'active' : ''}`}
            onClick={() => setActiveTab('operations')}
          >
            Operations
          </button>
          <button
            className={`tab-btn ${activeTab === 'reports' ? 'active' : ''}`}
            onClick={() => setActiveTab('reports')}
          >
            Reports
          </button>
        </div>

        {/* TAB CONTENT - OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="tab-content">
            <div className="widgets-grid">
              {module.widgets.map((widget, idx) => (
                <Card key={idx} title={widget.title} action={<span className="metric">{widget.metric}</span>}>
                  <p className="widget-content">{widget.content}</p>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* TAB CONTENT - OPERATIONS */}
        {activeTab === 'operations' && (
          <Card title="Operational Dashboard">
            <div className="operations-content">
              <div style={{fontSize: '11.5px', color: 'rgba(240, 253, 244, 0.72)', lineHeight: 1.6}}>
                <h3 style={{marginBottom: 10, color: '#f0fdf4'}}>Current Operations</h3>
                <ul style={{paddingLeft: 20, listStyle: 'disc'}}>
                  <li>All systems operational and performing normally</li>
                  <li>No critical incidents reported</li>
                  <li>Scheduled maintenance completed successfully</li>
                  <li>All performance targets being met</li>
                  <li>Staff availability: 98%</li>
                </ul>
              </div>
            </div>
          </Card>
        )}

        {/* TAB CONTENT - REPORTS */}
        {activeTab === 'reports' && (
          <Card title="Reports & Analytics">
            <div className="reports-content">
              <div style={{fontSize: '11.5px', color: 'rgba(240, 253, 244, 0.72)', lineHeight: 1.6}}>
                <h3 style={{marginBottom: 10, color: '#f0fdf4'}}>Available Reports</h3>
                <ul style={{paddingLeft: 20, listStyle: 'disc'}}>
                  <li>Daily Performance Report</li>
                  <li>Monthly Summary & Trends</li>
                  <li>Resource Utilization Analysis</li>
                  <li>Compliance & Audit Trail</li>
                  <li>Financial Summary & Forecasting</li>
                </ul>
                <p style={{marginTop: 10}}>📊 <a href="#" style={{color: 'var(--neon)', textDecoration: 'none'}}>Download Reports</a></p>
              </div>
            </div>
          </Card>
        )}
      </div>
    </DashboardLayout>
  );
};
