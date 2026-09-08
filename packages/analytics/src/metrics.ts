/**
 * Simple in-process metrics for observability.
 * In production, these would feed into Prometheus/Datadog.
 */

interface AnalyticsMetrics {
  eventsProcessed: number;
  liquiditySnapshotsWritten: number;
  leadLagComputations: number;
  errors: number;
}

const metrics: AnalyticsMetrics = {
  eventsProcessed: 0,
  liquiditySnapshotsWritten: 0,
  leadLagComputations: 0,
  errors: 0,
};

export function incr(key: keyof AnalyticsMetrics): void {
  metrics[key]++;
}

export function getMetrics(): AnalyticsMetrics & { uptimeSeconds: number } {
  return {
    ...metrics,
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

setInterval(() => {
  const m = getMetrics();
  console.log(
    `[analytics-metrics] events=${m.eventsProcessed} ` +
      `liquidity=${m.liquiditySnapshotsWritten} lead-lag=${m.leadLagComputations} ` +
      `errors=${m.errors} uptime=${m.uptimeSeconds}s`
  );
}, 60_000);
