import type { ReactNode } from "react";
import { buildVitalMapFromObs } from "./riskScoreHelpers";
import { insightIcon, insightSeverityTag } from "./aiInsightHelpers";
import { usePatientAiInsights } from "../../hooks/usePatientAiInsights";
import { DashIcon } from "../../components/brand/DashIcon";

type Props = {
  patientId: string;
  displayName: string;
  observations?: any[] | null;
  enabled?: boolean;
  staticFallback: ReactNode;
  style?: React.CSSProperties;
};

export function AiPatientInsightsWidget({
  patientId,
  displayName,
  observations,
  enabled = true,
  staticFallback,
  style,
}: Props) {
  const vitals = buildVitalMapFromObs(observations ?? undefined);
  const { insights, alerts, loading, hasLive, error, refresh } = usePatientAiInsights(
    patientId,
    vitals,
    { enabled },
  );

  return (
    <div
      className={`ai-widget green${hasLive ? " uh-ai-has-live" : ""}`}
      data-uh-ai="patient-insights"
      style={style}
    >
      <div className="ai-widget-hd">
        <div>
          <div className="ai-widget-ti">🤖 AI Health Insights — {displayName}</div>
          <div style={{ fontSize: 10.5, color: "var(--t3)", marginTop: 2 }}>
            Live API when gateway is running · rules-based CDS pilot
          </div>
        </div>
        <div className="uh-ai-hd-actions">
          <span className="kdpa-badge">🔒 KDPA 2019</span>
          <button type="button" className="btn-s btn-sm" disabled={loading} onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </div>

      {loading && !insights.length ? (
        <div className="uh-ai-offline">Loading insights…</div>
      ) : null}

      {error && !hasLive ? (
        <div className="uh-ai-offline">API offline — static insights shown. ({error})</div>
      ) : null}

      {insights.map((insight, i) => {
        const tag = insightSeverityTag(insight.severity);
        return (
          <div className="ai-row" key={`insight-${i}`}>
            <span className="ai-row-ico">{insightIcon(insight.severity)}</span>
            <div className="ai-row-body">
              <div className="ai-row-ti">{insight.title}</div>
              <div className="ai-row-su">{insight.body}</div>
            </div>
            <span className={`tag ${tag.cls}`} style={{ flexShrink: 0, marginTop: 2 }}>
              {tag.label}
            </span>
          </div>
        );
      })}

      {alerts.length > 0 ? (
        <>
          <div className="uh-ai-live-alerts-hd">Live alerts</div>
          {alerts.map((alert, i) => (
            <div className="ai-row" key={`alert-${i}`}>
              <span className="ai-row-ico"><DashIcon icon="🔔" /></span>
              <div className="ai-row-body">
                <div className="ai-row-ti">{alert.title ?? "Alert"}</div>
                <div className="ai-row-su">{alert.body ?? ""}</div>
              </div>
            </div>
          ))}
        </>
      ) : null}

      <div className="uh-ai-static-fallback">{staticFallback}</div>
    </div>
  );
}
