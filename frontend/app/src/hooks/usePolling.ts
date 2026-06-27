import { useCallback, useEffect, useRef, useState } from "react";

export type PollingState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  lastUpdatedAt: number | null;
  refresh: () => void;
};

const MIN_INTERVAL_MS = 3000;

/**
 * Polls an async fetcher on an interval. Uses a ref for the fetcher so inline
 * lambdas do not restart the interval every render (avoids proxy/API storms).
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  opts: { intervalMs: number; enabled?: boolean },
): PollingState<T> {
  const { enabled = true } = opts;
  const intervalMs = Math.max(MIN_INTERVAL_MS, opts.intervalMs);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const runOnce = useCallback(async (opts?: { showLoading?: boolean }) => {
    if (!mountedRef.current || inFlightRef.current) return;
    inFlightRef.current = true;
    if (opts?.showLoading) setLoading(true);
    try {
      const v = await fetcherRef.current();
      if (!mountedRef.current) return;
      setData(v);
      setError(null);
      setLastUpdatedAt(Date.now());
    } catch (e) {
      if (!mountedRef.current) return;
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      inFlightRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    setRefreshNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    let intervalId: number | undefined;

    const tick = () => {
      if (!cancelled && !document.hidden) void runOnce();
    };

    void runOnce({ showLoading: true });

    intervalId = window.setInterval(tick, intervalMs);

    const onVisible = () => {
      if (!document.hidden && !cancelled) void runOnce();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (intervalId !== undefined) clearInterval(intervalId);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [enabled, intervalMs, runOnce, refreshNonce]);

  return { data, error, loading, lastUpdatedAt, refresh };
}
