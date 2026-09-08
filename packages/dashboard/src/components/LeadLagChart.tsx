"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import type { LeadLagRow } from "@/lib/api";

export function LeadLagChart({ data }: { data: LeadLagRow[] }) {
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
        No lead-lag data available.
      </div>
    );
  }

  const chartData = data.map((row) => ({
    label: row.label,
    lagSeconds: (row.leader === "polymarket" ? 1 : -1) * (row.lag_ms / 1000),
    correlation: row.correlation,
    leader: row.leader,
  }));

  return (
    <div className="card" style={{ padding: "20px 12px" }}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
          <XAxis
            dataKey="label"
            stroke="#555570"
            fontSize={10}
            tick={{ fill: "#555570" }}
            angle={-30}
            textAnchor="end"
            height={60}
          />
          <YAxis
            stroke="#555570"
            fontSize={11}
            tick={{ fill: "#555570" }}
            tickFormatter={(v: number) => `${v.toFixed(0)}s`}
            label={{
              value: "Lag (s) — Poly leads →",
              angle: -90,
              position: "insideLeft",
              fill: "#555570",
              fontSize: 10,
            }}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1a2e",
              border: "1px solid #2a2a3e",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => [
              `${Math.abs(value).toFixed(1)}s`,
              value >= 0 ? "Polymarket leads" : "Kalshi leads",
            ]}
          />
          <Bar dataKey="lagSeconds" radius={[4, 4, 0, 0]}>
            {chartData.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.leader === "polymarket" ? "#4c90f0" : "#f0c040"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
