import React, { useEffect, useState } from 'react';
import { Menu, Bell, LogOut, ChevronRight } from 'feather-icons-react';
import './DashboardLayout.css';

export interface DashboardLayoutProps {
  children: React.ReactNode;
  pageTitle: string;
  pageIcon?: string;
  currentSection?: string;
  userRole?: string;
  userName?: string;
}

export const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  pageTitle,
  pageIcon = '🏥',
  currentSection = 'EMR',
  userRole = 'Attending Physician',
  userName = 'Dr. Wanjiku',
}) => {
  const [time, setTime] = useState<string>('');
  const [notificationCount, setNotificationCount] = useState(3);
  const [showNotifications, setShowNotifications] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const navigationItems = [
    { label: 'CLINICAL', items: [
      { icon: '📋', label: 'EMR / EHR', href: '#' },
      { icon: '❤️', label: 'Maternity & NICU', href: '#' },
      { icon: '🩸', label: 'Laboratory', href: '#' },
      { icon: '🔍', label: 'Radiology', href: '#' },
      { icon: '💊', label: 'Pharmacy', href: '#' },
      { icon: '⚡', label: 'ICU & Emergency', href: '#' },
      { icon: '✂️', label: 'Surgery', href: '#' },
      { icon: '🏃', label: 'Rehabilitation', href: '#' },
      { icon: '🍽️', label: 'Nutrition', href: '#' },
    ]},
    { label: 'OPERATIONS', items: [
      { icon: '💰', label: 'Billing', href: '#' },
      { icon: '🛡️', label: 'Insurance', href: '#' },
      { icon: '📦', label: 'Inventory', href: '#' },
      { icon: '🚑', label: 'Ambulance', href: '#' },
      { icon: '🕯️', label: 'Mortuary', href: '#' },
      { icon: '📹', label: 'Telemedicine', href: '#' },
    ]},
    { label: 'MANAGEMENT', items: [
      { icon: '⚙️', label: 'Administration', href: '#' },
      { icon: '👥', label: 'HR & Payroll', href: '#' },
      { icon: '📊', label: 'AI Analytics', href: '#' },
      { icon: '🔬', label: 'Research', href: '#' },
      { icon: '👤', label: 'Patient Portal', href: '#' },
    ]},
  ];

  return (
    <div className="dashboard-app">
      {/* SIDEBAR */}
      <nav className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="sb-brand">
          <div className="sb-logo">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 2v4M8 10v4M2 8h4M10 8h4" stroke="#2ecc71" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </div>
          <div>
            <div className="sb-nm">UniHealth 360</div>
            <div className="sb-tag">Healthcare OS</div>
          </div>
        </div>

        <div className="sb-user">
          <div className="sbu-av">{userName.split(' ').map(n => n[0]).join('')}</div>
          <div>
            <div className="sbu-nm">{userName}</div>
            <div className="sbu-rl">{userRole}</div>
          </div>
        </div>

        <div className="sb-nav">
          {navigationItems.map((section) => (
            <div key={section.label}>
              <div className="sb-sect">{section.label}</div>
              {section.items.map((item) => (
                <a key={item.label} className="sb-lnk active" href={item.href}>
                  <span>{item.icon}</span>
                  {item.label}
                </a>
              ))}
            </div>
          ))}
        </div>

        <div className="sb-ft">
          <a href="#" className="sb-back">
            <LogOut size={11} /> Sign Out
          </a>
          <div className="sb-ver">UniHealth 360 v4.0 · FHIR R5 · HIPAA</div>
        </div>
      </nav>

      {/* MAIN CONTENT */}
      <div className="main">
        {/* TOPBAR */}
        <div className="topbar">
          <button 
            className="sidebar-toggle" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            <Menu size={18} />
          </button>
          <div className="tb-page">
            <span style={{ fontSize: '16px' }}>{pageIcon}</span>
            {pageTitle}
          </div>
          <div className="tb-badge bg">
            <span className="pdot"></span>LIVE · FHIR R5
          </div>
          <button className="tb-btn bp">
            <span>➕</span> New Patient
          </button>
          <div 
            className="tb-ic"
            onClick={() => setShowNotifications(!showNotifications)}
            role="button"
            tabIndex={0}
          >
            <Bell size={13} />
            <div className="nn">{notificationCount}</div>
          </div>
          <div className="clk">{time}</div>
        </div>

        {/* CONTENT */}
        <div className="content">
          {children}
        </div>

        {/* NOTIFICATIONS PANEL */}
        {showNotifications && (
          <div className="notif-panel">
            <div className="ni">Patient Mary Wanjiku: BP spike detected</div>
            <div className="ni">Lab results ready for review - 5 patients</div>
            <div className="ni">System maintenance scheduled for tonight at 22:00</div>
          </div>
        )}
      </div>
    </div>
  );
};
