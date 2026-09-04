"use client";

import { useEffect, useState } from "react";
import { BacktestChart } from "@/components/BacktestChart";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001";

interface BacktestResult {
  totalOpportunities: number;
  hitRate: number;
  theoreticalPnl: number;
  avgSpread: number;
  avgTimeToConvergenceMs: number;
  entries: Array<{
    marketPairId: number;
    label: string;
    entrySpread: number;
    exitSpread: number;
    outcome: string;
    pnl: number;
    holdDurationMs: number;
  }>;
}

export default function BacktestPage() {
  const [result, setResult] = useState<BacktestResult | null>(null);
  const [threshold, setThreshold] = useState("3");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function runBacktest() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `${API_BASE}/api/backtest?threshold=${parseFloat(threshold) / 100}`
      );
      if (!res.ok) throw new Error(`API error: ${res.status}`);
      const data = await res.json();
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Backtest Engine
      </h1>

      <div className="card" style={{ marginBottom: 24 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            Fee-adjusted threshold (%)
            <input
              type="number"
              value={threshold}
              onChange={(e) => setThreshold(e.target.value)}
              min="0.5"
              max="20"
              step="0.5"
              style={{
                width: 70,
                padding: "6px 10px",
                background: "var(--bg-secondary)",
                border: "1px solid var(--border)",
                borderRadius: 6,
                color: "var(--text-primary)",
                fontSize: 14,
              }}
            />
          </label>
          <button
            onClick={runBacktest}
            disabled={loading}
            style={{
              padding: "8px 20px",
              background: "var(--accent-blue)",
              color: "#fff",
              border: "none",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
              opacity: loading ? 0.6 : 1,
            }}
          >
            {loading ? "Running..." : "Run Backtest"}
          </button>
        </div>
        {error && (
          <p style={{ color: "var(--accent-red)", marginTop: 12, fontSize: 13 }}>
            {error}
          </p>
        )}
      </div>

      {result && (
        <>
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                Total Opportunities
              </div>
              <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>
                {result.totalOpportunities}
              </div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                Hit Rate
              </div>
              <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: result.hitRate >= 0.5 ? "var(--accent-green)" : "var(--accent-red)" }}>
                {(result.hitRate * 100).toFixed(1)}%
              </div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                Theoretical P&L
              </div>
              <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: result.theoreticalPnl >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                ${result.theoreticalPnl.toFixed(2)}
              </div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                Avg Convergence
              </div>
              <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-yellow)" }}>
                {(result.avgTimeToConvergenceMs / 60000).toFixed(1)}m
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
            P&L by Opportunity
          </h2>
          <BacktestChart entries={result.entries} />

          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginTop: 32, marginBottom: 12 }}>
            Detailed Results
          </h2>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table>
              <thead>
                <tr>
                  <th>Market</th>
                  <th>Outcome</th>
                  <th style={{ textAlign: "right" }}>Entry Spread</th>
                  <th style={{ textAlign: "right" }}>Exit Spread</th>
                  <th style={{ textAlign: "right" }}>P&L</th>
                  <th style={{ textAlign: "right" }}>Hold Duration</th>
                </tr>
              </thead>
              <tbody>
                {result.entries.map((entry, i) => (
                  <tr key={i}>
                    <td style={{ fontWeight: 500 }}>{entry.label}</td>
                    <td>
                      <span className={`badge ${entry.outcome === "win" ? "badge-green" : entry.outcome === "loss" ? "badge-red" : "badge-yellow"}`}>
                        {entry.outcome.toUpperCase()}
                      </span>
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>
                      {(entry.entrySpread * 100).toFixed(2)}%
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>
                      {(entry.exitSpread * 100).toFixed(2)}%
                    </td>
                    <td className="mono" style={{ textAlign: "right", color: entry.pnl >= 0 ? "var(--accent-green)" : "var(--accent-red)", fontWeight: 600 }}>
                      ${entry.pnl.toFixed(2)}
                    </td>
                    <td style={{ textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                      {(entry.holdDurationMs / 60000).toFixed(1)}m
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
