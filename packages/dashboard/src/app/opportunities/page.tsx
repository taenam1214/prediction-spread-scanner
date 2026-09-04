"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getOpportunities, type OpportunityData } from "@/lib/api";
import { pct, spreadColor, timeAgo } from "@/lib/format";

export default function OpportunitiesPage() {
  const [opportunities, setOpportunities] = useState<OpportunityData[]>([]);
  const [showOpen, setShowOpen] = useState(false);

  useEffect(() => {
    getOpportunities(100, showOpen).then(setOpportunities).catch(console.error);
  }, [showOpen]);

  // Refresh every 10s
  useEffect(() => {
    const interval = setInterval(() => {
      getOpportunities(100, showOpen).then(setOpportunities).catch(() => {});
    }, 10_000);
    return () => clearInterval(interval);
  }, [showOpen]);

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
        <h1 style={{ fontSize: 22, fontWeight: 700 }}>Detected Opportunities</h1>
        <label
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            fontSize: 13,
            color: "var(--text-secondary)",
            cursor: "pointer",
          }}
        >
          <input
            type="checkbox"
            checked={showOpen}
            onChange={(e) => setShowOpen(e.target.checked)}
          />
          Show open only
        </label>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>Market</th>
              <th>Status</th>
              <th>Cheaper Side</th>
              <th style={{ textAlign: "right" }}>Polymarket</th>
              <th style={{ textAlign: "right" }}>Kalshi</th>
              <th style={{ textAlign: "right" }}>Raw Spread</th>
              <th style={{ textAlign: "right" }}>Fee-Adj</th>
              <th style={{ textAlign: "right" }}>Detected</th>
            </tr>
          </thead>
          <tbody>
            {opportunities.map((opp) => (
              <tr key={opp.id}>
                <td>
                  <Link
                    href={`/market/${opp.market_pair_id}`}
                    style={{ color: "var(--text-primary)", fontWeight: 500 }}
                  >
                    {opp.label}
                  </Link>
                </td>
                <td>
                  <span
                    className={`badge ${opp.still_open ? "badge-green" : "badge-red"}`}
                  >
                    {opp.still_open ? "OPEN" : "CLOSED"}
                  </span>
                </td>
                <td>
                  <span
                    className={`badge ${
                      opp.cheaper_platform === "polymarket"
                        ? "badge-purple"
                        : "badge-blue"
                    }`}
                  >
                    {opp.cheaper_platform}
                  </span>
                </td>
                <td className="mono" style={{ textAlign: "right" }}>
                  {pct(opp.polymarket_prob)}
                </td>
                <td className="mono" style={{ textAlign: "right" }}>
                  {pct(opp.kalshi_prob)}
                </td>
                <td
                  className="mono"
                  style={{
                    textAlign: "right",
                    color: spreadColor(opp.spread),
                    fontWeight: 600,
                  }}
                >
                  {pct(opp.spread)}
                </td>
                <td
                  className="mono"
                  style={{
                    textAlign: "right",
                    color: spreadColor(opp.fee_adjusted_spread),
                  }}
                >
                  {pct(opp.fee_adjusted_spread)}
                </td>
                <td
                  style={{
                    textAlign: "right",
                    fontSize: 12,
                    color: "var(--text-muted)",
                  }}
                >
                  {timeAgo(opp.detected_at)}
                </td>
              </tr>
            ))}
            {opportunities.length === 0 && (
              <tr>
                <td
                  colSpan={8}
                  style={{
                    textAlign: "center",
                    padding: 40,
                    color: "var(--text-muted)",
                  }}
                >
                  No opportunities detected yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
