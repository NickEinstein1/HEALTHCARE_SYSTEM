import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import type { ClinicalAiAssessmentResult } from "../../lib/apiTypes";

type Props = {
  patientId: string;
  role?: string;
  /** Optional controlled scenario text (doctor assessment of conditions). */
  scenarioAssessment?: string;
  onScenarioAssessmentChange?: (value: string) => void;
  /** Optional controlled sickness / symptom notes. */
  sicknessNotes?: string;
  onSicknessNotesChange?: (value: string) => void;
  /** Limit AI to specific incident report IDs. */
  incidentIds?: string[];
  compact?: boolean;
  onToast?: (message: string) => void;
};

export function ClinicalAiAssessmentPanel({
  patientId,
  role = "doctor",
  scenarioAssessment: scenarioProp,
  onScenarioAssessmentChange,
  sicknessNotes: sicknessProp,
  onSicknessNotesChange,
  incidentIds,
  compact = false,
  onToast,
}: Props) {
  const [scenarioLocal, setScenarioLocal] = useState("");
  const [sicknessLocal, setSicknessLocal] = useState("");
  const scenario = scenarioProp ?? scenarioLocal;
  const sickness = sicknessProp ?? sicknessLocal;
  const setScenario = onScenarioAssessmentChange ?? setScenarioLocal;
  const setSickness = onSicknessNotesChange ?? setSicknessLocal;

  const [providers, setProviders] = useState<string[]>(["rules"]);
  const [selectedProvider, setSelectedProvider] = useState("rules");
  const [loading, setLoading] = useState(false);
  const [contextLoading, setContextLoading] = useState(false);
  const [result, setResult] = useState<ClinicalAiAssessmentResult | null>(null);
  const [contextPreview, setContextPreview] = useState<Record<string, unknown> | null>(null);
  const [open, setOpen] = useState(!compact);

  const toast = (msg: string) => onToast?.(msg);

  useEffect(() => {
    let cancelled = false;
    void api.clinicalAiProviders(role).then((res) => {
      if (cancelled) return;
      const list = res.configured_providers?.length ? res.configured_providers : ["rules"];
      setProviders(list);
      setSelectedProvider(res.default_provider || list[0] || "rules");
    }).catch(() => { /* offline */ });
    return () => { cancelled = true; };
  }, [role]);

  const loadContext = useCallback(async () => {
    setContextLoading(true);
    try {
      const res = await api.clinicalAiContext(patientId, {
        scenario_assessment: scenario,
        sickness_notes: sickness,
      }, role);
      setContextPreview(res.context ?? null);
    } catch (e: unknown) {
      toast(`Context preview failed: ${e instanceof Error ? e.message : "API offline"}`);
    } finally {
      setContextLoading(false);
    }
  }, [patientId, role, scenario, sickness, toast]);

  const runAssessment = useCallback(async () => {
    if (!scenario.trim() && !sickness.trim()) {
      toast("Enter scenario assessment or patient sickness notes before running AI.");
      return;
    }
    setLoading(true);
    try {
      const res = await api.clinicalAiAssess({
        patient_id: patientId,
        scenario_assessment: scenario.trim() || undefined,
        sickness_notes: sickness.trim() || undefined,
        incident_ids: incidentIds?.length ? incidentIds : undefined,
        provider: selectedProvider !== "rules" ? selectedProvider : undefined,
      }, role);
      setResult(res);
      setOpen(true);
      if (res.llm_error) {
        toast(`LLM unavailable — rules fallback used: ${res.llm_error}`);
      } else {
        toast("Clinical AI assessment complete.");
      }
    } catch (e: unknown) {
      toast(`Assessment failed: ${e instanceof Error ? e.message : "API offline"}`);
    } finally {
      setLoading(false);
    }
  }, [patientId, role, scenario, sickness, incidentIds, selectedProvider, toast]);

  const triage = (contextPreview?.triage as Array<Record<string, unknown>>) ?? [];
  const symptoms = (contextPreview?.symptom_observations as string[]) ?? [];
  const incidents = (contextPreview?.incidents as Array<Record<string, unknown>>) ?? [];

  return (
    <div
      style={{
        background: "rgba(13,148,136,0.05)",
        border: "1px solid rgba(13,148,136,0.28)",
        borderRadius: 14,
        padding: compact ? "14px 16px" : "18px 20px",
        marginBottom: 14,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12, flexWrap: "wrap" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 14, color: "var(--t1, #0f172a)" }}>
            AI Clinical Assessment
          </div>
          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4, maxWidth: 520 }}>
            Summarises nurse triage symptoms, incident reports, vitals, and your scenario notes into
            differential diagnoses. Decision support only — not a definitive diagnosis.
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn-s btn-sm"
            disabled={contextLoading}
            onClick={() => void loadContext()}
          >
            {contextLoading ? "Loading…" : "Preview context"}
          </button>
          {!compact && (
            <button type="button" className="btn-s btn-sm" onClick={() => setOpen((v) => !v)}>
              {open ? "Collapse" : "Expand"}
            </button>
          )}
        </div>
      </div>

      {(open || compact) && (
        <>
          <div className="gcol2" style={{ marginTop: 14, gap: 12 }}>
            <div className="ff">
              <label>Scenario-based assessment (conditions / clinical picture)</label>
              <textarea
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                placeholder="e.g. 45M with 3-day fever, productive cough, pleuritic chest pain…"
                style={{ minHeight: 88 }}
              />
            </div>
            <div className="ff">
              <label>Patient sickness / symptom notes</label>
              <textarea
                value={sickness}
                onChange={(e) => setSickness(e.target.value)}
                placeholder="Document reported symptoms, duration, severity, associated signs…"
                style={{ minHeight: 88 }}
              />
            </div>
          </div>

          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 12, flexWrap: "wrap" }}>
            <div className="ff" style={{ margin: 0, minWidth: 180 }}>
              <label>AI provider</label>
              <select value={selectedProvider} onChange={(e) => setSelectedProvider(e.target.value)}>
                {providers.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <button
              type="button"
              className="btn-p btn-sm"
              disabled={loading}
              onClick={() => void runAssessment()}
              style={{ marginTop: 18 }}
            >
              {loading ? "Analysing…" : "Run AI assessment"}
            </button>
          </div>

          {contextPreview && (
            <div style={{ marginTop: 14, fontSize: 11.5, color: "var(--t3)" }}>
              <strong style={{ color: "var(--t2)" }}>Aggregated inputs:</strong>
              {" "}
              {triage.length} triage complaint{triage.length === 1 ? "" : "s"},
              {" "}
              {symptoms.length} symptom note{symptoms.length === 1 ? "" : "s"},
              {" "}
              {incidents.length} incident{incidents.length === 1 ? "" : "s"}
            </div>
          )}

          {result && (
            <div style={{ marginTop: 16 }}>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                <span className="tag te" style={{ fontSize: 10 }}>
                  {result.provider}
                </span>
                <span className="tag b" style={{ fontSize: 10 }}>
                  {result.model_version}
                </span>
                {result.audit_id && (
                  <span className="mono" style={{ fontSize: 10, color: "var(--t3)" }}>
                    {result.audit_id}
                  </span>
                )}
              </div>

              {result.summary && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Summary</div>
                  <p style={{ fontSize: 13, color: "var(--t2)", margin: 0, lineHeight: 1.5 }}>{result.summary}</p>
                </div>
              )}

              {result.symptom_synthesis && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 4 }}>Symptom synthesis</div>
                  <p style={{ fontSize: 12, color: "var(--t3)", margin: 0 }}>{result.symptom_synthesis}</p>
                </div>
              )}

              {result.differential_diagnoses?.length > 0 && (
                <div style={{ marginBottom: 12 }}>
                  <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Possible conditions (differential)</div>
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {result.differential_diagnoses.map((dx, i) => (
                      <div
                        key={`${dx.name}-${i}`}
                        style={{
                          padding: "10px 12px",
                          borderRadius: 10,
                          border: `1px solid ${dx.confidence >= 85 ? "rgba(220,38,38,0.25)" : "rgba(13,148,136,0.2)"}`,
                          background: "#fff",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
                          <span style={{ fontWeight: 700, fontSize: 13 }}>{dx.name}</span>
                          <span style={{ fontWeight: 800, color: dx.confidence >= 85 ? "#dc2626" : "#0d9488" }}>
                            {dx.confidence}%
                          </span>
                        </div>
                        <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 4 }}>
                          ICD-10 {dx.icd10} · {dx.rationale}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {result.red_flags?.length > 0 && (
                <div className="notice r" style={{ marginBottom: 10 }}>
                  <span className="notice-e">🚨</span>
                  <div className="notice-tx">
                    <strong>Red flags</strong>
                    <ul style={{ margin: "6px 0 0", paddingLeft: 18 }}>
                      {result.red_flags.map((f, i) => <li key={i}>{f}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {result.recommended_workup?.length > 0 && (
                <div style={{ fontSize: 12, color: "var(--t3)" }}>
                  <strong style={{ color: "var(--t2)" }}>Suggested workup:</strong>
                  {" "}
                  {result.recommended_workup.join(" · ")}
                </div>
              )}

              <p style={{ fontSize: 10, color: "var(--t3)", marginTop: 12, marginBottom: 0 }}>
                {result.disclaimer}
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
