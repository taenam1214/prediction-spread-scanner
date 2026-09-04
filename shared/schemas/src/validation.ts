import type { NormalizedPriceEvent, RawPriceEvent } from "./index";

export function isValidNormalizedEvent(
  event: Partial<NormalizedPriceEvent>
): event is NormalizedPriceEvent {
  return (
    typeof event.internalMarketId === "string" &&
    (event.platform === "polymarket" || event.platform === "kalshi") &&
    typeof event.platformMarketId === "string" &&
    typeof event.impliedProbability === "number" &&
    event.impliedProbability >= 0 &&
    event.impliedProbability <= 1 &&
    typeof event.bestBid === "number" &&
    typeof event.bestAsk === "number" &&
    typeof event.midpoint === "number" &&
    typeof event.timestamp === "string"
  );
}

export function isValidRawEvent(
  event: Partial<RawPriceEvent>
): event is RawPriceEvent {
  return (
    (event.platform === "polymarket" || event.platform === "kalshi") &&
    typeof event.platformMarketId === "string" &&
    typeof event.rawPayload === "object" &&
    event.rawPayload !== null &&
    typeof event.timestamp === "string"
  );
}

export function clampProbability(p: number): number {
  return Math.max(0, Math.min(1, p));
}
