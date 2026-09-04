"use client";

import Link from "next/link";
import { pct, spreadColor, timeAgo, categoryBadgeClass } from "@/lib/format";

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

export function SpreadTable({ rows }: { rows: SpreadRow[] }) {
  return (
    <div className="card" style={{ padding: 0, overflow: "hidden" }}>
      <table>
        <thead>
          <tr>
            <th>Market</th>
            <th>Category</th>
            <th style={{ textAlign: "right" }}>Polymarket</th>
            <th style={{ textAlign: "right" }}>Kalshi</th>
            <th style={{ textAlign: "right" }}>Spread</th>
            <th style={{ textAlign: "right" }}>Fee-Adj</th>
            <th style={{ textAlign: "right" }}>Updated</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.marketPairId}>
              <td>
                <Link
                  href={`/market/${row.marketPairId}`}
                  style={{ color: "var(--text-primary)", fontWeight: 500 }}
                >
                  {row.label}
                </Link>
              </td>
              <td>
                <span className={`badge ${categoryBadgeClass(row.category)}`}>
                  {row.category}
                </span>
              </td>
              <td
                className="mono"
                style={{ textAlign: "right", color: "var(--accent-purple)" }}
              >
                {pct(row.spread?.polymarketProb)}
              </td>
              <td
                className="mono"
                style={{ textAlign: "right", color: "var(--accent-blue)" }}
              >
                {pct(row.spread?.kalshiProb)}
              </td>
              <td
                className="mono"
                style={{
                  textAlign: "right",
                  color: spreadColor(row.spread?.spread ?? null),
                  fontWeight: 600,
                }}
              >
                {pct(row.spread?.spread)}
              </td>
              <td
                className="mono"
                style={{
                  textAlign: "right",
                  color: spreadColor(row.spread?.feeAdjustedSpread ?? null),
                }}
              >
                {pct(row.spread?.feeAdjustedSpread)}
              </td>
              <td
                style={{
                  textAlign: "right",
                  color: "var(--text-muted)",
                  fontSize: 12,
                }}
              >
                {timeAgo(row.spread?.timestamp)}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td
                colSpan={7}
                style={{
                  textAlign: "center",
                  padding: 40,
                  color: "var(--text-muted)",
                }}
              >
                No market data available yet. Waiting for ingestion workers...
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
