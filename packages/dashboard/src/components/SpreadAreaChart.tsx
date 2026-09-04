"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { PriceHistoryRow } from "@/lib/api";

interface SpreadPoint {
  time: string;
  spread: number;
}

function buildSpreadData(history: PriceHistoryRow[]): SpreadPoint[] {
  const byTime = new Map<
    string,
    { polymarket?: number; kalshi?: number }
  >();

  for (const row of [...history].reverse()) {
    const key = new Date(
      Math.floor(new Date(row.captured_at).getTime() / 10_000) * 10_000
    ).toISOString();
    if (!byTime.has(key)) byTime.set(key, {});
    const bucket = byTime.get(key)!;
    if (row.platform === "polymarket") bucket.polymarket = row.implied_probability;
    else bucket.kalshi = row.implied_probability;
  }

  const points: SpreadPoint[] = [];
  for (const [time, bucket] of byTime) {
    if (bucket.polymarket != null && bucket.kalshi != null) {
      points.push({
        time,
        spread: Math.abs(bucket.polymarket - bucket.kalshi),
      });
    }
  }

  return points;
}

export function SpreadAreaChart({ history }: { history: PriceHistoryRow[] }) {
  const data = buildSpreadData(history);

  if (data.length === 0) {
    return (
      <div
        className="card"
        style={{
          height: 200,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-muted)",
        }}
      >
        No spread data available.
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "16px 12px" }}>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
          <XAxis
            dataKey="time"
            tickFormatter={(t: string) =>
              new Date(t).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
            stroke="#555570"
            fontSize={10}
            tick={{ fill: "#555570" }}
          />
          <YAxis
            tickFormatter={(v: number) => `${(v * 100).toFixed(1)}%`}
            stroke="#555570"
            fontSize={10}
            tick={{ fill: "#555570" }}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1a2e",
              border: "1px solid #2a2a3e",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(v: number) => [`${(v * 100).toFixed(2)}%`, "Spread"]}
          />
          <defs>
            <linearGradient id="spreadGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#f97316" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#f97316" stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="spread"
            stroke="#f97316"
            strokeWidth={2}
            fill="url(#spreadGrad)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
