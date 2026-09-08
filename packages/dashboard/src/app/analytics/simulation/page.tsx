"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  getMarkets,
  simulateExecution,
  simulateExecutionBatch,
} from "@/lib/api";
import type { MarketData, ExecutionSimResult } from "@/lib/api";

export default function SimulationPage() {
  const [markets, setMarkets] = useState<MarketData[]>([]);
  const [selectedMarket, setSelectedMarket] = useState<number | null>(null);
  const [platform, setPlatform] = useState<"polymarket" | "kalshi">("polymarket");
  const [sizeUsd, setSizeUsd] = useState("1000");
  const [latencyMs, setLatencyMs] = useState("200");
  const [result, setResult] = useState<ExecutionSimResult | null>(null);
  const [batchResults, setBatchResults] = useState<ExecutionSimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getMarkets()
      .then((m) => {
        setMarkets(m);
        if (m.length > 0) setSelectedMarket(m[0].id);
      })
      .catch((err) => setError(err.message));
  }, []);

  async function runSingle() {
    if (!selectedMarket) return;
    setLoading(true);
    setError(null);
    try {
      const r = await simulateExecution(
        selectedMarket,
        platform,
        parseFloat(sizeUsd),
        parseFloat(latencyMs)
      );
      setResult(r);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function runBatch() {
    if (!selectedMarket) return;
    setLoading(true);
    setError(null);
    try {
      const results = await simulateExecutionBatch(selectedMarket, platform);
      setBatchResults(results);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Execution Simulator
      </h1>

      {/* Sub-navigation */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <Link href="/analytics" style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: "var(--bg-secondary)", color: "var(--text-secondary)", textDecoration: "none", border: "1px solid var(--border)" }}>
          Overview
        </Link>
        <Link href="/analytics/simulation" style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: "var(--accent-blue)", color: "#fff", textDecoration: "none" }}>
          Execution Simulator
        </Link>
        <Link href="/analytics/calibration" style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: "var(--bg-secondary)", color: "var(--text-secondary)", textDecoration: "none", border: "1px solid var(--border)" }}>
          Calibration Curves
        </Link>
      </div>

      {/* Controls */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
            Market
            <select
              value={selectedMarket ?? ""}
              onChange={(e) => setSelectedMarket(parseInt(e.target.value, 10))}
              style={{ padding: "6px 10px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontSize: 13 }}
            >
              {markets.map((m) => (
                <option key={m.id} value={m.id}>{m.label}</option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
            Platform
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value as "polymarket" | "kalshi")}
              style={{ padding: "6px 10px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontSize: 13 }}
            >
              <option value="polymarket">Polymarket</option>
              <option value="kalshi">Kalshi</option>
            </select>
          </label>

          <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
            Size ($)
            <input
              type="number"
              value={sizeUsd}
              onChange={(e) => setSizeUsd(e.target.value)}
              min="10"
              max="100000"
              step="100"
              style={{ width: 90, padding: "6px 10px", background: "var(--bg-secondary)", border: "1px solid var(--border)", borderRadius: 6, color: "var(--text-primary)", fontSize: 14 }}
            />
          </label>

          <label style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 8 }}>
            Latency (ms)
            <input
              type="range"
              value={latencyMs}
              onChange={(e) => setLatencyMs(e.target.value)}
              min="10"
              max="5000"
              step="10"
              style={{ width: 120 }}
            />
            <span className="mono" style={{ fontSize: 12, minWidth: 50 }}>{latencyMs}ms</span>
          </label>

          <button
            onClick={runSingle}
            disabled={loading || !selectedMarket}
            style={{ padding: "8px 20px", background: "var(--accent-blue)", color: "#fff", border: "none", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
          >
            {loading ? "Simulating..." : "Simulate"}
          </button>

          <button
            onClick={runBatch}
            disabled={loading || !selectedMarket}
            style={{ padding: "8px 20px", background: "var(--bg-secondary)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: loading ? "not-allowed" : "pointer", opacity: loading ? 0.6 : 1 }}
          >
            Batch Matrix
          </button>
        </div>
        {error && (
          <p style={{ color: "var(--accent-red)", marginTop: 12, fontSize: 13 }}>{error}</p>
        )}
      </div>

      {/* Single result */}
      {result && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
            Simulation Result
          </h2>
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Slippage</div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700 }}>{result.slippageBps.toFixed(1)} bps</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Latency Cost</div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700 }}>{result.latencyPenaltyBps.toFixed(1)} bps</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Total Cost</div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: "var(--accent-red)" }}>{result.totalCostBps.toFixed(1)} bps</div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>Expected P&L</div>
              <div className="mono" style={{ fontSize: 24, fontWeight: 700, color: result.profitable ? "var(--accent-green)" : "var(--accent-red)" }}>
                ${result.expectedPnl.toFixed(2)}
              </div>
            </div>
          </div>
        </>
      )}

      {/* Batch results */}
      {batchResults.length > 0 && (
        <>
          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
            Batch Simulation Matrix (Size x Latency)
          </h2>
          <div className="card" style={{ padding: 0, overflow: "auto" }}>
            <table>
              <thead>
                <tr>
                  <th>Size ($)</th>
                  <th style={{ textAlign: "right" }}>Latency (ms)</th>
                  <th style={{ textAlign: "right" }}>Total Cost (bps)</th>
                  <th style={{ textAlign: "right" }}>Expected P&L</th>
                  <th>Profitable</th>
                </tr>
              </thead>
              <tbody>
                {batchResults.map((r, i) => (
                  <tr key={i}>
                    <td className="mono">${r.request.sizeUsd.toLocaleString()}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{r.request.latencyMs}</td>
                    <td className="mono" style={{ textAlign: "right" }}>{r.totalCostBps.toFixed(1)}</td>
                    <td className="mono" style={{ textAlign: "right", color: r.profitable ? "var(--accent-green)" : "var(--accent-red)", fontWeight: 600 }}>
                      ${r.expectedPnl.toFixed(2)}
                    </td>
                    <td>
                      <span className={`badge ${r.profitable ? "badge-green" : "badge-red"}`}>
                        {r.profitable ? "YES" : "NO"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
