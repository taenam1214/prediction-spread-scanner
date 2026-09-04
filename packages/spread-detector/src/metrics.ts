interface DetectorMetrics {
  eventsProcessed: number;
  opportunitiesDetected: number;
  opportunitiesClosed: number;
  spreadsComputed: number;
  errors: number;
}

const metrics: DetectorMetrics = {
  eventsProcessed: 0,
  opportunitiesDetected: 0,
  opportunitiesClosed: 0,
  spreadsComputed: 0,
  errors: 0,
};

export function incr(key: keyof DetectorMetrics): void {
  metrics[key]++;
}

export function getMetrics(): DetectorMetrics & { uptimeSeconds: number } {
  return {
    ...metrics,
    uptimeSeconds: Math.floor(process.uptime()),
  };
}

setInterval(() => {
  const m = getMetrics();
  console.log(
    `[detector-metrics] events=${m.eventsProcessed} ` +
      `detected=${m.opportunitiesDetected} closed=${m.opportunitiesClosed} ` +
      `errors=${m.errors} uptime=${m.uptimeSeconds}s`
  );
}, 60_000);
