// Shared ad types. Safe to import from both server and client code.

export const AD_SLOTS = ["home", "sidebar", "inline", "tray", "sticky"] as const;
export type AdSlotId = (typeof AD_SLOTS)[number];

/** What the page knows about where the ad will show. All but `slot` optional. */
export type AdContext = {
  slot: AdSlotId;
  petType?: "dog" | "cat";
  ageMonths?: number;
  zip?: string;
  petId?: string;
};

export type AdAction = { type: "lead_form" } | { type: "url"; href: string };

export type Ad = {
  /** Stable per creative; used for event reporting. */
  id: string;
  /** Name of the provider that served the ad (AdProvider.name). */
  provider: string;
  partnerName: string;
  headline: string;
  body: string;
  ctaLabel: string;
  imageUrl: string | null;
  logoUrl: string | null;
  /** Short legal/disclosure line shown under the ad. */
  disclosure: string;
  /** Optional benefit bullets (shown on tray tiles). */
  benefits?: string[];
  /** Optional short highlight, e.g. "Up to 90% back on vet bills". */
  highlight?: string;
  /** Optional brand color (CSS color) for the insurer mark. */
  brandColor?: string;
  action: AdAction;
};

export interface AdProvider {
  readonly name: string;
  /** May throw; callers go through getAds() in lib/ads/index.ts, which never does. */
  getAds(ctx: AdContext, limit: number): Promise<Ad[]>;
}
