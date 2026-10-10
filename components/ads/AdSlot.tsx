"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Ad, AdSlotId } from "@/lib/ads/types";
import { useBrowserId, getBrowserId } from "@/lib/client/browser-id";
import { AdCard } from "./AdCard";
import { LeadFormModal } from "./LeadFormModal";
import { sendAdEvent } from "./events";

export type AdSlotProps = {
  slot: AdSlotId;
  petType?: "dog" | "cat";
  ageMonths?: number;
  petId?: string;
  className?: string;
};

type Loaded = { key: string; ads: Ad[] };

/**
 * Client-side ad slot. Renders nothing on the server and a small skeleton until
 * the ad loads; renders nothing if no ad is available.
 */
export function AdSlot({ slot, petType, ageMonths, petId, className = "" }: AdSlotProps) {
  const browserId = useBrowserId();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [leadAd, setLeadAd] = useState<Ad | null>(null);

  const params = new URLSearchParams({ slot, limit: "1" });
  if (petType) params.set("petType", petType);
  if (ageMonths !== undefined) params.set("ageMonths", String(ageMonths));
  if (petId) params.set("petId", petId);
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

  const ad = loaded?.key === key ? (loaded.ads[0] ?? null) : undefined;

  // Impression: once per mounted ad, when at least half of it is visible.
  const containerRef = useRef<HTMLDivElement>(null);
  const impressed = useRef<Set<string>>(new Set());
  useEffect(() => {
    const el = containerRef.current;
    if (!ad || !el || impressed.current.has(ad.id)) return;
    const fire = () => {
      if (impressed.current.has(ad.id)) return;
      impressed.current.add(ad.id);
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
  }, [ad, slot, petId]);

  // Activity hides (not unmounts) this component: drop any open modal on hide.
  useLayoutEffect(() => () => setLeadAd(null), []);

  const handleActivate = useCallback(() => {
    if (!ad) return;
    sendAdEvent({ adId: ad.id, provider: ad.provider, slot, type: "click", petId, browserId: getBrowserId() });
    if (ad.action.type === "lead_form") setLeadAd(ad);
    // url ads navigate via their <a target="_blank">.
  }, [ad, slot, petId]);

  const closeLead = useCallback(() => setLeadAd(null), []);

  if (!browserId || ad === null) return null;

  if (ad === undefined) {
    return (
      <div
        aria-hidden="true"
        className={`animate-pulse rounded-2xl border border-stone-200 bg-stone-100 p-4 dark:border-stone-800 dark:bg-stone-900 ${slot === "sidebar" ? "h-56" : "h-32"} ${className}`}
      />
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <AdCard ad={ad} slot={slot} onActivate={handleActivate} />
      <LeadFormModal ad={leadAd} petId={petId} onClose={closeLead} />
    </div>
  );
}

export default AdSlot;
