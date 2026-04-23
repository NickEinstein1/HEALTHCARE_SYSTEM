import { useCallback, useEffect, useState } from "react";

export type PollingState<T> = {
  data: T | null;
  error: string | null;
  loading: boolean;
  lastUpdatedAt: number | null;
  refresh: () => void;
};

export function usePolling<T>(
  fetcher: () => Promise<T>,
  opts: { intervalMs: number; enabled?: boolean }
): PollingState<T> {
  const { intervalMs, enabled = true } = opts;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const [refreshNonce, setRefreshNonce] = useState(0);

  const runOnce = useCallback(async () => {
    try {
      const v = await fetcher();
      setData(v);
      setError(null);
      setLastUpdatedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [fetcher]);

  const refresh = useCallback(() => {
    setLoading(true);
    setRefreshNonce((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;
    setLoading(true);
    fetcher().then(
      (v) => {
        if (cancelled) return;
        setData(v);
        setError(null);
        setLastUpdatedAt(Date.now());
      },
      (e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
      }
    ).finally(() => {
      if (cancelled) return;
      setLoading(false);
    });
    const id = window.setInterval(() => {
      void runOnce();
    }, intervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, intervalMs, fetcher, runOnce, refreshNonce]);

  return { data, error, loading, lastUpdatedAt, refresh };
}

