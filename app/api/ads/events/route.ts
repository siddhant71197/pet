import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { AdEventSchema } from "@/lib/validation";
import { createRateLimiter } from "@/lib/rate-limit";

// Generous cap to stop runaway clients from flooding the table.
const eventLimiter = createRateLimiter({ limit: 300, windowMs: 60 * 60 * 1000 });

// POST /api/ads/events  body: AdEventInput (JSON; text/plain accepted for sendBeacon)
// -> 204
export async function POST(request: Request) {
  let body: unknown;
  try {
    // sendBeacon may send text/plain, so parse the raw text rather than request.json().
    body = JSON.parse(await request.text());
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const parsed = AdEventSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }
  const e = parsed.data;

  const key =
    e.browserId ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  if (!eventLimiter.check(`ad-event:${key}`).ok) {
    // Drop silently: beacons can't act on errors anyway.
    return new Response(null, { status: 204 });
  }

  try {
    await prisma.adEvent.create({
      data: {
        adId: e.adId,
        provider: e.provider,
        slot: e.slot,
        type: e.type,
        petId: e.petId || null,
        browserId: e.browserId || null,
      },
    });
  } catch (err) {
    console.error("[ads] failed to record event", err);
  }
  return new Response(null, { status: 204 });
}
