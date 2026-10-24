"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useLivePoll<T>(
  fetcher: (signal: AbortSignal) => Promise<T>,
  intervalMs = 10000,
  initialData?: T,
) {
  const [data, setData] = useState(initialData);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);
  const [status, setStatus] = useState<"live" | "reconnecting">("live");
  const inFlight = useRef<Promise<void> | null>(null);
  const refreshRef = useRef<() => void>(() => {});

  useEffect(() => {
    let disposed = false;
    let controller: AbortController | null = null;
    let timer: ReturnType<typeof setInterval> | undefined;

    const refresh = () => {
      if (
        disposed ||
        document.visibilityState !== "visible" ||
        inFlight.current
      )
        return;

      controller = new AbortController();
      const { signal } = controller;
      inFlight.current = (async () => {
        try {
          const result = await fetcher(signal);
          if (disposed || signal.aborted) return;
          setData(result);
          setLastUpdated(Date.now());
          setStatus("live");
        } catch {
          if (!disposed && !signal.aborted) setStatus("reconnecting");
        } finally {
          inFlight.current = null;
        }
      })();
    };

    const resume = () => {
      clearInterval(timer);
      if (document.visibilityState !== "visible") return;
      // A changed filter waits for the cancelled request to settle first.
      if (inFlight.current) void inFlight.current.then(refresh);
      else refresh();
      timer = setInterval(refresh, intervalMs);
    };

    refreshRef.current = refresh;
    resume();
    document.addEventListener("visibilitychange", resume);
    window.addEventListener("focus", resume);
    return () => {
      disposed = true;
      clearInterval(timer);
      controller?.abort();
      document.removeEventListener("visibilitychange", resume);
      window.removeEventListener("focus", resume);
    };
  }, [fetcher, intervalMs]);

  const refresh = useCallback(() => refreshRef.current(), []);
  return { data, lastUpdated, status, refresh };
}
