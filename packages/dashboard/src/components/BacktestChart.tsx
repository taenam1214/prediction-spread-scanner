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

interface BacktestEntry {
  label: string;
  pnl: number;
  outcome: string;
}

export function BacktestChart({ entries }: { entries: BacktestEntry[] }) {
  if (entries.length === 0) {
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
        No backtest data available. Run a backtest first.
      </div>
    );
  }

  return (
    <div className="card" style={{ padding: "20px 12px" }}>
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={entries}>
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
            tickFormatter={(v: number) => `$${v.toFixed(0)}`}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1a2e",
              border: "1px solid #2a2a3e",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number) => [`$${value.toFixed(2)}`, "P&L"]}
          />
          <Bar dataKey="pnl" radius={[4, 4, 0, 0]}>
            {entries.map((entry, index) => (
              <Cell
                key={index}
                fill={entry.pnl >= 0 ? "#00d68f" : "#ff4d6a"}
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
