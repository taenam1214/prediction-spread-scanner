"use client";

import { useEffect, useState } from "react";

export function LiveIndicator({ connected }: { connected: boolean }) {
  const [pulse, setPulse] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => setPulse((p) => !p), 1000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        fontSize: 12,
        color: connected ? "var(--accent-green)" : "var(--accent-red)",
      }}
    >
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: "50%",
          background: connected ? "var(--accent-green)" : "var(--accent-red)",
          opacity: pulse ? 1 : 0.4,
          transition: "opacity 0.5s",
        }}
      />
      {connected ? "Live" : "Disconnected"}
    </div>
  );
}
