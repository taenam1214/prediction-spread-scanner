"use client";

export function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        padding: "16px 24px",
        marginTop: 48,
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        fontSize: 12,
        color: "var(--text-muted)",
      }}
    >
      <span>Prediction Spread Scanner — observation and backtesting only</span>
      <span>
        Data: Polymarket CLOB + Kalshi Trading API
      </span>
    </footer>
  );
}
