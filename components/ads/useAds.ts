"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import type { Ad, AdSlotId } from "@/lib/ads/types";
import { getBrowserId, useBrowserId } from "@/lib/client/browser-id";
import { sendAdEvent } from "./events";

export type AdTargeting = {
  petType?: "dog" | "cat";
  ageMonths?: number;
  petId?: string;
};

type Loaded = { key: string; ads: Ad[] };

/**
 * Loads ads for a slot. Returns undefined while loading (or before the
 * browser id is known on the client) and [] when none are available.
 */
export function useAds(slot: AdSlotId, limit: number, t: AdTargeting): Ad[] | undefined {
  const browserId = useBrowserId();
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  const params = new URLSearchParams({ slot, limit: String(limit) });
  if (t.petType) params.set("petType", t.petType);
  if (t.ageMonths !== undefined) params.set("ageMonths", String(t.ageMonths));
  if (t.petId) params.set("petId", t.petId);
  const key = params.toString();

  useEffect(() => {
    if (!browserId) return;
    const controller = new AbortController();
    fetch(`/api/ads?${key}`, { signal: controller.signal, cache: "no-store" })
      .then((r) => (r.ok ? r.json() : { ads: [] }))
      .then((data: { ads?: Ad[] }) => setLoaded({ key, ads: Array.isArray(data.ads) ? data.ads : [] }))
      .catch((err: unknown) => {
        if ((err as { name?: string })?.name !== "AbortError") setLoaded({ key, ads: [] });
      });
    return () => controller.abort();
  }, [browserId, key]);

  if (!browserId) return undefined;
  return loaded?.key === key ? loaded.ads : undefined;
}

/** Sends one impression per ad id when at least half of `ref` is visible. */
export function useImpression(
  ref: RefObject<HTMLElement | null>,
  ad: Ad | null | undefined,
  slot: AdSlotId,
  petId?: string,
) {
  const sent = useRef<Set<string>>(new Set());
  useEffect(() => {
    const el = ref.current;
    if (!ad || !el || sent.current.has(ad.id)) return;
    const fire = () => {
      if (sent.current.has(ad.id)) return;
      sent.current.add(ad.id);
      sendAdEvent({ adId: ad.id, provider: ad.provider, slot, type: "impression", petId, browserId: getBrowserId() });
    };
    if (typeof IntersectionObserver === "undefined") {
      fire();
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          fire();
          io.disconnect();
        }
      },
      { threshold: 0.5 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref, ad, slot, petId]);
}

export function trackClick(ad: Ad, slot: AdSlotId, petId?: string) {
  sendAdEvent({ adId: ad.id, provider: ad.provider, slot, type: "click", petId, browserId: getBrowserId() });
}
