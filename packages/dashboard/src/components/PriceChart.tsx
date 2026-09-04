"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  ReferenceLine,
} from "recharts";
import type { PriceHistoryRow } from "@/lib/api";

interface ChartDataPoint {
  time: string;
  polymarket: number | null;
  kalshi: number | null;
}

function buildChartData(history: PriceHistoryRow[]): ChartDataPoint[] {
  // Group by timestamp (approximate — round to 5s buckets)
  const buckets = new Map<string, ChartDataPoint>();

  // History comes in DESC order, reverse for chronological chart
  const sorted = [...history].reverse();

  for (const row of sorted) {
    const t = new Date(row.captured_at);
    const key = new Date(
      Math.floor(t.getTime() / 5000) * 5000
    ).toISOString();

    if (!buckets.has(key)) {
      buckets.set(key, { time: key, polymarket: null, kalshi: null });
    }

    const point = buckets.get(key)!;
    const prob = row.implied_probability;

    if (row.platform === "polymarket") {
      point.polymarket = prob;
    } else {
      point.kalshi = prob;
    }
  }

  return Array.from(buckets.values());
}

function formatTime(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatPct(val: number): string {
  return `${(val * 100).toFixed(1)}%`;
}

export function PriceChart({ history }: { history: PriceHistoryRow[] }) {
  const data = buildChartData(history);

  if (data.length === 0) {
    return (
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
        No price history available yet.
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "20px 12px" }}>
      <ResponsiveContainer width="100%" height={360}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
          <XAxis
            dataKey="time"
            tickFormatter={formatTime}
            stroke="#555570"
            fontSize={11}
            tick={{ fill: "#555570" }}
          />
          <YAxis
            tickFormatter={formatPct}
            domain={[0, 1]}
            stroke="#555570"
            fontSize={11}
            tick={{ fill: "#555570" }}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1a2e",
              border: "1px solid #2a2a3e",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={formatTime}
            formatter={(value: number) => formatPct(value)}
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "#8888a0" }}
          />
          <ReferenceLine y={0.5} stroke="#2a2a3e" strokeDasharray="5 5" />
          <Line
            type="monotone"
            dataKey="polymarket"
            stroke="#a855f7"
            strokeWidth={2}
            dot={false}
            connectNulls
            name="Polymarket"
          />
          <Line
            type="monotone"
            dataKey="kalshi"
            stroke="#4d9fff"
            strokeWidth={2}
            dot={false}
            connectNulls
            name="Kalshi"
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
