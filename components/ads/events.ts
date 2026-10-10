"use client";

import type { AdEventType } from "@/lib/validation";

export type AdEventPayload = {
  adId: string;
  provider: string;
  slot: string;
  type: AdEventType;
  petId?: string;
  browserId?: string;
};

/** Fire-and-forget ad event. Uses sendBeacon (survives navigation), falls back to fetch keepalive. */
export function sendAdEvent(event: AdEventPayload): void {
  const body = JSON.stringify(event);
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      // A plain string is sent as text/plain (no CORS preflight); the route parses text.
      if (navigator.sendBeacon("/api/ads/events", body)) return;
    }
  } catch {
    // fall through to fetch
  }
  fetch("/api/ads/events", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {});
}
