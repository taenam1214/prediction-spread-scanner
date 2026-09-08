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
} from "recharts";
import type { LiquidityRow } from "@/lib/api";

export function LiquidityChart({ data }: { data: LiquidityRow[] }) {
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
        No liquidity data available.
      </div>
    );
  }

  // Merge poly + kalshi rows by timestamp into chart-friendly format
  const timeMap = new Map<
    string,
    { time: string; polyLiquidity?: number; kalshiLiquidity?: number }
  >();

  // Sort chronologically
  const sorted = [...data].sort(
    (a, b) =>
      new Date(a.captured_at).getTime() - new Date(b.captured_at).getTime()
  );

  for (const row of sorted) {
    const timeKey = new Date(row.captured_at).toISOString().slice(0, 16); // min granularity
    const existing = timeMap.get(timeKey) ?? { time: timeKey };

    if (row.platform === "polymarket") {
      existing.polyLiquidity = row.liquidity_index;
    } else {
      existing.kalshiLiquidity = row.liquidity_index;
    }

    timeMap.set(timeKey, existing);
  }

  const chartData = Array.from(timeMap.values());

  return (
    <div className="card" style={{ padding: "20px 12px" }}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
          <XAxis
            dataKey="time"
            stroke="#555570"
            fontSize={10}
            tick={{ fill: "#555570" }}
            tickFormatter={(v: string) =>
              new Date(v).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })
            }
          />
          <YAxis
            stroke="#555570"
            fontSize={11}
            tick={{ fill: "#555570" }}
            domain={[0, 100]}
            tickFormatter={(v: number) => `${v}`}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1a2e",
              border: "1px solid #2a2a3e",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelFormatter={(v: string) =>
              new Date(v).toLocaleString()
            }
            formatter={(value: number, name: string) => [
              value.toFixed(1),
              name === "polyLiquidity" ? "Polymarket" : "Kalshi",
            ]}
          />
          <Legend
            formatter={(value: string) =>
              value === "polyLiquidity" ? "Polymarket" : "Kalshi"
            }
          />
          <Line
            type="monotone"
            dataKey="polyLiquidity"
            stroke="#4c90f0"
            strokeWidth={2}
            dot={false}
          />
          <Line
            type="monotone"
            dataKey="kalshiLiquidity"
            stroke="#f0c040"
            strokeWidth={2}
            dot={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
