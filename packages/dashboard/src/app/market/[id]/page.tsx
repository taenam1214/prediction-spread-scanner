"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { PriceChart } from "@/components/PriceChart";
import { SpreadAreaChart } from "@/components/SpreadAreaChart";
import {
  getMarketHistory,
  getOpportunities,
  type PriceHistoryRow,
  type OpportunityData,
} from "@/lib/api";
import { pct, spreadColor, timeAgo } from "@/lib/format";

export default function MarketDetailPage() {
  const params = useParams();
  const id = parseInt(params.id as string, 10);

  const [history, setHistory] = useState<PriceHistoryRow[]>([]);
  const [opportunities, setOpportunities] = useState<OpportunityData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (isNaN(id)) return;

    Promise.all([getMarketHistory(id, 1000), getOpportunities(50)])
      .then(([hist, opps]) => {
        setHistory(hist);
        setOpportunities(opps.filter((o) => o.market_pair_id === id));
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  // Auto-refresh history every 10s
  useEffect(() => {
    if (isNaN(id)) return;
    const interval = setInterval(() => {
      getMarketHistory(id, 1000).then(setHistory).catch(() => {});
    }, 10_000);
    return () => clearInterval(interval);
  }, [id]);

  if (isNaN(id)) {
    return (
      <div className="container">
        <p style={{ color: "var(--text-muted)" }}>Invalid market ID</p>
      </div>
    );
  }

  const marketLabel =
    opportunities.length > 0 ? opportunities[0].label : `Market #${id}`;

  return (
    <div className="container">
      <div style={{ marginBottom: 16 }}>
        <Link
          href="/"
          style={{ fontSize: 13, color: "var(--text-secondary)" }}
        >
          &larr; Back to Live View
        </Link>
      </div>

      <h1 style={{ fontSize: 22, fontWeight: 700, marginBottom: 24 }}>
        {marketLabel}
      </h1>

      {loading ? (
        <div
          className="card"
          style={{
            height: 300,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text-muted)",
          }}
        >
          Loading price history...
        </div>
      ) : (
        <>
          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginBottom: 12,
            }}
          >
            Price History
          </h2>
          <PriceChart history={history} />

          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginTop: 24,
              marginBottom: 12,
            }}
          >
            Spread Over Time
          </h2>
          <SpreadAreaChart history={history} />

          <h2
            style={{
              fontSize: 14,
              fontWeight: 600,
              color: "var(--text-secondary)",
              marginTop: 32,
              marginBottom: 12,
            }}
          >
            Opportunities for this Market
          </h2>
          <div className="card" style={{ padding: 0, overflow: "hidden" }}>
            <table>
              <thead>
                <tr>
                  <th>Status</th>
                  <th style={{ textAlign: "right" }}>Spread</th>
                  <th style={{ textAlign: "right" }}>Fee-Adj</th>
                  <th style={{ textAlign: "right" }}>Poly</th>
                  <th style={{ textAlign: "right" }}>Kalshi</th>
                  <th style={{ textAlign: "right" }}>Detected</th>
                  <th style={{ textAlign: "right" }}>Closed</th>
                </tr>
              </thead>
              <tbody>
                {opportunities.map((opp) => (
                  <tr key={opp.id}>
                    <td>
                      <span
                        className={`badge ${
                          opp.still_open ? "badge-green" : "badge-red"
                        }`}
                      >
                        {opp.still_open ? "OPEN" : "CLOSED"}
                      </span>
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
                    <td className="mono" style={{ textAlign: "right" }}>
                      {pct(opp.fee_adjusted_spread)}
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>
                      {pct(opp.polymarket_prob)}
                    </td>
                    <td className="mono" style={{ textAlign: "right" }}>
                      {pct(opp.kalshi_prob)}
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
                    <td
                      style={{
                        textAlign: "right",
                        fontSize: 12,
                        color: "var(--text-muted)",
                      }}
                    >
                      {opp.closed_at ? timeAgo(opp.closed_at) : "—"}
                    </td>
                  </tr>
                ))}
                {opportunities.length === 0 && (
                  <tr>
                    <td
                      colSpan={7}
                      style={{
                        textAlign: "center",
                        padding: 32,
                        color: "var(--text-muted)",
                      }}
                    >
                      No opportunities detected for this market.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
