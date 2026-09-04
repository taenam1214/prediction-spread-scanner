/**
 * Simple in-process metrics for observability.
 * In production, these would feed into Prometheus/Datadog.
 */

interface Counters {
  messagesProcessed: number;
  normalizeErrors: number;
  snapshotsWritten: number;
  unknownMarkets: number;
}

const counters: Counters = {
  messagesProcessed: 0,
  normalizeErrors: 0,
  snapshotsWritten: 0,
  unknownMarkets: 0,
};

export function incr(key: keyof Counters): void {
  counters[key]++;
}

export function getMetrics(): Counters & { uptimeSeconds: number } {
  return {
    ...counters,
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

// Log metrics every 60s
setInterval(() => {
  const m = getMetrics();
  console.log(
    `[normalizer-metrics] processed=${m.messagesProcessed} ` +
      `written=${m.snapshotsWritten} errors=${m.normalizeErrors} ` +
      `unknown=${m.unknownMarkets} uptime=${m.uptimeSeconds}s`
  );
}, 60_000);
