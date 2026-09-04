"use client";

import { useEffect, useRef, useState, useCallback } from "react";

/**
 * Auto-refreshing data hook. Fetches initially and on interval.
 */
export function usePolling<T>(
  fetcher: () => Promise<T>,
  intervalMs: number,
  deps: any[] = []
): { data: T | null; loading: boolean; error: string | null } {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    let mounted = true;

    async function load() {
      try {
        const result = await fetcherRef.current();
        if (mounted) {
          setData(result);
          setError(null);
        }
      } catch (err: any) {
        if (mounted) setError(err.message);
      } finally {
        if (mounted) setLoading(false);
      }
    }

    load();
    const interval = setInterval(load, intervalMs);

    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [intervalMs, ...deps]); // eslint-disable-line react-hooks/exhaustive-deps

  return { data, loading, error };
}

/**
 * WebSocket hook with auto-reconnect.
 */
export function useWebSocket(
  url: string,
  onMessage: (data: any) => void
): { connected: boolean } {
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const onMessageRef = useRef(onMessage);
  onMessageRef.current = onMessage;

  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let mounted = true;

    function connect() {
      if (!mounted) return;
      try {
        const ws = new WebSocket(url);
        wsRef.current = ws;

        ws.onopen = () => {
          if (mounted) setConnected(true);
        };

        ws.onmessage = (event) => {
          try {
            onMessageRef.current(JSON.parse(event.data));
          } catch {}
        };

        ws.onclose = () => {
          if (mounted) {
            setConnected(false);
            reconnectTimeout = setTimeout(connect, 3000);
          }
        };

        ws.onerror = () => {
          ws.close();
        };
      } catch {}
    }

    connect();

    return () => {
      mounted = false;
      clearTimeout(reconnectTimeout);
      wsRef.current?.close();
    };
  }, [url]);

  return { connected };
}
