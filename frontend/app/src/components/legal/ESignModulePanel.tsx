import { useCallback, useEffect, useRef, useState } from "react";
import { api } from "../../lib/api";
import type {
  EsignAiAnalysis,
  EsignDocumentView,
  EsignVerificationProcess,
  LegalDocument,
  LegalDocumentVerification,
} from "../../lib/apiTypes";
import "../../styles/esign-module.css";

const DOC_TYPE_LABELS: Record<string, string> = {
  poa: "Power of Attorney",
  surgical_consent: "Surgical Consent",
  emergency_consent: "Emergency Consent",
  uploaded: "Uploaded Document",
};

const DOC_TYPE_ICONS: Record<string, string> = {
  poa: "⚖️",
  surgical_consent: "🏥",
  emergency_consent: "🚨",
  uploaded: "📄",
};

const PIPELINE = ["Upload", "AI Review", "Sign", "Verify"] as const;

type Props = {
  patientId: string;
  role: "doctor" | "nurse" | "patient" | "admin";
  allowCreate?: Array<"poa" | "surgical_consent" | "emergency_consent">;
  onToast?: (message: string) => void;
  active?: boolean;
};

function stepIcon(status: string): string {
  if (status === "passed") return "✅";
  if (status === "failed") return "❌";
  if (status === "warning") return "⚠️";
  if (status === "pending") return "⏳";
  return "○";
}

