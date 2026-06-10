import React from 'react';
import { Heart, Droplet, Aperture, Package, Zap, Scissors, Activity, Coffee, DollarSign, Shield, Box, Truck, Moon, Video, Settings, Users, BarChart2, Search, User } from 'feather-icons-react';
import './PortalPage.css';

export const PortalPage: React.FC = () => {
  const modules = [
    { icon: '📋', name: 'EMR / EHR', desc: 'Electronic Medical Records', tag: 'CLINICAL', href: '#/emr' },
    { icon: '❤️', name: 'Maternity & NICU', desc: 'Maternal & Neonatal Care', tag: 'CLINICAL', href: '#' },
    { icon: '🩸', name: 'Laboratory', desc: 'Lab Tests & Results', tag: 'CLINICAL', href: '#' },
    { icon: '🔍', name: 'Radiology', desc: 'Imaging & Scans', tag: 'CLINICAL', href: '#' },
    { icon: '💊', name: 'Pharmacy', desc: 'Medication Management', tag: 'CLINICAL', href: '#' },
    { icon: '⚡', name: 'ICU & Emergency', desc: 'Critical Care', tag: 'CLINICAL', href: '#' },
    { icon: '✂️', name: 'Surgery', desc: 'Surgical Operations', tag: 'CLINICAL', href: '#' },
    { icon: '🏃', name: 'Rehabilitation', desc: 'Patient Recovery', tag: 'CLINICAL', href: '#' },
    { icon: '🍽️', name: 'Nutrition', desc: 'Nutritional Care', tag: 'CLINICAL', href: '#' },
    { icon: '💰', name: 'Billing', desc: 'Financial Management', tag: 'OPERATIONS', href: '#' },
    { icon: '🛡️', name: 'Insurance', desc: 'Insurance Claims', tag: 'OPERATIONS', href: '#' },
    { icon: '📦', name: 'Inventory', desc: 'Stock Management', tag: 'OPERATIONS', href: '#' },
    { icon: '🚑', name: 'Ambulance', desc: 'Fleet Management', tag: 'OPERATIONS', href: '#' },
    { icon: '🕯️', name: 'Mortuary', desc: 'Mortuary Services', tag: 'OPERATIONS', href: '#' },
    { icon: '📹', name: 'Telemedicine', desc: 'Remote Consultation', tag: 'OPERATIONS', href: '#' },
    { icon: '⚙️', name: 'Administration', desc: 'System Management', tag: 'MANAGEMENT', href: '#' },
    { icon: '👥', name: 'HR & Payroll', desc: 'Personnel Management', tag: 'MANAGEMENT', href: '#' },
    { icon: '📊', name: 'AI Analytics', desc: 'Data Intelligence', tag: 'MANAGEMENT', href: '#' },
    { icon: '🔬', name: 'Research', desc: 'Clinical Research', tag: 'MANAGEMENT', href: '#' },
    { icon: '👤', name: 'Patient Portal', desc: 'Patient Dashboard', tag: 'MANAGEMENT', href: '#' },
  ];

  const authPortals = [
    {
      icon: '👨‍⚕️',
      title: 'Clinician Portal',
      desc: 'Access EMR, patient data, orders, and clinical tools',
      url: '#/emr',
    },
    {
      icon: '🏥',
      title: 'Admin Portal',
      desc: 'System administration and facility management',
      url: '#/admin',
    },
  ];

  const stats = [
    { value: '20', label: 'Modules' },
    { value: '5K+', label: 'Users' },
    { value: '1.2M', label: 'Patients' },
    { value: '99.9%', label: 'Uptime' },
  ];

  return (
    <div className="portal-page">
      {/* Background Grid */}
      <div className="portal-grid-bg"></div>

      {/* Main Content */}
      <div className="portal-wrap">
        {/* HEADER */}
        <header className="portal-hdr">
          <div className="logo-ring">
            <svg width="34" height="34" viewBox="0 0 34 34" fill="none">
              <path d="M17 4v8M17 22v8M4 17h8M22 17h8" stroke="#2ecc71" strokeWidth="2.5" strokeLinecap="round"/>
              <rect x="10" y="10" width="14" height="14" rx="3.5" fill="rgba(46,204,113,.12)" stroke="#2ecc71" strokeWidth="1.5"/>
              <circle cx="17" cy="17" r="3.5" fill="#2ecc71"/>
            </svg>
          </div>
          <h1>UniHealth <em>360</em></h1>
          <p className="portal-sub">
            National AI-Powered Healthcare Operating System<br/>
            Enterprise Portal · Full Module Build · v4.0
          </p>
          <div className="stripe"></div>
          <div className="meta-chips">
            <div className="chip ch-g"><span className="pdot"></span>ALL SYSTEMS LIVE</div>
            <div className="chip ch-g">20 Modules Built</div>
            <div className="chip ch-b">FHIR R5 · JWT · RBAC</div>
            <div className="chip ch-pk">Maternity AI Active</div>
          </div>
        </header>

        {/* CTA BUTTONS */}
        <div className="cta-box">
          <a href="#/emr" className="btn-main">
            <span>🚀</span> Launch Clinician Portal
          </a>
          <a href="#/admin" className="btn-ghost">
            ⚙️ Admin Console
          </a>
        </div>

        {/* STATS BAR */}
        <div className="stats-bar">
          {stats.map((stat, idx) => (
            <div key={idx} className="stat-c">
              <div className="stat-v">{stat.value}</div>
              <div className="stat-l">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* AUTH SECTION */}
        <div className="sec-label">Access Portals</div>
        <div className="auth-grid">
          {authPortals.map((portal, idx) => (
            <a key={idx} href={portal.url} className="auth-card">
              <div className="auth-icon">{portal.icon}</div>
              <div>
                <div className="auth-title">{portal.title}</div>
                <div className="auth-desc">{portal.desc}</div>
                <div className="auth-url">→ Enter Portal</div>
              </div>
            </a>
          ))}
        </div>

        {/* MODULES SECTION */}
        <div className="sec-label">All Modules</div>
        <div className="grid">
          {modules.map((module, idx) => (
            <a key={idx} href={module.href} className="card">
              <div className="card-icon">{module.icon}</div>
              <div className="card-name">{module.name}</div>
              <div className="card-desc">{module.desc}</div>
              <span className="card-tag">{module.tag}</span>
            </a>
          ))}
        </div>

        {/* FOOTER */}
        <footer className="portal-foot">
          <div>UniHealth 360 Enterprise · FHIR R5 · HIPAA Compliant</div>
          <div>Build v4.0 · Last Updated: {new Date().toLocaleDateString()}</div>
          <div><a href="#" className="footer-link">Documentation</a> · <a href="#" className="footer-link">API Docs</a> · <a href="#" className="footer-link">Support</a></div>
        </footer>
      </div>
    </div>
  );
};
