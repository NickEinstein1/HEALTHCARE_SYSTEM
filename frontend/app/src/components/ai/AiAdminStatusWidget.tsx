import { useCallback, useEffect, useState } from "react";
import { api } from "../../lib/api";
import { DashIcon } from "../../components/brand/DashIcon";

export function AiAdminStatusWidget() {
  const [status, setStatus] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const s = await api.aiStatus();
      setStatus(s);
    } catch (e: unknown) {
      setStatus(null);
      setError(e instanceof Error ? e.message : "Status unavailable");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return (
    <div className="ai-widget uh-ai-live admin-status" data-uh-ai="admin-status" style={{ marginBottom: 14 }}>
      <div className="ai-widget-hd">
        <div>
          <div className="ai-widget-ti">🤖 AI Assist status</div>
          <div style={{ fontSize: 10, color: "var(--t3)", marginTop: 2 }}>
            Gateway pilot · {status?.model_version ?? (loading ? "…" : "—")}
          </div>
        </div>
        <div className="uh-ai-hd-actions">
          <button type="button" className="btn-s btn-sm" disabled={loading} onClick={() => void refresh()}>
            Refresh
          </button>
        </div>
      </div>

      {loading && !status ? <div className="uh-ai-offline">Loading /ai/status…</div> : null}

      {error && !status ? (
        <div className="uh-ai-offline">Status unavailable ({error})</div>
      ) : null}

      {status ? (
        <div className="ai-row" style={{ border: "none" }}>
          <span className="ai-row-ico"><DashIcon icon="🗄️" /></span>
          <div className="ai-row-body">
            <div className="ai-row-ti">Postgres {status.postgres_enabled ? "enabled" : "disabled"}</div>
            <div className="ai-row-su">
              WebSocket connections: {(status.ws_connections && status.ws_connections.total) || 0}
            </div>
          </div>
          <span className="tag g">LIVE</span>
        </div>
      ) : null}
    </div>
  );
}
