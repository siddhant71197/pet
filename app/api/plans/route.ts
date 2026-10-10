import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { streamCompletion } from "@/lib/replicate";
import { buildPrompt } from "@/lib/prompts";
import { PlanInputSchema } from "@/lib/validation";
import { generationLimiter } from "@/lib/rate-limit";

const BrowserIdSchema = z.uuid();

function invalidJson() {
  return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
}

// POST /api/plans  body: PlanInput -> text/plain stream of markdown
//   400 invalid body, 404 pet missing or not owned, 429 rate limited,
//   502 model failed before any output (JSON error).
// If the model fails mid-stream, the stream ends with "\n\n[Error: ...]" and
// the plan is NOT saved. On success the full text is saved as a Plan row.
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJson();
  }

  const parsed = PlanInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }
  const { browserId, petId, section, goal } = parsed.data;

  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet || pet.browserId !== browserId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Shared with /api/reminders/suggest: 10 generations per browserId per hour.
  const limit = generationLimiter.check(browserId);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Rate limit reached: 10 plans per hour. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const { prompt, systemPrompt } = buildPrompt(section, pet, goal);
  const iterator = streamCompletion({ prompt, systemPrompt })[Symbol.asyncIterator]();

  // Fetch the first chunk before responding so that failures which happen
  // before any output can still return a proper 502 status.
  let first: IteratorResult<string>;
  try {
    first = await iterator.next();
  } catch (err) {
    console.error("Replicate request failed", err);
    await iterator.return?.(undefined);
    return NextResponse.json({ error: "The plan service failed. Please try again." }, { status: 502 });
  }
  if (first.done) {
    return NextResponse.json({ error: "The plan service returned an empty response." }, { status: 502 });
  }

  const encoder = new TextEncoder();
  let fullText = "";
  let pending: IteratorResult<string> | null = first;

  const stream = new ReadableStream<Uint8Array>({
    async pull(controller) {
      try {
        const result = pending ?? (await iterator.next());
        pending = null;

        if (!result.done) {
          fullText += result.value;
          controller.enqueue(encoder.encode(result.value));
          return;
        }

        await prisma.plan.create({
          data: {
            petId: pet.id,
            section,
            goal: goal || null,
            content: fullText,
          },
        });
        controller.close();
      } catch (err) {
        // Mid-stream failure: tell the client, do not save a partial plan.
        console.error("Plan generation failed", err);
        controller.enqueue(encoder.encode("\n\n[Error: Plan generation failed. Please try again.]"));
        controller.close();
      }
    },
    async cancel() {
      // Client disconnected: stop reading from Replicate.
      await iterator.return?.(undefined);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

// GET /api/plans?petId=...&browserId=...  -> Plan[] (newest first)
//   400 missing or invalid params, 404 pet missing or not owned
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const petId = searchParams.get("petId");
  const browserId = searchParams.get("browserId");

  const fieldErrors: Record<string, string[]> = {};
  if (!petId) fieldErrors.petId = ["Required"];
  if (!browserId || !BrowserIdSchema.safeParse(browserId).success) {
    fieldErrors.browserId = ["Must be a UUID"];
  }
  if (Object.keys(fieldErrors).length > 0) {
    return NextResponse.json({ error: "Invalid input", fieldErrors }, { status: 400 });
  }

  const pet = await prisma.pet.findUnique({
    where: { id: petId! },
    select: { browserId: true },
  });
  if (!pet || pet.browserId !== browserId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const plans = await prisma.plan.findMany({
    where: { petId: petId! },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(plans);
}
