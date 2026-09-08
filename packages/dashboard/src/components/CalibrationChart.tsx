"use client";

import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";
import type { CalibrationBucket } from "@/lib/api";

export function CalibrationChart({
  buckets,
}: {
  buckets: CalibrationBucket[];
}) {
  if (buckets.length === 0) {
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
        No calibration data available. Need resolved markets.
      </div>
    );
  }

  const chartData = buckets.map((b) => ({
    predicted: parseFloat((b.avgPredicted * 100).toFixed(1)),
    actual: parseFloat((b.avgActual * 100).toFixed(1)),
    count: b.count,
  }));

  // Perfect calibration line points
  const perfectLine = [
    { predicted: 0, actual: 0 },
    { predicted: 100, actual: 100 },
  ];

  return (
    <div className="card" style={{ padding: "20px 12px" }}>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2a3e" />
          <XAxis
            type="number"
            dataKey="predicted"
            stroke="#555570"
            fontSize={11}
            tick={{ fill: "#555570" }}
            domain={[0, 100]}
            label={{
              value: "Predicted Probability (%)",
              position: "insideBottom",
              offset: -5,
              fill: "#555570",
              fontSize: 11,
            }}
          />
          <YAxis
            type="number"
            dataKey="actual"
            stroke="#555570"
            fontSize={11}
            tick={{ fill: "#555570" }}
            domain={[0, 100]}
            label={{
              value: "Actual Outcome Rate (%)",
              angle: -90,
              position: "insideLeft",
              fill: "#555570",
              fontSize: 11,
            }}
          />
          <Tooltip
            contentStyle={{
              background: "#1a1a2e",
              border: "1px solid #2a2a3e",
              borderRadius: 8,
              fontSize: 12,
            }}
            formatter={(value: number, name: string) => [
              `${value.toFixed(1)}%`,
              name === "actual" ? "Actual" : "Predicted",
            ]}
          />
          <ReferenceLine
            segment={[
              { x: 0, y: 0 },
              { x: 100, y: 100 },
            ]}
            stroke="#555570"
            strokeDasharray="5 5"
            label={{
              value: "Perfect",
              fill: "#555570",
              fontSize: 10,
              position: "end",
            }}
          />
          <Scatter
            data={chartData}
            fill="#4c90f0"
            stroke="#4c90f0"
            fillOpacity={0.8}
          />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
