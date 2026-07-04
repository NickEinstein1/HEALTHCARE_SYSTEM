import { useCallback, useEffect, useRef, useState } from "react";

type Options = {
  intervalMs?: number;
  enabled?: boolean;
};

export function usePolling<T>(loader: () => Promise<T>, opts: Options = {}) {
  const { intervalMs = 15_000, enabled = true } = opts;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const loaderRef = useRef(loader);
  loaderRef.current = loader;

  const refresh = useCallback(async () => {
    try {
      const res = await loaderRef.current();
      setData(res);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Request failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;
    void refresh();
    const id = setInterval(() => void refresh(), intervalMs);
    return () => clearInterval(id);
  }, [enabled, intervalMs, refresh]);

  return { data, error, loading, refresh };
}
