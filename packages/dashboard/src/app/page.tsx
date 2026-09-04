"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { SpreadTable } from "@/components/SpreadTable";
import { StatsBar } from "@/components/StatsBar";
import { LiveIndicator } from "@/components/LiveIndicator";
import { getSpreads, getOpportunities, createSpreadWebSocket } from "@/lib/api";

interface SpreadRow {
  marketPairId: number;
  label: string;
  category: string;
  spread: {
    polymarketProb: number;
    kalshiProb: number;
    spread: number;
    feeAdjustedSpread: number;
    timestamp: string;
  } | null;
}

export default function LiveViewPage() {
  const [rows, setRows] = useState<SpreadRow[]>([]);
  const [openCount, setOpenCount] = useState(0);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Initial data fetch
  useEffect(() => {
    async function load() {
      try {
        const [spreads, opps] = await Promise.all([
          getSpreads(),
          getOpportunities(100, true),
        ]);
        setRows(spreads);
        setOpenCount(opps.length);
      } catch (err) {
        console.error("Failed to load initial data:", err);
      }
    }
    load();
  }, []);

  // WebSocket connection for live updates
  const handleWsMessage = useCallback((data: any) => {
    if (data.type === "spread_update" && data.spreads) {
      setRows(
        data.spreads.map((s: any) => ({
          marketPairId: s.marketPairId,
          label: s.label,
          category: s.category,
          spread: s.spread,
        }))
      );
    }
  }, []);

  useEffect(() => {
    try {
      const ws = createSpreadWebSocket(handleWsMessage);
      wsRef.current = ws;
      ws.onopen = () => setConnected(true);
      ws.onclose = () => setConnected(false);
      ws.onerror = () => setConnected(false);

      return () => {
        ws.close();
      };
    } catch {
      // WebSocket not available (SSR or connection failed)
    }
  }, [handleWsMessage]);

  // Compute stats
  const spreadsWithData = rows.filter((r) => r.spread != null);
  const avgSpread =
    spreadsWithData.length > 0
      ? spreadsWithData.reduce((sum, r) => sum + (r.spread?.spread ?? 0), 0) /
        spreadsWithData.length
      : 0;
  const maxSpread = Math.max(0, ...spreadsWithData.map((r) => r.spread?.spread ?? 0));

  return (
    <div className="container">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
        }}
      >
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Live Market Spreads</h1>
        <LiveIndicator connected={connected} />
      </div>

      <StatsBar
        totalMarkets={rows.length}
        avgSpread={avgSpread}
        maxSpread={maxSpread}
        openOpportunities={openCount}
      />

      <SpreadTable rows={rows} />
    </div>
  );
}
