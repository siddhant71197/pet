import type { Ad, AdContext, AdProvider } from "./types";
import { placeholderAds } from "./placeholder";

// CLP direct-ads provider (stub).
// Reads CLP_API_URL and CLP_API_KEY. When either is unset it serves placeholder
// ads (logging once) so the app keeps working in dev.

let warnedUnconfigured = false;

export const clpProvider: AdProvider = {
  name: "clp",
  async getAds(ctx: AdContext, limit: number): Promise<Ad[]> {
    const url = process.env.CLP_API_URL;
    const key = process.env.CLP_API_KEY;
    if (!url || !key) {
      if (!warnedUnconfigured) {
        warnedUnconfigured = true;
        console.warn("[ads] AD_PROVIDER=clp but CLP_API_URL/CLP_API_KEY unset; serving placeholder ads.");
      }
      return placeholderAds(ctx, limit, "placeholder");
    }

    const endpoint = new URL(url);
    endpoint.searchParams.set("slot", ctx.slot);
    endpoint.searchParams.set("limit", String(limit));
    if (ctx.petType) endpoint.searchParams.set("petType", ctx.petType);
    if (ctx.ageMonths !== undefined) endpoint.searchParams.set("ageMonths", String(ctx.ageMonths));
    if (ctx.zip) endpoint.searchParams.set("zip", ctx.zip);

    const res = await fetch(endpoint, {
      headers: { Authorization: `Bearer ${key}`, Accept: "application/json" },
      cache: "no-store",
      signal: AbortSignal.timeout(3000),
    });
    if (!res.ok) throw new Error(`CLP responded ${res.status}`);
    const json: unknown = await res.json();

    // TODO(clp): map the real CLP response shape to Ad[] once the API contract
    // is known (creative id, partner, copy, images, click URL vs lead form,
    // disclosure). Until then nothing is mapped and we fall back to placeholders.
    void json;
    return placeholderAds(ctx, limit, "placeholder");
  },
};
