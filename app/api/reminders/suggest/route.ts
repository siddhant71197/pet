import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { collectCompletion, extractJsonObject } from "@/lib/llm-json";
import { buildRemindersPrompt, buildVaccinePlanPrompt, REMINDERS_SYSTEM_PROMPT } from "@/lib/prompts";
import { generationLimiter } from "@/lib/rate-limit";
import type { ReminderSuggestion } from "@/lib/reminders/types";
import { ReminderSuggestionSchema, ReminderSuggestRequestSchema } from "@/lib/validation";

export const maxDuration = 60;

const MAX_SUGGESTIONS = 15;

/** Validate each item independently, drop invalid ones, dedupe, cap. */
function parseSuggestions(raw: unknown): ReminderSuggestion[] {
  const list =
    raw && typeof raw === "object" && Array.isArray((raw as { reminders?: unknown }).reminders)
      ? ((raw as { reminders: unknown[] }).reminders)
      : Array.isArray(raw)
        ? raw
        : [];

  const seen = new Set<string>();
  const out: ReminderSuggestion[] = [];
  for (const item of list) {
    const parsed = ReminderSuggestionSchema.safeParse(item);
    if (!parsed.success) continue;
    const s = parsed.data;
    // Keep intervalDays only where it means something.
    const normalized: ReminderSuggestion =
      s.recurrence === "custom"
        ? s.intervalDays
          ? s
          : { ...s, recurrence: "none", intervalDays: null }
        : { ...s, intervalDays: null };
    const key = `${normalized.kind}:${normalized.title.toLowerCase().replace(/\s+/g, " ")}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(normalized);
    if (out.length >= MAX_SUGGESTIONS) break;
  }
  return out;
}

// POST /api/reminders/suggest  body: {browserId, petId, focus?: "vaccine"}
//   -> 200 {suggestions: ReminderSuggestion[]}  (nothing is saved)
//   400 invalid body, 404 pet missing or not owned, 429 rate limited (Retry-After),
//   502 model failed or returned no usable reminders (after one retry)
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const parsed = ReminderSuggestRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }
  const { browserId, petId, focus } = parsed.data;

  const pet = await prisma.pet.findUnique({ where: { id: petId } });
  if (!pet || pet.browserId !== browserId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Shared with /api/plans: 10 generations per browserId per hour.
  const limit = generationLimiter.check(browserId);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Rate limit reached: 10 AI generations per hour. Please try again later." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfterSec) } },
    );
  }

  const prompt = focus === "vaccine" ? buildVaccinePlanPrompt(pet) : buildRemindersPrompt(pet);
  let suggestions: ReminderSuggestion[] = [];
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2 && suggestions.length === 0; attempt++) {
    try {
      const text = await collectCompletion({
        prompt:
          attempt === 0
            ? prompt
            : `${prompt}\n\nYour previous answer could not be parsed. Reply with the JSON object only.`,
        systemPrompt: REMINDERS_SYSTEM_PROMPT,
      });
      suggestions = parseSuggestions(extractJsonObject(text));
      if (focus === "vaccine") {
        suggestions = suggestions.filter((s) => s.kind === "vaccine" || s.kind === "checkup");
      }
      if (suggestions.length === 0) lastError = new Error("No valid reminders in model output");
    } catch (err) {
      lastError = err;
    }
  }

  if (suggestions.length === 0) {
    console.error("Reminder suggestion failed", lastError);
    return NextResponse.json(
      { error: "The suggestion service failed. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ suggestions }, { headers: { "Cache-Control": "no-store" } });
}
