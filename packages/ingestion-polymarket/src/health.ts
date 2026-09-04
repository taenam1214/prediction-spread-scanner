import http from "http";

let lastSuccessfulPoll = 0;

export function recordSuccessfulPoll(): void {
  lastSuccessfulPoll = Date.now();
}

/**
 * Minimal HTTP health check server for container orchestration.
 * Returns 200 if the last successful poll was within 60 seconds.
 */
export function startHealthServer(port = 8081): void {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      const staleMs = Date.now() - lastSuccessfulPoll;
      const healthy = lastSuccessfulPoll > 0 && staleMs < 60_000;
      res.writeHead(healthy ? 200 : 503);
      res.end(
        JSON.stringify({
          status: healthy ? "ok" : "stale",
          lastPollMs: staleMs,
          service: "ingestion-polymarket",
        })
      );
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, () => {
    console.log(`[polymarket] Health server on :${port}`);
  });
}
