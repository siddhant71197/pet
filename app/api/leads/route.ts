import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { LeadInputSchema } from "@/lib/validation";
import { createRateLimiter } from "@/lib/rate-limit";

// 5 leads per browser (or IP when no browserId) per hour.
const leadLimiter = createRateLimiter({ limit: 5, windowMs: 60 * 60 * 1000 });

// POST /api/leads  body: LeadInput -> 200 { ok: true }
// 400 { error, fieldErrors } | 429 { error }
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const parsed = LeadInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid input",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const key =
    data.browserId ?? request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "anon";
  const limit = leadLimiter.check(`lead:${key}`);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  await prisma.insuranceLead.create({
    data: {
      name: data.name,
      age: data.age,
      email: data.email,
      zipcode: data.zipcode,
      petId: data.petId || null,
      sourceAd: data.sourceAd || null,
      adProvider: data.adProvider || null,
      browserId: data.browserId || null,
    },
  });

  if (data.sourceAd) {
    try {
      await prisma.adEvent.create({
        data: {
          adId: data.sourceAd,
          provider: data.adProvider || "unknown",
          slot: "lead_form",
          type: "lead",
          petId: data.petId || null,
          browserId: data.browserId || null,
        },
      });
    } catch (err) {
      console.error("[ads] failed to record lead event", err);
    }
  }

  return NextResponse.json({ ok: true });
}
