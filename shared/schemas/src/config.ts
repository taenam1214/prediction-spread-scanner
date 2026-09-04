/**
 * Centralized configuration with environment variable fallbacks.
 * All services read from here to ensure consistent defaults.
 */

export interface AppConfig {
  kafka: {
    brokers: string[];
    clientId: string;
  };
  database: {
    connectionString: string;
    maxConnections: number;
  };
  redis: {
    url: string;
    cacheTtlSeconds: number;
  };
  ingestion: {
    pollIntervalMs: number;
    maxRetries: number;
    initialBackoffMs: number;
  };
  spreadDetector: {
    thresholdPct: number;
    closeThresholdRatio: number; // close when spread drops below this fraction of threshold
  };
  api: {
    port: number;
    wsBroadcastIntervalMs: number;
  };
}

export function loadConfig(): AppConfig {
  return {
    kafka: {
      brokers: (process.env.KAFKA_BROKERS ?? "localhost:19092").split(","),
      clientId: process.env.KAFKA_CLIENT_ID ?? "spread-scanner",
    },
    database: {
      connectionString:
        process.env.DATABASE_URL ??
        "postgresql://scanner:scanner_dev_pw@localhost:5432/spread_scanner",
      maxConnections: parseInt(process.env.DB_MAX_CONNECTIONS ?? "10", 10),
    },
    redis: {
      url: process.env.REDIS_URL ?? "redis://localhost:6379",
      cacheTtlSeconds: parseInt(process.env.REDIS_CACHE_TTL ?? "300", 10),
    },
    ingestion: {
      pollIntervalMs: parseInt(process.env.POLL_INTERVAL_MS ?? "5000", 10),
      maxRetries: parseInt(process.env.MAX_RETRIES ?? "10", 10),
      initialBackoffMs: parseInt(
        process.env.INITIAL_BACKOFF_MS ?? "1000",
        10
      ),
    },
    spreadDetector: {
      thresholdPct: parseFloat(process.env.SPREAD_THRESHOLD ?? "0.03"),
      closeThresholdRatio: parseFloat(
        process.env.CLOSE_THRESHOLD_RATIO ?? "0.5"
      ),
    },
    api: {
      port: parseInt(process.env.PORT ?? "3001", 10),
      wsBroadcastIntervalMs: parseInt(
        process.env.WS_BROADCAST_INTERVAL_MS ?? "2000",
        10
      ),
    },
  };
}
