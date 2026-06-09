import React, { useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card } from '../components/ui/Card';
import { Tabs } from '../components/ui/Tabs';
import './EMRDashboard.css';

export const EMRDashboard: React.FC = () => {
  const [selectedPatient, setSelectedPatient] = useState({
    name: 'Mary Wanjiku',
    id: 'KE-00847',
    dob: '12 Mar 1993',
    gender: 'F',
    age: 32,
    weight: 68,
    bloodType: 'B+',
    location: 'Nairobi',
    status: 'High Risk',
  });

  const [searchTerm, setSearchTerm] = useState('');

  const patients = [
    { initials: 'MW', name: 'Mary Wanjiku', id: 'KE-00847', age: 32, gender: 'F', condition: 'Hypertension', status: 'High Risk' },
    { initials: 'JO', name: 'James Omondi', id: 'KE-00848', age: 45, gender: 'M', condition: 'Diabetes T2', status: 'Follow-up' },
    { initials: 'GK', name: 'Grace Kamau', id: 'KE-00849', age: 28, gender: 'F', condition: 'ANC Visit', status: 'Stable' },
    { initials: 'PN', name: 'Peter Njoroge', id: 'KE-00850', age: 62, gender: 'M', condition: 'Cardiac', status: 'Critical' },
    { initials: 'AM', name: 'Alice Muthoni', id: 'KE-00851', age: 55, gender: 'F', condition: 'Oncology', status: 'In Treatment' },
    { initials: 'SK', name: 'Samuel Kariuki', id: 'KE-00852', age: 8, gender: 'M', condition: 'Paediatric', status: 'Stable' },
  ];

  const filteredPatients = patients.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.id.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const tabsContent = [
    {
      id: 'notes',
      label: 'SOAP Notes',
      icon: '📝',
      content: (
        <Card title="SOAP Clinical Note" action={<button className="btn bp btn-sm">💾 Save Note</button>}>
          <div className="form-group">
            <label className="form-label">Subjective</label>
            <textarea className="form-input" placeholder="Patient's symptoms and complaints..."></textarea>
          </div>
          <div className="form-group">
            <label className="form-label">Objective</label>
            <textarea className="form-input" placeholder="Physical examination findings..."></textarea>
          </div>
          <div className="form-group">
            <label className="form-label">Assessment</label>
            <textarea className="form-input" placeholder="Clinical assessment..."></textarea>
          </div>
          <div className="form-group">
            <label className="form-label">Plan</label>
            <textarea className="form-input" placeholder="Treatment plan..."></textarea>
          </div>
        </Card>
      ),
    },
    {
      id: 'labs',
      label: 'Lab Results',
      icon: '🧪',
      content: (
        <Card title="Recent Lab Results">
          <div className="results-table">
            <table>
              <thead>
                <tr>
                  <th>Test</th>
                  <th>Result</th>
                  <th>Ref Range</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>HbA1c</td>
                  <td>7.8%</td>
                  <td>&lt;5.7%</td>
                  <td><span className="tag tr">High</span></td>
                  <td>2024-01-15</td>
                </tr>
                <tr>
                  <td>Creatinine</td>
                  <td>1.2 mg/dL</td>
                  <td>0.7-1.3</td>
                  <td><span className="tag tg">Normal</span></td>
                  <td>2024-01-15</td>
                </tr>
                <tr>
                  <td>Glucose</td>
                  <td>145 mg/dL</td>
                  <td>70-100</td>
                  <td><span className="tag tr">High</span></td>
                  <td>2024-01-15</td>
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      ),
    },
    {
      id: 'meds',
      label: 'Medications',
      icon: '💊',
      content: (
        <Card title="Active Medications">
          <div className="med-list">
            <div className="med-item">
              <div className="med-name">Lisinopril</div>
              <div className="med-info">10 mg · Once daily · Oral</div>
              <div className="med-indication">Hypertension management</div>
            </div>
            <div className="med-item">
              <div className="med-name">Metformin</div>
              <div className="med-info">500 mg · Twice daily · Oral</div>
              <div className="med-indication">Type 2 Diabetes</div>
            </div>
            <div className="med-item">
              <div className="med-name">Atorvastatin</div>
              <div className="med-info">20 mg · Once daily · Oral</div>
              <div className="med-indication">Cholesterol management</div>
            </div>
          </div>
        </Card>
      ),
    },
    {
      id: 'history',
      label: 'History',
      icon: '📋',
      content: (
        <Card title="Medical History">
          <div className="history-list">
            <div className="history-item">
              <div className="history-date">2023-11</div>
              <div className="history-title">Hypertension Diagnosis</div>
              <div className="history-desc">Patient diagnosed with Stage II hypertension</div>
            </div>
            <div className="history-item">
              <div className="history-date">2023-09</div>
              <div className="history-title">Diabetes Screening</div>
              <div className="history-desc">Type 2 Diabetes diagnosis confirmed</div>
            </div>
            <div className="history-item">
              <div className="history-date">2023-06</div>
              <div className="history-title">Annual Physical</div>
              <div className="history-desc">Routine physical examination completed</div>
            </div>
          </div>
        </Card>
      ),
    },
  ];

  return (
    <DashboardLayout
      pageTitle="Electronic Medical Records"
      pageIcon="🏥"
      currentSection="EMR"
      userName="Dr. Wanjiku"
      userRole="Attending Physician"
    >
      <div className="emr-layout">
        {/* PATIENT LIST */}
        <div className="pat-list">
          <div className="pl-hd">
            <div className="pl-title">Patient List</div>
            <div className="pl-srch">
              <span>🔍</span>
              <input
                placeholder="Search name / ID…"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                aria-label="Search patients"
              />
            </div>
          </div>
          <div className="pl-body">
            {filteredPatients.map((patient, idx) => (
              <div
                key={idx}
                className={`pat-item ${selectedPatient.id === patient.id ? 'sel' : ''}`}
                onClick={() => setSelectedPatient({
                  name: patient.name,
                  id: patient.id,
                  dob: '12 Mar 1993',
                  gender: patient.gender,
                  age: patient.age,
                  weight: 68,
                  bloodType: 'B+',
                  location: 'Nairobi',
                  status: patient.status,
                })}
                role="button"
                tabIndex={0}
              >
                <div className="pat-av">{patient.initials}</div>
                <div>
                  <div className="pat-nm">{patient.name}</div>
                  <div className="pat-id">{patient.id} · {patient.gender} · {patient.age}y</div>
                  <span className={`pat-tag pt-${patient.status === 'High Risk' ? 'r' : patient.status === 'Stable' ? 'g' : 'a'}`}>
                    {patient.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* EMR MAIN */}
        <div className="emr-main">
          {/* Patient Header */}
          <Card>
            <div className="emr-header">
              <div>
                <h2 className="ph-name">{selectedPatient.name}</h2>
                <div className="ph-meta">
                  <span>📅 DOB: {selectedPatient.dob}</span>
                  <span>#️⃣ ID: {selectedPatient.id}</span>
                  <span>📍 {selectedPatient.location}</span>
                  <span>🩸 {selectedPatient.bloodType}</span>
                  <span>⚖️ {selectedPatient.weight} kg</span>
                </div>
                <div className="ph-alerts">
                  <div className="al-chip al-r">⚠️ Penicillin Allergy</div>
                  <div className="al-chip al-a">💓 Hypertension Active</div>
                  <div className="al-chip al-r">⚡ Diabetic</div>
                </div>
              </div>
              <div className="ph-vitals">
                <div className="vital hb-vital"><div className="vital-v">72</div><div className="vital-l">HR bpm</div></div>
                <div className="vital"><div className="vital-v" style={{color: '#60a5fa'}}>140/90</div><div className="vital-l">BP mmHg</div></div>
                <div className="vital"><div className="vital-v" style={{color: '#f59e0b'}}>36.8</div><div className="vital-l">Temp °C</div></div>
                <div className="vital"><div className="vital-v" style={{color: '#14b8a6'}}>98</div><div className="vital-l">SpO₂ %</div></div>
              </div>
            </div>
          </Card>

          {/* AI Risk Card */}
          <Card variant="ai" title="🤖 AI Clinical Summary & Risk Score" subtitle="UniHealth AI Engine v4.2 · Updated 2 min ago">
            <div className="ai-content">
              <div style={{fontSize: '11.5px', color: 'rgba(240, 253, 244, 0.72)', lineHeight: 1.6, marginBottom: 12}}>
                Patient {selectedPatient.name} presents elevated cardiovascular risk. BP consistently elevated (avg 142/91 over 30 days). HbA1c trending up — recommend glycaemic review. Penicillin allergy flagged for all antibiotic orders.
              </div>
              <div style={{fontSize: '9px', color: 'rgba(240, 253, 244, 0.2)', marginBottom: 4}}>Risk Level: 72%</div>
              <div className="risk-bar">
                <div className="risk-fill" style={{width: '72%'}}></div>
              </div>
              <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '8.5px', color: 'rgba(240, 253, 244, 0.2)'}}>
                <span>Low</span>
                <span>Moderate</span>
                <span>High</span>
              </div>
            </div>
          </Card>

          {/* Tabs */}
          <Tabs tabs={tabsContent} />
        </div>
      </div>
    </DashboardLayout>
  );
};
