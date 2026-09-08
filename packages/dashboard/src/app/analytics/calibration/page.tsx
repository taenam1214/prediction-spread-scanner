"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getCalibration } from "@/lib/api";
import type { CalibrationData } from "@/lib/api";
import { CalibrationChart } from "@/components/CalibrationChart";

export default function CalibrationPage() {
  const [platform, setPlatform] = useState<"polymarket" | "kalshi">("polymarket");
  const [data, setData] = useState<CalibrationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    setError(null);
    getCalibration(platform)
      .then((d) => setData(d))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [platform]);

  return (
    <div className="container">
      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        Calibration Curves
      </h1>

      {/* Sub-navigation */}
      <div style={{ display: "flex", gap: 12, marginBottom: 24 }}>
        <Link href="/analytics" style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: "var(--bg-secondary)", color: "var(--text-secondary)", textDecoration: "none", border: "1px solid var(--border)" }}>
          Overview
        </Link>
        <Link href="/analytics/simulation" style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 500, background: "var(--bg-secondary)", color: "var(--text-secondary)", textDecoration: "none", border: "1px solid var(--border)" }}>
          Execution Simulator
        </Link>
        <Link href="/analytics/calibration" style={{ padding: "6px 16px", borderRadius: 6, fontSize: 13, fontWeight: 600, background: "var(--accent-blue)", color: "#fff", textDecoration: "none" }}>
          Calibration Curves
        </Link>
      </div>

      {/* Platform toggle */}
      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <span style={{ fontSize: 13, color: "var(--text-secondary)" }}>Platform:</span>
          <button
            onClick={() => setPlatform("polymarket")}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              background: platform === "polymarket" ? "var(--accent-blue)" : "var(--bg-secondary)",
              color: platform === "polymarket" ? "#fff" : "var(--text-secondary)",
              border: platform === "polymarket" ? "none" : "1px solid var(--border)",
              cursor: "pointer",
            }}
          >
            Polymarket
          </button>
          <button
            onClick={() => setPlatform("kalshi")}
            style={{
              padding: "6px 16px",
              borderRadius: 6,
              fontSize: 13,
              fontWeight: 600,
              background: platform === "kalshi" ? "#f0c040" : "var(--bg-secondary)",
              color: platform === "kalshi" ? "#000" : "var(--text-secondary)",
              border: platform === "kalshi" ? "none" : "1px solid var(--border)",
              cursor: "pointer",
            }}
          >
            Kalshi
          </button>
        </div>
      </div>

      {loading && (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
          Loading calibration data...
        </div>
      )}

      {error && (
        <div className="card" style={{ padding: 40, textAlign: "center", color: "var(--accent-red)" }}>
          Error: {error}
        </div>
      )}

      {data && !loading && (
        <>
          {/* Summary cards */}
          <div className="grid-4" style={{ marginBottom: 24 }}>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                Brier Score
              </div>
              <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: data.brierScore < 0.25 ? "var(--accent-green)" : "var(--accent-red)" }}>
                {data.brierScore.toFixed(4)}
              </div>
              <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                Lower is better (0 = perfect)
              </div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                Resolved Markets
              </div>
              <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>
                {data.totalResolved}
              </div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                Buckets
              </div>
              <div className="mono" style={{ fontSize: 28, fontWeight: 700 }}>
                {data.buckets.length}
              </div>
            </div>
            <div className="card" style={{ textAlign: "center" }}>
              <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", color: "var(--text-muted)", marginBottom: 8 }}>
                Platform
              </div>
              <div className="mono" style={{ fontSize: 28, fontWeight: 700, color: platform === "polymarket" ? "var(--accent-blue)" : "var(--accent-yellow)" }}>
                {platform}
              </div>
            </div>
          </div>

          <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 12 }}>
            Predicted vs Actual (Calibration Scatter)
          </h2>
          <CalibrationChart buckets={data.buckets} />

          {/* Bucket table */}
          {data.buckets.length > 0 && (
            <>
              <h2 style={{ fontSize: 14, fontWeight: 600, color: "var(--text-secondary)", marginTop: 32, marginBottom: 12 }}>
                Calibration Buckets
              </h2>
              <div className="card" style={{ padding: 0, overflow: "hidden" }}>
                <table>
                  <thead>
                    <tr>
                      <th>Bucket Range</th>
                      <th style={{ textAlign: "right" }}>Avg Predicted</th>
                      <th style={{ textAlign: "right" }}>Avg Actual</th>
                      <th style={{ textAlign: "right" }}>Deviation</th>
                      <th style={{ textAlign: "right" }}>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.buckets.map((b, i) => {
                      const deviation = Math.abs(b.avgPredicted - b.avgActual);
                      return (
                        <tr key={i}>
                          <td className="mono">
                            {(b.bucketStart * 100).toFixed(0)}%–{(b.bucketEnd * 100).toFixed(0)}%
                          </td>
                          <td className="mono" style={{ textAlign: "right" }}>
                            {(b.avgPredicted * 100).toFixed(1)}%
                          </td>
                          <td className="mono" style={{ textAlign: "right" }}>
                            {(b.avgActual * 100).toFixed(1)}%
                          </td>
                          <td className="mono" style={{ textAlign: "right", color: deviation < 0.1 ? "var(--accent-green)" : "var(--accent-red)" }}>
                            {(deviation * 100).toFixed(1)}pp
                          </td>
                          <td className="mono" style={{ textAlign: "right" }}>
                            {b.count}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
