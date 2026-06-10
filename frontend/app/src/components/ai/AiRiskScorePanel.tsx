import { riskBandClass, type RiskScoreResult } from "./riskScoreHelpers";

type Props = {
  riskScore: RiskScoreResult | null;
  riskLoading: boolean;
  onRefresh: () => void;
  variant?: "doctor" | "nurse";
};

export function AiRiskScorePanel({ riskScore, riskLoading, onRefresh, variant = "doctor" }: Props) {
  const border =
    variant === "nurse"
      ? "1px solid rgba(13,148,136,0.25)"
      : "1px solid rgba(124,111,255,0.22)";
  const bg =
    variant === "nurse"
      ? "rgba(13,148,136,0.05)"
      : "rgba(124,111,255,0.05)";

  return (
    <div
      style={{
        background: bg,
        border,
        borderRadius: 14,
        padding: "14px 18px",
        marginBottom: 14,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 13, color: "var(--t1, #1e293b)" }}>
            Deterioration risk
            {riskScore?.model_type === "sklearn_logistic_v1" ? " (ML assist)" : " (rules pilot)"}
          </div>
          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
            {riskScore?.model_type === "sklearn_logistic_v1"
              ? "Experimental ML probability — clinical sign-off required for production"
              : "NEWS2 + vitals/lab thresholds — not a validated ML probability"}
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          {riskLoading ? (
            <span style={{ fontSize: 12, color: "var(--t3)" }}>Updating…</span>
          ) : riskScore ? (
            <>
              <span className={`risk-score ${riskBandClass(riskScore.risk_band)}`}>
                {(riskScore.risk_band ?? "LOW").toUpperCase()} RISK
              </span>
              {typeof riskScore.ml_probability === "number" ? (
                <span style={{ fontSize: 10, color: "var(--t3)" }}>
                  p={(riskScore.ml_probability * 100).toFixed(0)}%
                </span>
              ) : null}
              <span style={{ fontSize: 10, color: "var(--t3)" }}>{riskScore.model_version ?? "rules"}</span>
            </>
          ) : (
            <span style={{ fontSize: 12, color: "var(--t3)" }}>—</span>
          )}
          <button type="button" className="btn-s btn-sm" disabled={riskLoading} onClick={onRefresh}>
            Refresh
          </button>
        </div>
      </div>
      {riskScore ? (
        <>
          {riskScore.news2 ? (
            <div style={{ fontSize: 12, color: "var(--t2)", marginTop: 10 }}>
              NEWS2 score <strong>{String((riskScore.news2 as { score?: number }).score ?? "—")}</strong>
              {" · "}
              {String((riskScore.news2 as { risk?: string }).risk ?? "—")}
              {typeof riskScore.active_alerts === "number"
                ? ` · ${riskScore.active_alerts} active alert(s)`
                : ""}
            </div>
          ) : null}
          {riskScore.drivers?.length ? (
            <ul
              style={{
                margin: "8px 0 0",
                paddingLeft: 18,
                fontSize: 12,
                color: "var(--t2)",
                lineHeight: 1.5,
              }}
            >
              {riskScore.drivers.map((d, i) => (
                <li key={i}>{d}</li>
              ))}
            </ul>
          ) : null}
          <div style={{ marginTop: 8, fontSize: 11, color: "var(--t3)", fontStyle: "italic" }}>
            {riskScore.disclaimer}
          </div>
        </>
      ) : null}
    </div>
  );
}
