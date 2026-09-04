import http from "http";

let lastSuccessfulPoll = 0;

export function recordSuccessfulPoll(): void {
  lastSuccessfulPoll = Date.now();
}

export function startHealthServer(port = 8082): void {
  const server = http.createServer((req, res) => {
    if (req.url === "/health") {
      const staleMs = Date.now() - lastSuccessfulPoll;
      const healthy = lastSuccessfulPoll > 0 && staleMs < 60_000;
      res.writeHead(healthy ? 200 : 503);
      res.end(
        JSON.stringify({
          status: healthy ? "ok" : "stale",
          lastPollMs: staleMs,
          service: "ingestion-kalshi",
        })
      );
    } else {
      res.writeHead(404);
      res.end();
    }
  });

  server.listen(port, () => {
    console.log(`[kalshi] Health server on :${port}`);
  });
}