export function ESignModulePanel({
  patientId,
  role,
  allowCreate = ["poa", "surgical_consent", "emergency_consent"],
  onToast,
  active = true,
}: Props) {
  const onToastRef = useRef(onToast);
  onToastRef.current = onToast;
  const fileRef = useRef<HTMLInputElement>(null);

  const [documents, setDocuments] = useState<LegalDocument[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [verification, setVerification] = useState<LegalDocumentVerification | null>(null);
  const [analysis, setAnalysis] = useState<EsignAiAnalysis | null>(null);
  const [verifyProcess, setVerifyProcess] = useState<EsignVerificationProcess | null>(null);
  const [viewer, setViewer] = useState<EsignDocumentView | null>(null);
  const [pipelineStep, setPipelineStep] = useState(0);
  const [signerName, setSignerName] = useState("");
  const [signerRole, setSignerRole] = useState(role === "patient" ? "patient" : "clinician");
  const [attestation, setAttestation] = useState("I have read this document and agree to its terms.");
  const [contextFields, setContextFields] = useState({ procedure: "", agent: "", emergency: "" });
  const [busy, setBusy] = useState(false);
  const [uploadName, setUploadName] = useState("");

  const refresh = useCallback(async () => {
    if (!active) return;
    setLoading(true);
    try {
      const res = await api.legalDocuments({ patient_id: patientId, limit: 50 }, role);
      setDocuments(res.documents ?? []);
    } catch (e: unknown) {
      onToastRef.current?.(`Could not load documents: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setLoading(false);
    }
  }, [patientId, role, active]);

  useEffect(() => {
    if (!active) return;
    void refresh();
  }, [refresh, active]);

  const selected = documents.find((d) => d.id === selectedId) ?? null;

  useEffect(() => {
    if (!selected) {
      setAnalysis(null);
      setVerifyProcess(null);
      setViewer(null);
      setPipelineStep(0);
      return;
    }
    const ctx = selected.context as Record<string, unknown> | undefined;
    if (ctx?.ai_analysis && typeof ctx.ai_analysis === "object") {
      setAnalysis(ctx.ai_analysis as EsignAiAnalysis);
      setPipelineStep(1);
    }
    if (ctx?.verification_process && typeof ctx.verification_process === "object") {
      setVerifyProcess(ctx.verification_process as EsignVerificationProcess);
      setPipelineStep(3);
    } else if ((selected.signatures ?? []).length > 0) {
      setPipelineStep(2);
    } else if (selected.doc_type === "uploaded") {
      setPipelineStep(0);
    }
  }, [selected]);

  const createDocument = async (docType: string) => {
    setBusy(true);
    try {
      const context: Record<string, string> = {};
      if (docType === "surgical_consent" && contextFields.procedure) context.procedure = contextFields.procedure;
      if (docType === "poa" && contextFields.agent) context.agent_name = contextFields.agent;
      if (docType === "emergency_consent" && contextFields.emergency) context.grounds = contextFields.emergency;
      const res = await api.legalDocumentCreate({ patient_id: patientId, doc_type: docType, context }, role);
      setSelectedId(res.document.id);
      onToastRef.current?.(`${DOC_TYPE_LABELS[docType] ?? docType} created.`);
      await refresh();
    } catch (e: unknown) {
      onToastRef.current?.(`Create failed: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setBusy(false);
    }
  };

  const handleFile = async (file: File) => {
    setBusy(true);
    setUploadName(file.name);
    try {
      const isText = file.type.startsWith("text/") || /\.(txt|md|csv)$/i.test(file.name);
      let content_text = "";
      let content_data_url: string | undefined;

      if (isText) {
        content_text = await file.text();
      } else {
        content_data_url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result ?? ""));
          reader.onerror = () => reject(new Error("Could not read file"));
          reader.readAsDataURL(file);
        });
        content_text = `[Binary file: ${file.name}] — preview available in document viewer.`;
      }

      const res = await api.esignUploadDocument(
        {
          patient_id: patientId,
          filename: file.name,
          mime_type: file.type || "application/octet-stream",
          content_text,
          content_data_url,
        },
        role,
      );
      setSelectedId(res.document.id);
      setPipelineStep(0);
      onToastRef.current?.(`Uploaded ${file.name}. Run AI analysis next.`);
      await refresh();
      await runAnalysis(res.document.id);
    } catch (e: unknown) {
      onToastRef.current?.(`Upload failed: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setBusy(false);
    }
  };

  const runAnalysis = async (docId?: string) => {
    const id = docId ?? selected?.id;
    if (!id) return;
    setBusy(true);
    try {
      const res = await api.esignAnalyzeDocument(id, role, patientId);
      setAnalysis(res.analysis);
      setSelectedId(id);
      setPipelineStep(1);
      onToastRef.current?.(`AI review complete — ${res.analysis.confidence_pct}% confidence.`);
      await refresh();
    } catch (e: unknown) {
      onToastRef.current?.(`Analysis failed: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setBusy(false);
    }
  };

  const openViewer = async (docId: string) => {
    setBusy(true);
    try {
      const view = await api.esignDocumentView(docId, role, patientId);
      setViewer(view);
      setSelectedId(docId);
    } catch (e: unknown) {
      onToastRef.current?.(`Could not open document: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setBusy(false);
    }
  };

  const signDocument = async () => {
    if (!selected || !signerName.trim()) {
      onToastRef.current?.("Enter your full legal name to sign.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.legalDocumentSign(
        selected.id,
        {
          signer_role: signerRole,
          signer_name: signerName.trim(),
          attestation: attestation.trim(),
          signature_method: "typed",
        },
        role,
        patientId,
      );
      setPipelineStep(2);
      onToastRef.current?.(res.document.status === "completed" ? "Document fully signed." : "Signature recorded.");
      if (res.verification) setVerification(res.verification);
      await refresh();
    } catch (e: unknown) {
      onToastRef.current?.(`Sign failed: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setBusy(false);
    }
  };

  const verifyDocument = async (docId: string) => {
    setBusy(true);
    try {
      const res = await api.legalDocumentVerify(docId, role, patientId);
      setVerification(res);
      setSelectedId(docId);
      onToastRef.current?.(res.valid ? "Verification passed." : "Verification incomplete.");
    } catch (e: unknown) {
      onToastRef.current?.(`Verify failed: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setBusy(false);
    }
  };

  const initiateVerification = async (docId?: string) => {
    const id = docId ?? selected?.id;
    if (!id) return;
    if (role === "patient") {
      onToastRef.current?.("Only clinical staff can initiate formal verification.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.esignVerifyInitiate(id, role);
      setVerifyProcess(res.process);
      setVerification(res.process.verification ?? null);
      setPipelineStep(3);
      setSelectedId(id);
      onToastRef.current?.(
        res.process.status === "verified"
          ? "Verification process completed successfully."
          : `Verification initiated — ${res.process.status}.`,
      );
      await refresh();
    } catch (e: unknown) {
      onToastRef.current?.(`Verification initiation failed: ${e instanceof Error ? e.message : "error"}`);
    } finally {
      setBusy(false);
    }
  };

  const statusTone = (status: string) => {
    if (status === "completed") return "g";
    if (status === "voided") return "r";
    if (status === "pending_signatures") return "am";
    return "b";
  };

  return (
    <div className="esign-root doc-section">
      <div className="esign-hd">
        <div>
          <div className="esign-title">E-Signatures &amp; Legal Documents</div>
          <div className="esign-sub">
            Upload → AI analysis → sign → initiate verification workflow
          </div>
        </div>
        <button type="button" className="btn-s btn-sm" disabled={loading} onClick={() => void refresh()}>
          {loading ? "Loading…" : "Refresh"}
        </button>
      </div>

      <div className="esign-pipeline">
        {PIPELINE.map((label, i) => (
          <div
            key={label}
            className={`esign-step${pipelineStep === i ? " on" : ""}${pipelineStep > i ? " done" : ""}`}
          >
            {i + 1}. {label}
          </div>
        ))}
      </div>

      {/* ── Upload ── */}
      <div className="esign-section">
        <div className="esign-section-title">1 · Document upload</div>
        <label
          className="esign-upload-zone"
          onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add("drag"); }}
          onDragLeave={(e) => e.currentTarget.classList.remove("drag")}
          onDrop={(e) => {
            e.preventDefault();
            e.currentTarget.classList.remove("drag");
            const f = e.dataTransfer.files?.[0];
            if (f) void handleFile(f);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md,.doc,.docx,image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handleFile(f);
            }}
          />
          <div style={{ fontSize: 28, marginBottom: 8 }}>📤</div>
          <div style={{ fontWeight: 800, color: "var(--t1)" }}>
            {busy && uploadName ? `Uploading ${uploadName}…` : "Drop file or click to upload"}
          </div>
          <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 6 }}>
            PDF, text, or images · AI analysis runs automatically after upload
          </div>
        </label>
      </div>

      {/* ── Template create ── */}
      {allowCreate.length > 0 && role !== "patient" ? (
        <div className="esign-section">
          <div className="esign-section-title">Or create signing envelope</div>
          <div className="gcol3" style={{ gap: 10 }}>
            {allowCreate.includes("surgical_consent") && (
              <div className="ff">
                <label>Procedure (surgical)</label>
                <input
                  value={contextFields.procedure}
                  onChange={(e) => setContextFields((s) => ({ ...s, procedure: e.target.value }))}
                  placeholder="e.g. Laparoscopic appendectomy"
                />
              </div>
            )}
            {allowCreate.includes("emergency_consent") && (
              <div className="ff">
                <label>Emergency grounds</label>
                <input
                  value={contextFields.emergency}
                  onChange={(e) => setContextFields((s) => ({ ...s, emergency: e.target.value }))}
                  placeholder="e.g. Unconscious — immediate intervention"
                />
              </div>
            )}
            {allowCreate.includes("poa") && (
              <div className="ff">
                <label>POA agent name</label>
                <input
                  value={contextFields.agent}
                  onChange={(e) => setContextFields((s) => ({ ...s, agent: e.target.value }))}
                  placeholder="Healthcare agent full name"
                />
              </div>
            )}
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
            {allowCreate.map((dt) => (
              <button key={dt} type="button" className="btn-s btn-sm" disabled={busy} onClick={() => void createDocument(dt)}>
                {DOC_TYPE_ICONS[dt]} New {DOC_TYPE_LABELS[dt]}
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {role === "patient" && allowCreate.includes("poa") ? (
        <div className="esign-section">
          <button type="button" className="btn-p btn-sm" disabled={busy} onClick={() => void createDocument("poa")}>
            ⚖️ Create Power of Attorney
          </button>
        </div>
      ) : null}

      {/* ── AI Analysis ── */}
      {analysis && (
        <div className="esign-section">
          <div className="esign-section-title">2 · AI document analysis</div>
          <div className="esign-ai-card">
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, flexWrap: "wrap" }}>
              <div>
                <div style={{ fontWeight: 800, color: "var(--t1)" }}>{analysis.summary}</div>
                <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 4 }}>{analysis.analysis_id}</div>
              </div>
              <div className="esign-ai-score">{analysis.confidence_pct}%</div>
            </div>
            {(analysis.flags ?? []).length > 0 && (
              <div style={{ marginTop: 12 }}>
                {(analysis.flags ?? []).map((f) => (
                  <div key={f.code} className={`notice ${f.severity === "HIGH" ? "r" : "am"}`} style={{ marginBottom: 6 }}>
                    <span className="notice-e">⚠</span>
                    <div className="notice-tx"><strong>{f.severity}</strong> · {f.detail}</div>
                  </div>
                ))}
              </div>
            )}
            {(analysis.findings ?? []).length > 0 && (
              <ul style={{ margin: "10px 0 0", paddingLeft: 18, fontSize: 11.5, color: "var(--t2)" }}>
                {(analysis.findings ?? []).map((f, i) => (
                  <li key={i}>{f.detail}</li>
                ))}
              </ul>
            )}
            <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 10, fontStyle: "italic" }}>{analysis.disclaimer}</div>
          </div>
          {selected && (
            <button type="button" className="btn-s btn-sm" disabled={busy} onClick={() => void runAnalysis()}>
              🔄 Re-run AI analysis
            </button>
          )}
        </div>
      )}

      {/* ── Document list ── */}
      <div className="panel" style={{ marginTop: 14 }}>
        <div className="pnl-hd">
          <div className="pnl-ti">Documents for {patientId}</div>
        </div>
        <div className="pnl-bd pnl-bd--flush">
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Type</th>
                  <th>Title</th>
                  <th>Status</th>
                  <th>Signed</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {documents.map((doc) => (
                  <tr key={doc.id}>
                    <td>{DOC_TYPE_ICONS[doc.doc_type] ?? "📄"} {DOC_TYPE_LABELS[doc.doc_type] ?? doc.doc_type}</td>
                    <td style={{ fontWeight: 600 }}>{doc.title}</td>
                    <td><span className={`tag ${statusTone(doc.status)}`}>{doc.status}</span></td>
                    <td style={{ fontSize: 11 }}>
                      {(doc.signatures ?? []).map((s) => s.signer_role).join(", ") || "—"}
                    </td>
                    <td>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        <button type="button" className="btn-s btn-sm" onClick={() => { setSelectedId(doc.id); void openViewer(doc.id); }}>View</button>
                        <button type="button" className="btn-s btn-sm" onClick={() => setSelectedId(doc.id)}>Open</button>
                        <button type="button" className="btn-s btn-sm" disabled={busy} onClick={() => void runAnalysis(doc.id)}>AI</button>
                        <button type="button" className="btn-s btn-sm" disabled={busy} onClick={() => void verifyDocument(doc.id)}>Verify</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {!loading && documents.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: 14, color: "var(--t3)", fontSize: 11.5 }}>
                      No documents yet. Upload a file or create a consent envelope above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ── Viewer ── */}
      {viewer && (
        <div className="panel doc-section">
          <div className="pnl-hd">
            <div>
              <div className="pnl-ti">Document viewer</div>
              <div className="pnl-su">{viewer.filename ?? viewer.title}</div>
            </div>
            <button type="button" className="btn-s btn-sm" onClick={() => setViewer(null)}>Close</button>
          </div>
          <div className="pnl-bd">
            {viewer.data_url && viewer.mime_type?.includes("pdf") ? (
              <div className="esign-viewer">
                <iframe title={viewer.filename ?? "Document"} src={viewer.data_url} />
              </div>
            ) : viewer.data_url && viewer.mime_type?.startsWith("image/") ? (
              <div className="esign-viewer" style={{ textAlign: "center" }}>
                <img src={viewer.data_url} alt={viewer.filename ?? "Document"} style={{ maxWidth: "100%", height: "auto" }} />
              </div>
            ) : (
              <div className="esign-viewer">{viewer.text_content ?? viewer.body ?? "No preview available."}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Sign ── */}
      {selected && (
        <div className="panel doc-section">
          <div className="pnl-hd">
            <div>
              <div className="pnl-ti">3 · {selected.title}</div>
              <div className="pnl-su mono">{selected.id}</div>
            </div>
            {selected.verification_code ? (
              <span className="tag g">Code: {selected.verification_code}</span>
            ) : null}
          </div>
          <div className="pnl-bd">
            <p style={{ fontSize: 13, lineHeight: 1.55, color: "var(--t2)" }}>{selected.body}</p>
            {selected.status === "pending_signatures" && (
              <div style={{ marginTop: 14, borderTop: "1px solid var(--bdr)", paddingTop: 14 }}>
                <div className="gcol2" style={{ gap: 12 }}>
                  <div className="ff">
                    <label>Sign as</label>
                    <select value={signerRole} onChange={(e) => setSignerRole(e.target.value)}>
                      {selected.required_signers.map((r) => (
                        <option key={r} value={r}>{r}</option>
                      ))}
                    </select>
                  </div>
                  <div className="ff">
                    <label>Full legal name</label>
                    <input value={signerName} onChange={(e) => setSignerName(e.target.value)} placeholder="As shown on ID" />
                  </div>
                </div>
                <div className="ff" style={{ marginTop: 10 }}>
                  <label>Attestation</label>
                  <textarea value={attestation} onChange={(e) => setAttestation(e.target.value)} style={{ minHeight: 72 }} />
                </div>
                <button type="button" className="btn-p" style={{ marginTop: 10 }} disabled={busy} onClick={() => void signDocument()}>
                  {busy ? "Signing…" : "✍️ Sign electronically"}
                </button>
              </div>
            )}
            {(selected.signatures ?? []).length > 0 && (
              <div style={{ marginTop: 14 }}>
                <div style={{ fontWeight: 700, fontSize: 12, marginBottom: 8 }}>Signature chain</div>
                {(selected.signatures ?? []).map((s) => (
                  <div key={s.id} style={{ fontSize: 11.5, color: "var(--t3)", marginBottom: 6 }}>
                    <strong style={{ color: "var(--t2)" }}>{s.signer_name}</strong> ({s.signer_role}) · {s.signed_at}
                    <span className="mono" style={{ marginLeft: 8, fontSize: 10 }}>{s.signature_hash.slice(0, 12)}…</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Verification process ── */}
      <div className="esign-section">
        <div className="esign-section-title">4 · Verification process</div>
        <p style={{ fontSize: 11.5, color: "var(--t3)", marginBottom: 12 }}>
          Initiate a formal multi-step verification: integrity → patient match → AI review → signature chain → attestation.
        </p>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>
          <button
            type="button"
            className="btn-p btn-sm"
            disabled={busy || !selected || role === "patient"}
            onClick={() => void initiateVerification()}
          >
            {busy ? "Running…" : "🔐 Initiate verification process"}
          </button>
          {selected && (
            <button type="button" className="btn-s btn-sm" disabled={busy} onClick={() => void verifyDocument(selected.id)}>
              Quick verify (hash chain)
            </button>
          )}
        </div>

        {verifyProcess && (
          <div className="esign-verify-steps">
            <div style={{ fontWeight: 800, fontSize: 12, marginBottom: 4 }}>
              Process status: <span className={`tag ${verifyProcess.status === "verified" ? "g" : verifyProcess.status === "failed" ? "r" : "am"}`}>{verifyProcess.status}</span>
              {" · "}{verifyProcess.passed_count} passed, {verifyProcess.warning_count} warnings
            </div>
            {(verifyProcess.steps ?? []).map((step) => (
              <div key={step.id} className={`esign-verify-step ${step.status}`}>
                <span className="esign-verify-icon">{stepIcon(step.status)}</span>
                <div>
                  <strong style={{ textTransform: "capitalize" }}>{step.id.replace(/_/g, " ")}</strong>
                  <div style={{ fontSize: 11, color: "var(--t3)", marginTop: 2 }}>{step.detail}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {verification && !verifyProcess && (
          <div className={`notice ${verification.valid ? "" : "r"}`} style={{ marginTop: 10 }}>
            <span className="notice-e">{verification.valid ? "✅" : "⚠️"}</span>
            <div className="notice-tx">
              <strong>Verification {verification.valid ? "passed" : "incomplete"}</strong>
              <div style={{ fontSize: 11.5, marginTop: 4 }}>
                Hash chain: {verification.hash_chain_valid ? "valid" : "invalid"}
                {verification.verification_code ? ` · Code: ${verification.verification_code}` : ""}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
