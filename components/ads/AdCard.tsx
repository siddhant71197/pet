"use client";

import type { Ad, AdSlotId } from "@/lib/ads/types";

type Props = {
  ad: Ad;
  slot: AdSlotId;
  /** Called on CTA activation (before navigation for url ads). */
  onActivate: () => void;
  className?: string;
};

export function AdCard({ ad, slot, onActivate, className = "" }: Props) {
  const compact = slot === "sidebar";
  const ctaClass =
    "inline-flex items-center justify-center rounded-full bg-emerald-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 dark:bg-emerald-500 dark:text-emerald-950 dark:hover:bg-emerald-400";

  const cta =
    ad.action.type === "url" ? (
      <a
        href={ad.action.href}
        target="_blank"
        rel="sponsored noopener noreferrer"
        onClick={onActivate}
        className={ctaClass}
      >
        {ad.ctaLabel}
      </a>
    ) : (
      <button type="button" onClick={onActivate} className={ctaClass} aria-haspopup="dialog">
        {ad.ctaLabel}
      </button>
    );

  return (
    <aside
      aria-label={`Sponsored: ${ad.partnerName}`}
      className={`relative overflow-hidden rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50 to-white p-4 shadow-sm dark:border-amber-500/20 dark:from-amber-950/40 dark:to-stone-900 ${className}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
          Sponsored
        </span>
        <span className="truncate text-xs text-stone-500 dark:text-stone-400">{ad.partnerName}</span>
      </div>

      <div className={compact ? "flex flex-col gap-3" : "flex flex-col gap-4 sm:flex-row sm:items-center"}>
        {ad.imageUrl || ad.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- third-party creative URLs
          <img
            src={(ad.imageUrl ?? ad.logoUrl) as string}
            alt=""
            className={compact ? "h-28 w-full rounded-xl object-cover" : "h-20 w-20 shrink-0 rounded-xl object-cover"}
          />
        ) : (
          <div
            aria-hidden="true"
            className={`flex shrink-0 items-center justify-center rounded-xl bg-amber-100 text-3xl dark:bg-amber-500/10 ${compact ? "h-16 w-16" : "h-16 w-16 sm:h-20 sm:w-20"}`}
          >
            🛡️
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-stone-900 dark:text-stone-100">{ad.headline}</h3>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-300">{ad.body}</p>
        </div>
        <div className={compact ? "" : "sm:shrink-0"}>{cta}</div>
      </div>

      <p className="mt-3 text-[11px] leading-snug text-stone-400 dark:text-stone-500">{ad.disclosure}</p>
    </aside>
  );
}

export default AdCard;
