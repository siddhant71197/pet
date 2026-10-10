"use client";

import { useCallback, useLayoutEffect, useRef, useState } from "react";
import type { Ad } from "@/lib/ads/types";
import { LeadFormModal } from "./LeadFormModal";
import { trackClick, useAds, useImpression, type AdTargeting } from "./useAds";

const SLOT = "tray" as const;


export type AdTrayProps = AdTargeting & {
  /** Used in the heading, e.g. "Protect Bruno from surprise vet bills". */
  petName?: string;
  className?: string;
};

/** Horizontally scrollable tray of insurer tiles. Each tile opens the lead form. */
export function AdTray({ petName, petType, ageMonths, petId, className = "" }: AdTrayProps) {
  const ads = useAds(SLOT, 5, { petType, ageMonths, petId });
  const [leadAd, setLeadAd] = useState<Ad | null>(null);
  const scroller = useRef<HTMLDivElement>(null);

  // Activity hides (not unmounts) this component: drop any open modal on hide.
  useLayoutEffect(() => () => setLeadAd(null), []);

  const open = useCallback(
    (ad: Ad) => {
      trackClick(ad, SLOT, petId);
      if (ad.action.type === "lead_form") setLeadAd(ad);
    },
    [petId],
  );
  const close = useCallback(() => setLeadAd(null), []);

  const scrollBy = (dir: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * Math.max(260, el.clientWidth * 0.8), behavior: "smooth" });
  };

  if (ads !== undefined && ads.length === 0) return null;

  const disclosure = ads?.[0]?.disclosure ?? "Sponsored. Coverage terms vary.";

  // Fixed 150px tall: 10px padding + 20px header + 8px gap + 100px tiles + 2px border.
  return (
    <section
      aria-label="Sponsored: pet insurance offers"
      className={`h-[150px] overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 via-white to-teal-50 px-3 py-2.5 shadow-sm dark:border-amber-500/20 dark:from-amber-950/30 dark:via-stone-900 dark:to-teal-950/30 ${className}`}
    >
      <div className="flex h-5 items-center gap-2">
        <span
          title={disclosure}
          className="shrink-0 rounded-full bg-amber-100 px-1.5 text-[10px] leading-4 font-semibold tracking-wide text-amber-800 uppercase dark:bg-amber-500/15 dark:text-amber-300"
        >
          Sponsored
        </span>
        <h2 className="min-w-0 flex-1 truncate text-sm leading-5 font-semibold text-stone-900 dark:text-stone-100">
          <span aria-hidden="true">🛡️ </span>Protect {petName ?? "your pet"} from surprise vet bills
          <span className="hidden font-normal text-stone-600 sm:inline dark:text-stone-300">
            {" "}
            · Insurance pays back most of the bill for accidents &amp; illness
          </span>
        </h2>
        <span className="sr-only">{disclosure}</span>
        <div className="hidden shrink-0 gap-1 sm:flex">
          <ScrollButton label="Previous insurers" onClick={() => scrollBy(-1)}>
            ‹
          </ScrollButton>
          <ScrollButton label="More insurers" onClick={() => scrollBy(1)}>
            ›
          </ScrollButton>
        </div>
      </div>

      <div
        ref={scroller}
        className="-mx-3 mt-2 flex h-[100px] snap-x snap-mandatory scroll-px-3 gap-2.5 overflow-x-auto overflow-y-hidden scroll-smooth px-3 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {ads === undefined
          ? Array.from({ length: 4 }, (_, i) => (
              <div
                key={i}
                aria-hidden="true"
                className="h-[100px] w-72 shrink-0 animate-pulse rounded-2xl border border-stone-200 bg-white/70 dark:border-stone-700 dark:bg-stone-800/60"
              />
            ))
          : ads.map((ad) => <InsurerTile key={ad.id} ad={ad} petId={petId} onOpen={open} />)}
      </div>

      <LeadFormModal ad={leadAd} petId={petId} onClose={close} />
    </section>
  );
}

function InsurerTile({ ad, petId, onOpen }: { ad: Ad; petId?: string; onOpen: (ad: Ad) => void }) {
  const ref = useRef<HTMLElement>(null);
  useImpression(ref, ad, SLOT, petId);
  const color = ad.brandColor ?? "#0d9488";
  const initial = ad.partnerName.trim().charAt(0).toUpperCase() || "?";

  return (
    <article
      ref={ref}
      title={(ad.benefits ?? [ad.body]).join(" · ")}
      className="flex h-[100px] w-72 shrink-0 snap-start items-center gap-3 rounded-2xl border border-stone-200 bg-white px-3 dark:border-stone-700 dark:bg-stone-900"
    >
      <span
        aria-hidden="true"
        className="flex size-10 shrink-0 items-center justify-center rounded-xl text-base font-bold text-white"
        style={{ backgroundColor: color }}
      >
        {initial}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-stone-900 dark:text-stone-100">
          {ad.partnerName}
        </p>
        {ad.highlight ? (
          <p className="truncate text-xs font-semibold" style={{ color }}>
            {ad.highlight}
          </p>
        ) : null}
        <p className="truncate text-xs text-stone-600 dark:text-stone-400">
          <span aria-hidden="true" className="text-emerald-600 dark:text-emerald-400">
            ✓{" "}
          </span>
          {ad.benefits?.[0] ?? ad.headline}
        </p>
      </div>
      <button
        type="button"
        onClick={() => onOpen(ad)}
        aria-haspopup="dialog"
        aria-label={`${ad.ctaLabel}: ${ad.partnerName}`}
        className="inline-flex h-8 shrink-0 items-center justify-center rounded-full bg-emerald-600 px-3 text-xs font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400"
      >
        Quote
      </button>
    </article>
  );
}

function ScrollButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: string;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="flex size-5 items-center justify-center rounded-full bg-white text-sm leading-none text-stone-700 shadow-sm ring-1 ring-stone-200 transition hover:bg-stone-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:bg-stone-800 dark:text-stone-200 dark:ring-stone-700 dark:hover:bg-stone-700"
    >
      <span aria-hidden="true">{children}</span>
    </button>
  );
}

export default AdTray;
