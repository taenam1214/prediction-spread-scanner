export function pct(value: number | null | undefined, decimals = 1): string {
  if (value == null) return "—";
  return `${(value * 100).toFixed(decimals)}%`;
}

export function spreadColor(spread: number | null | undefined): string {
  if (spread == null) return "var(--text-muted)";
  const pctVal = spread * 100;
  if (pctVal >= 5) return "var(--accent-red)";
  if (pctVal >= 3) return "var(--accent-orange)";
  if (pctVal >= 1) return "var(--accent-yellow)";
  return "var(--accent-green)";
}

export function timeAgo(timestamp: string | null | undefined): string {
  if (!timestamp) return "—";
  const diff = Date.now() - new Date(timestamp).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export function categoryBadgeClass(category: string): string {
  switch (category) {
    case "economics": return "badge-blue";
    case "crypto": return "badge-purple";
    case "sports": return "badge-green";
    case "markets": return "badge-yellow";
    default: return "badge-blue";
  }
}
