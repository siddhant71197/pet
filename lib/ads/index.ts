// Ad provider registry.
//
// To add a provider:
//   1. Create lib/ads/<name>.ts exporting an object implementing AdProvider
//      (see lib/ads/types.ts).
//   2. Add one `case "<name>"` to getAdProvider() below.
// Then set AD_PROVIDER=<name>. Pages and components only call getAds() /
// GET /api/ads, so nothing else changes.

import type { Ad, AdContext, AdProvider } from "./types";
import { placeholderAds, placeholderProvider } from "./placeholder";
import { clpProvider } from "./clp";

export type { Ad, AdContext, AdProvider, AdSlotId, AdAction } from "./types";
export { AD_SLOTS } from "./types";

export function getAdProvider(): AdProvider {
  switch ((process.env.AD_PROVIDER ?? "placeholder").trim().toLowerCase()) {
    case "clp":
      return clpProvider;
    case "placeholder":
    default:
      return placeholderProvider;
  }
}

/** Fetches ads for a context. Never throws: on any error, serves placeholders. */
export async function getAds(ctx: AdContext, limit = 1): Promise<Ad[]> {
  const n = Math.max(1, Math.min(8, Math.floor(limit) || 1));
  const provider = getAdProvider();
  try {
    const ads = await provider.getAds(ctx, n);
    return ads.slice(0, n);
  } catch (err) {
    console.error(`[ads] provider "${provider.name}" failed; serving placeholders`, err);
    try {
      return placeholderAds(ctx, n);
    } catch {
      return [];
    }
  }
}
