"use client";

interface StatCardProps {
  label: string;
  value: string | number;
  subValue?: string;
  color?: string;
}

function StatCard({ label, value, subValue, color }: StatCardProps) {
  return (
    <div className="card" style={{ textAlign: "center" }}>
      <div
        style={{
          fontSize: 11,
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: 0.5,
          color: "var(--text-muted)",
          marginBottom: 8,
        }}
      >
        {label}
      </div>
      <div
        className="mono"
        style={{
          fontSize: 28,
          fontWeight: 700,
          color: color ?? "var(--text-primary)",
        }}
      >
        {value}
      </div>
      {subValue && (
        <div style={{ fontSize: 12, color: "var(--text-secondary)", marginTop: 4 }}>
          {subValue}
        </div>
      )}
    </div>
  );
}

interface StatsBarProps {
  totalMarkets: number;
  avgSpread: number;
  maxSpread: number;
  openOpportunities: number;
}

export function StatsBar({
  totalMarkets,
  avgSpread,
  maxSpread,
  openOpportunities,
}: StatsBarProps) {
  return (
    <div className="grid-4" style={{ marginBottom: 24 }}>
      <StatCard label="Tracked Markets" value={totalMarkets} />
      <StatCard
        label="Avg Spread"
        value={`${(avgSpread * 100).toFixed(2)}%`}
        color="var(--accent-yellow)"
      />
      <StatCard
        label="Max Spread"
        value={`${(maxSpread * 100).toFixed(2)}%`}
        color="var(--accent-red)"
      />
      <StatCard
        label="Open Opportunities"
        value={openOpportunities}
        color={
          openOpportunities > 0 ? "var(--accent-green)" : "var(--text-muted)"
        }
      />
    </div>
  );
}
