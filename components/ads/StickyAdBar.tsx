"use client";

import { useCallback, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import type { Ad } from "@/lib/ads/types";
import { LeadFormModal } from "./LeadFormModal";
import { trackClick, useAds, useImpression, type AdTargeting } from "./useAds";

const SLOT = "sticky" as const;
const DISMISS_KEY = "pets:stickyAdDismissed";

// Dismissal lasts for the browser session. Hidden on the server and until read.
const listeners = new Set<() => void>();
let memoryDismissed = false;
function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}
function setDismissed() {
  try {
    sessionStorage.setItem(DISMISS_KEY, "1");
  } catch {
    // storage blocked: still hide for this page view
    memoryDismissed = true;
  }
  listeners.forEach((l) => l());
}
function useDismissed(): boolean {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => memoryDismissed || readDismissed(),
    () => true,
  );
}

export type StickyAdBarProps = AdTargeting & { petName?: string };

/** Insurance bar pinned to the bottom of the viewport. Dismissible per session. */
export function StickyAdBar({ petName, petType, ageMonths, petId }: StickyAdBarProps) {
  const dismissed = useDismissed();
  const ads = useAds(SLOT, 1, { petType, ageMonths, petId });
  const ad = ads?.[0];
  const [leadAd, setLeadAd] = useState<Ad | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  useImpression(ref, dismissed ? null : ad, SLOT, petId);

  useLayoutEffect(() => () => setLeadAd(null), []);
  const close = useCallback(() => setLeadAd(null), []);

  if (dismissed || !ad) return null;

  const headline = petName ? `Unexpected vet bills? Get ${petName} covered.` : ad.headline;

  return (
    <>
      {/* Spacer so the fixed bar never hides the end of the page. */}
      <div aria-hidden="true" className="h-24 sm:h-20" />
      <div
        ref={ref}
        role="complementary"
        aria-label="Sponsored: pet insurance"
        className="fixed inset-x-0 bottom-0 z-50 border-t border-amber-200 bg-white/95 shadow-[0_-4px_20px_rgba(0,0,0,0.08)] backdrop-blur dark:border-amber-500/20 dark:bg-stone-900/95"
      >
        <div className="mx-auto flex w-full max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <span
            aria-hidden="true"
            className="hidden size-10 shrink-0 items-center justify-center rounded-xl bg-amber-100 text-xl sm:flex dark:bg-amber-500/15"
          >
            🛡️
          </span>
          <div className="min-w-0 flex-1">
            <p className="flex items-center gap-2 text-sm font-semibold text-stone-900 dark:text-stone-100">
              <span className="rounded bg-amber-100 px-1.5 py-px text-[10px] font-semibold tracking-wide text-amber-800 uppercase dark:bg-amber-500/15 dark:text-amber-300">
                Ad
              </span>
              <span className="truncate">{headline}</span>
            </p>
            <p className="truncate text-xs text-stone-600 dark:text-stone-400">{ad.body}</p>
          </div>
          <button
            type="button"
            aria-haspopup="dialog"
            onClick={() => {
              trackClick(ad, SLOT, petId);
              if (ad.action.type === "lead_form") setLeadAd(ad);
              else window.open(ad.action.href, "_blank", "noopener,noreferrer");
            }}
            className="inline-flex h-10 shrink-0 items-center rounded-full bg-emerald-600 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
          >
            {ad.ctaLabel}
          </button>
          <button
            type="button"
            aria-label="Dismiss insurance ad"
            onClick={setDismissed}
            className="flex size-8 shrink-0 items-center justify-center rounded-full text-lg text-stone-400 hover:bg-stone-100 hover:text-stone-700 focus-visible:outline-2 focus-visible:outline-teal-600 dark:hover:bg-stone-800 dark:hover:text-stone-200"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </div>
      <LeadFormModal ad={leadAd} petId={petId} onClose={close} />
    </>
  );
}

export default StickyAdBar;
