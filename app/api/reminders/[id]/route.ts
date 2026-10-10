import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ReminderPatchSchema } from "@/lib/validation";
import { REMINDER_PET_INCLUDE, toReminderDTO } from "@/lib/reminders/dto";

const BrowserIdSchema = z.uuid();
const NO_STORE = { "Cache-Control": "no-store" };
const MAX_SNOOZE_MS = 30 * 24 * 60 * 60 * 1000;

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

/** Load the reminder and check that its pet belongs to browserId. */
async function findOwned(id: string, browserId: string) {
  const reminder = await prisma.reminder.findUnique({
    where: { id },
    include: { pet: { select: { browserId: true } } },
  });
  if (!reminder || reminder.pet.browserId !== browserId) return null;
  return reminder;
}

// PATCH /api/reminders/[id]  body: ReminderPatchSchema -> 200 ReminderDTO
//   action "update":   partial edit of the draft fields
//   action "complete": lastCompletedAt=now, completedCount++, snoozedUntil=null,
//                      dueAt=nextDueAt (client computes it; it knows the timezone)
//                      or active=false when nextDueAt is null
//   action "snooze":   snoozedUntil=until (capped at now + 30 days)
//   400 invalid body, 404 missing or not owned
export async function PATCH(request: Request, ctx: RouteContext<"/api/reminders/[id]">) {
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const parsed = ReminderPatchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }
  const patch = parsed.data;

  const existing = await findOwned(id, patch.browserId);
  if (!existing) return notFound();

  const now = new Date();
  let data: Prisma.ReminderUpdateInput;

  switch (patch.action) {
    case "update": {
      const d = patch.data;
      const recurrence = d.recurrence ?? existing.recurrence;
      const intervalDays = d.intervalDays !== undefined ? d.intervalDays : existing.intervalDays;
      if (recurrence === "custom" && !intervalDays) {
        return NextResponse.json(
          { error: "Invalid input", fieldErrors: { intervalDays: ["Required for custom recurrence"] } },
          { status: 400 },
        );
      }
      data = {
        ...(d.kind !== undefined && { kind: d.kind }),
        ...(d.title !== undefined && { title: d.title }),
        ...(d.notes !== undefined && { notes: d.notes || null }),
        ...(d.timeOfDay !== undefined && { timeOfDay: d.timeOfDay }),
        ...(d.active !== undefined && { active: d.active }),
        ...(d.source !== undefined && { source: d.source }),
        // A new due date replaces any pending snooze.
        ...(d.dueAt !== undefined && { dueAt: new Date(d.dueAt), snoozedUntil: null }),
        recurrence,
        intervalDays: recurrence === "custom" ? intervalDays : null,
      };
      break;
    }
    case "complete":
      data = {
        lastCompletedAt: now,
        completedCount: { increment: 1 },
        snoozedUntil: null,
        ...(patch.nextDueAt ? { dueAt: new Date(patch.nextDueAt) } : { active: false }),
      };
      break;
    case "snooze": {
      const until = new Date(patch.until);
      const cap = new Date(now.getTime() + MAX_SNOOZE_MS);
      data = { snoozedUntil: until.getTime() > cap.getTime() ? cap : until };
      break;
    }
  }

  const updated = await prisma.reminder.update({
    where: { id },
    data,
    include: REMINDER_PET_INCLUDE,
  });
  return NextResponse.json(toReminderDTO(updated), { headers: NO_STORE });
}

// DELETE /api/reminders/[id]?browserId=<uuid> -> 204
//   400 invalid browserId, 404 missing or not owned
export async function DELETE(request: Request, ctx: RouteContext<"/api/reminders/[id]">) {
  const { id } = await ctx.params;
  const browserId = new URL(request.url).searchParams.get("browserId");
  if (!browserId || !BrowserIdSchema.safeParse(browserId).success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: { browserId: ["Must be a UUID"] } },
      { status: 400 },
    );
  }

  const existing = await findOwned(id, browserId);
  if (!existing) return notFound();

  await prisma.reminder.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
