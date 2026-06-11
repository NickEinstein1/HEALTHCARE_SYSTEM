/**
 * UniHealth AI Assist — live API panels for static HTML dashboards.
 * Renders using the same ai-widget / ai-row / tag structure as dashboard HTML.
 */
(function (global) {
  'use strict';

  const DEFAULT_API = 'http://localhost:8100';
  const DEFAULT_PATIENT = 'P001';

  function apiBase() {
    const b = document.body && document.body.getAttribute('data-uh-api');
    return (b || global.UNIHEALTH_API_BASE || DEFAULT_API).replace(/\/$/, '');
  }

  function patientId() {
    return (document.body && document.body.getAttribute('data-uh-patient-id')) || DEFAULT_PATIENT;
  }

  function role() {
    return (document.body && document.body.getAttribute('data-unihealth-ai-role')) || 'doctor';
  }

  async function apiFetch(path, r, method, body) {
    const headers = {
      Accept: 'application/json',
      'X-UniHealth-Role': r,
      'X-Facility-Id': 'FAC-A',
    };
    const opts = { method: method || 'GET', headers };
    if (body) {
      headers['Content-Type'] = 'application/json';
      opts.body = JSON.stringify(body);
    }
    const res = await fetch(apiBase() + path, opts);
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(res.status + (t ? ': ' + t.slice(0, 80) : ''));
    }
    return res.json();
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function bandClass(b) {
    const u = String(b || 'LOW').toUpperCase();
    if (u === 'HIGH') return 'high';
    if (u === 'MEDIUM') return 'med';
    return 'low';
  }

  function severityTag(sev) {
    const s = String(sev || '').toLowerCase();
    if (s === 'high' || s === 'critical') return { cls: 'r', label: 'ACTION NEEDED' };
    if (s === 'medium' || s === 'warning') return { cls: 'am', label: 'REMINDER' };
    return { cls: 'b', label: 'PREVENTIVE' };
  }

  function refreshBtn(label) {
    return `<button type="button" class="btn-s btn-sm uh-ai-refresh">${escapeHtml(label || 'Refresh')}</button>`;
  }

  function riskWidgetHtml(data, variant) {
    const band = (data && data.risk_band) || '—';
    const cls = bandClass(data && data.risk_band);
    const news2 = data && data.news2 ? data.news2 : {};
    const drivers = (data && data.drivers) || [];
    const ml =
      data && typeof data.ml_probability === 'number'
        ? `<span class="uh-ai-meta">p=${Math.round(data.ml_probability * 100)}%</span>`
        : '';
    const modelLabel =
      data && data.model_type === 'sklearn_logistic_v1' ? 'ML assist' : 'rules pilot';
    const title =
      variant === 'nurse'
        ? '🤖 Live deterioration risk (NEWS2)'
        : '🤖 Live deterioration risk';
    const sub =
      data && data.model_type === 'sklearn_logistic_v1'
        ? 'Experimental ML probability — clinical sign-off required'
        : 'NEWS2 + vitals/lab thresholds — not diagnostic AI. Clinical judgement required.';

    return `
      <div class="ai-widget-hd">
        <div>
          <div class="ai-widget-ti">${title}</div>
          <div style="font-size:10px;color:var(--t3);margin-top:2px">${sub} · ${modelLabel}</div>
        </div>
        <div class="uh-ai-hd-actions">
          <span class="risk-score ${cls}">${String(band).toUpperCase()} RISK</span>
          ${ml}
          <span class="uh-ai-meta">${escapeHtml((data && data.model_version) || 'rule-v2.1.0')}</span>
          ${refreshBtn()}
        </div>
      </div>
      ${
        news2.score != null
          ? `<div class="ai-row" style="border:none;padding-top:0">
              <span class="ai-row-ico">📊</span>
              <div class="ai-row-body">
                <div class="ai-row-ti">NEWS2 score ${news2.score}</div>
                <div class="ai-row-su">${escapeHtml(news2.risk || '—')}${
                  data.active_alerts != null ? ` · ${data.active_alerts} active alert(s)` : ''
                }</div>
              </div>
            </div>`
          : ''
      }
      ${
        drivers.length
          ? drivers
              .map(
                (d) => `
          <div class="ai-row">
            <span class="ai-row-ico">⚠️</span>
            <div class="ai-row-body">
              <div class="ai-row-ti">Risk driver</div>
              <div class="ai-row-su">${escapeHtml(d)}</div>
            </div>
          </div>`
              )
              .join('')
          : ''
      }
      <div class="uh-ai-foot">${escapeHtml((data && data.disclaimer) || 'Rules-based CDS pilot.')}</div>`;
  }

  function patientInsightRow(insight) {
    const tag = severityTag(insight.severity);
    const icon = insight.severity === 'high' ? '⚠️' : '💡';
    return `
      <div class="ai-row">
        <span class="ai-row-ico">${icon}</span>
        <div class="ai-row-body">
          <div class="ai-row-ti">${escapeHtml(insight.title || '')}</div>
          <div class="ai-row-su">${escapeHtml(insight.body || '')}</div>
        </div>
        <span class="tag ${tag.cls}" style="flex-shrink:0;margin-top:2px">${tag.label}</span>
      </div>`;
  }

  function patientAlertRow(alert) {
    return `
      <div class="ai-row">
        <span class="ai-row-ico">🔔</span>
        <div class="ai-row-body">
          <div class="ai-row-ti">${escapeHtml(alert.title || 'Alert')}</div>
          <div class="ai-row-su">${escapeHtml(alert.body || '')}</div>
        </div>
      </div>`;
  }

  async function loadRisk(el) {
    const r = role();
    if (r !== 'doctor' && r !== 'nurse') return;
    const variant = r === 'nurse' ? 'nurse' : 'doctor';
    const widgetCls = variant === 'nurse' ? 'risk-nurse' : 'risk-doctor';

    if (!el.classList.contains('ai-widget')) {
      el.className = 'ai-widget uh-ai-live ' + widgetCls;
    } else {
      el.classList.add('uh-ai-live', widgetCls);
    }

    el.innerHTML = `<div class="uh-ai-offline">Loading risk score…</div>`;
    try {
      const data = await apiFetch('/ai/risk-score', r, 'POST', {
        patient_id: patientId(),
        use_fhir: true,
        features: {},
      });
      el.innerHTML = riskWidgetHtml(data, variant);
      el.querySelector('.uh-ai-refresh')?.addEventListener('click', () => loadRisk(el));
    } catch (e) {
      el.innerHTML = `
        <div class="ai-widget-hd">
          <div>
            <div class="ai-widget-ti">🤖 Live deterioration risk</div>
            <div style="font-size:10px;color:var(--t3);margin-top:2px">Gateway offline — static alerts below still apply</div>
          </div>
          ${refreshBtn('Retry')}
        </div>
        <div class="uh-ai-offline">${escapeHtml(e.message)}. Start API :8100 with EHR_AI_RISK_SCORE_ENABLED.</div>`;
      el.querySelector('.uh-ai-refresh')?.addEventListener('click', () => loadRisk(el));
      el.style.display = '';
    }
  }

  async function loadPatientInsights(widget) {
    const insightsEl =
      widget.querySelector('[data-uh-ai-live="insights"]') ||
      document.getElementById('uh-ai-patient-insights-body');
    const alertsEl =
      widget.querySelector('[data-uh-ai-live="alerts"]') ||
      document.getElementById('uh-ai-patient-alerts');
    const pid = patientId();

    if (insightsEl) insightsEl.innerHTML = '<div class="uh-ai-offline">Loading insights…</div>';

    try {
      const res = await apiFetch('/ai/patient/insights', 'patient', 'POST', {
        patient_id: pid,
        vitals: { rr: 16, sbp: 120, hr: 75, spo2: 98, temp: 37, gcs: 15 },
      });
      const insights = res.insights || [];
      if (insightsEl) {
        insightsEl.innerHTML = insights.length
          ? insights.map(patientInsightRow).join('')
          : '<div class="uh-ai-offline">No live insights for current vitals.</div>';
      }
      widget.classList.add('uh-ai-has-live');
    } catch (e) {
      if (insightsEl) {
        insightsEl.innerHTML = `<div class="uh-ai-offline">API offline — static insights shown. (${escapeHtml(e.message)})</div>`;
      }
    }

    if (alertsEl) {
      alertsEl.innerHTML = '';
      try {
        const res = await apiFetch(
          `/ai/patient/alerts?patient_id=${encodeURIComponent(pid)}&limit=6`,
          'patient'
        );
        const alerts = res.alerts || [];
        if (alerts.length) {
          alertsEl.innerHTML =
            '<div class="uh-ai-live-alerts-hd">Live alerts</div>' +
            alerts.map(patientAlertRow).join('');
        }
      } catch (_) {
        /* optional */
      }
    }
  }

  async function loadAdminStatus(el) {
    el.className = 'ai-widget uh-ai-live admin-status';
    el.innerHTML = '<div class="uh-ai-offline">Loading /ai/status…</div>';
    try {
      const s = await apiFetch('/ai/status', 'admin');
      el.innerHTML = `
        <div class="ai-widget-hd">
          <div>
            <div class="ai-widget-ti">🤖 AI Assist status</div>
            <div style="font-size:10px;color:var(--t3);margin-top:2px">Gateway pilot · ${escapeHtml(s.model_version || '—')}</div>
          </div>
          ${refreshBtn()}
        </div>
        <div class="ai-row" style="border:none">
          <span class="ai-row-ico">🗄️</span>
          <div class="ai-row-body">
            <div class="ai-row-ti">Postgres ${s.postgres_enabled ? 'enabled' : 'disabled'}</div>
            <div class="ai-row-su">WebSocket connections: ${(s.ws_connections && s.ws_connections.total) || 0}</div>
          </div>
          <span class="tag g">LIVE</span>
        </div>`;
      el.querySelector('.uh-ai-refresh')?.addEventListener('click', () => loadAdminStatus(el));
    } catch (e) {
      el.innerHTML = `
        <div class="ai-widget-hd">
          <div class="ai-widget-ti">🤖 AI Assist status</div>
          ${refreshBtn('Retry')}
        </div>
        <div class="uh-ai-offline">Status unavailable (${escapeHtml(e.message)})</div>`;
      el.querySelector('.uh-ai-refresh')?.addEventListener('click', () => loadAdminStatus(el));
    }
  }

  function mountAll(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-uh-ai="risk"]').forEach((el) => {
      if (el.closest('[data-uh-ai="patient-insights"]')) return;
      loadRisk(el);
    });
    scope.querySelectorAll('[data-uh-ai="admin-status"]').forEach((el) => loadAdminStatus(el));
    scope.querySelectorAll('[data-uh-ai="patient-insights"]').forEach((el) => loadPatientInsights(el));
  }

  function mountPatient() {
    const widget =
      document.querySelector('[data-uh-ai="patient-insights"]') ||
      document.getElementById('uh-ai-patient-widget');
    if (widget) loadPatientInsights(widget);
  }

  global.UniHealthAI = {
    mountAll,
    mountPatient,
    loadRisk,
    loadPatientInsights,
    loadAdminStatus,
    apiBase,
    patientId,
    role,
  };

  document.addEventListener('DOMContentLoaded', () => {
    mountAll(document);
    if (role() === 'patient') mountPatient();
  });
})(typeof window !== 'undefined' ? window : globalThis);
