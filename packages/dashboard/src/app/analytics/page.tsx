"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import type { AnalyticsSummary, LeadLagRow } from "@/lib/api";
import {
  getAnalyticsSummary,
  getLeadLagResults,
} from "@/lib/api";

export default function AnalyticsPage() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [leadLag, setLeadLag] = useState<LeadLagRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [s, ll] = await Promise.all([
          getAnalyticsSummary(),
          getLeadLagResults(50),
        ]);
        setSummary(s);
        setLeadLag(ll);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="container">
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
          Market Microstructure Analytics
        </h1>
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          Loading analytics data...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
          Market Microstructure Analytics
        </h1>
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--accent-red)" }}>
          Error: {error}
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Market Microstructure Analytics
      </h1>

      {/* Sub-navigation */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <Link
          href="/analytics"
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            background: "var(--accent-blue)",
            color: "#fff",
            textDecoration: "none",
          }}
        >
          Overview
        </Link>
        <Link
          href="/analytics/simulation"
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            background: "var(--bg-secondary)",
            color: "var(--text-secondary)",
            textDecoration: "none",
            border: "1px solid var(--border)",
          }}
        >
          Execution Simulator
        </Link>
        <Link
          href="/analytics/calibration"
          style={{
            padding: "6px 16px",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 500,
            background: "var(--bg-secondary)",
            color: "var(--text-secondary)",
            textDecoration: "none",
            border: "1px solid var(--border)",
          }}
        >
          Calibration Curves
        </Link>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid-4" style={{ marginBottom: 24 }}>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
              Lead-Lag Computations
            </div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>
              {summary.totalLeadLagComputations}
            </div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
              Liquidity Snapshots
            </div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>
              {summary.totalLiquiditySnapshots}
            </div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
              Avg Correlation
            </div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-blue)" }}>
              {summary.avgCorrelation.toFixed(3)}
            </div>
          </div>
          <div className="card" style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
              Dominant Leader
            </div>
            <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: "var(--accent-yellow)" }}>
              {summary.dominantLeader ?? "—"}
            </div>
          </div>
        </div>
      )}

      {/* Lead-Lag Results Table */}
      <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
        Lead-Lag Analysis Results
      </h2>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        {leadLag.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            No lead-lag data yet. The analytics service computes these every 5 minutes.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Market</th>
                <th>Leader</th>
                <th style={{ textAlign: "right" }}>Lag</th>
                <th style={{ textAlign: "right" }}>Correlation</th>
                <th style={{ textAlign: "right" }}>Samples</th>
                <th style={{ textAlign: "right" }}>Computed</th>
              </tr>
            </thead>
            <tbody>
              {leadLag.map((row) => (
                <tr key={row.id}>
                  <td style={{ fontWeight: 500 }}>{row.label}</td>
                  <td>
                    <span
                      className={`badge ${
                        row.leader === "polymarket"
                          ? "badge-blue"
                          : "badge-yellow"
                      }`}
                    >
                      {row.leader}
                    </span>
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>
                    {row.lag_ms >= 60000
                      ? `${(row.lag_ms / 60000).toFixed(1)}m`
                      : `${(row.lag_ms / 1000).toFixed(1)}s`}
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>
                    {row.correlation.toFixed(3)}
                  </td>
                  <td className="mono" style={{ textAlign: "right" }}>
                    {row.sample_size}
                  </td>
                  <td style={{ textAlign: "right", fontSize: 12, color: "var(--text-muted)" }}>
                    {new Date(row.computed_at).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
