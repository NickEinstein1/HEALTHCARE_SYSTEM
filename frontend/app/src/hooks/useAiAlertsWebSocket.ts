import { useEffect, useRef } from "react";
import { aiAlertsWebSocketUrl, type AiWsAlertRole } from "../lib/api";

const MAX_RETRY_MS = 30_000;

/** Real-time AI anomaly alerts over ``/ai/ws/alerts/{role}`` with graceful reconnect. */
export function useAiAlertsWebSocket(
  role: AiWsAlertRole,
  onAlert: (data: Record<string, unknown>) => void,
  enabled = true,
): void {
  const onAlertRef = useRef(onAlert);
  onAlertRef.current = onAlert;

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;
    let retryTimer: number | undefined;
    let ws: WebSocket | null = null;
    let retryAttempt = 0;

    const scheduleReconnect = () => {
      if (cancelled) return;
      const delay = Math.min(MAX_RETRY_MS, 1000 * 2 ** retryAttempt);
      retryAttempt += 1;
      retryTimer = window.setTimeout(connect, delay);
    };

    const connect = () => {
      if (cancelled) return;
      const url = aiAlertsWebSocketUrl(role);
      if (!url) {
        // OIDC on but no access token yet — retry until sign-in completes.
        scheduleReconnect();
        return;
      }
      try {
        ws = new WebSocket(url);
      } catch {
        scheduleReconnect();
        return;
      }

      ws.onopen = () => {
        retryAttempt = 0;
      };

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data) as { event?: string; data?: Record<string, unknown> };
          if (msg.event === "anomaly_alert" && msg.data) {
            onAlertRef.current(msg.data);
          }
        } catch {
          /* ignore malformed frames */
        }
      };

      ws.onclose = () => {
        ws = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        /* onclose handles reconnect */
      };
    };

    connect();

    return () => {
      cancelled = true;
      if (retryTimer !== undefined) clearTimeout(retryTimer);
      if (ws) {
        ws.onopen = null;
        ws.onmessage = null;
        ws.onclose = null;
        ws.onerror = null;
        if (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING) {
          ws.close(1000, "unmount");
        }
      }
    };
  }, [role, enabled]);
}
