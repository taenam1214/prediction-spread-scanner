"use client";

import { LineChart, Line, ResponsiveContainer, YAxis } from "recharts";

interface Props {
  data: number[];
  color?: string;
  height?: number;
}

export function SpreadSparkline({
  data,
  color = "#4d9fff",
  height = 32,
}: Props) {
  if (data.length === 0) return null;

  const chartData = data.map((v, i) => ({ i, v }));

  return (
    <ResponsiveContainer width={80} height={height}>
      <LineChart data={chartData}>
        <YAxis hide domain={["dataMin", "dataMax"]} />
        <Line
          type="monotone"
          dataKey="v"
          stroke={color}
          strokeWidth={1.5}
          dot={false}
          isAnimationActive={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
