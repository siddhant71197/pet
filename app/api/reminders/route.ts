import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { ReminderCreateSchema } from "@/lib/validation";
import { REMINDER_PET_INCLUDE, toReminderDTO } from "@/lib/reminders/dto";

const BrowserIdSchema = z.uuid();
const NO_STORE = { "Cache-Control": "no-store" };

// GET /api/reminders?browserId=<uuid>[&petId=][&active=1]
//   -> ReminderDTO[] ordered by dueAt asc (only reminders of pets owned by browserId)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const browserId = searchParams.get("browserId");
  const petId = searchParams.get("petId");
  const activeOnly = searchParams.get("active") === "1";

  if (!browserId || !BrowserIdSchema.safeParse(browserId).success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: { browserId: ["Must be a UUID"] } },
      { status: 400, headers: NO_STORE },
    );
  }

  const where: Prisma.ReminderWhereInput = { pet: { browserId } };
  if (petId) where.petId = petId;
  if (activeOnly) where.active = true;

  const reminders = await prisma.reminder.findMany({
    where,
    include: REMINDER_PET_INCLUDE,
    orderBy: [{ dueAt: "asc" }, { createdAt: "asc" }],
  });
  return NextResponse.json(reminders.map(toReminderDTO), { headers: NO_STORE });
}

// POST /api/reminders  body: ReminderCreateSchema -> 201 ReminderDTO[]
//   400 invalid body, 404 pet missing or not owned
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const parsed = ReminderCreateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: z.flattenError(parsed.error).fieldErrors },
      { status: 400 },
    );
  }
  const { browserId, petId, reminders } = parsed.data;

  const badCustom = reminders.findIndex((r) => r.recurrence === "custom" && !r.intervalDays);
  if (badCustom !== -1) {
    return NextResponse.json(
      {
        error: "Invalid input",
        fieldErrors: { reminders: [`Item ${badCustom + 1}: custom recurrence needs intervalDays`] },
      },
      { status: 400 },
    );
  }

  const pet = await prisma.pet.findUnique({ where: { id: petId }, select: { browserId: true } });
  if (!pet || pet.browserId !== browserId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const created = await prisma.$transaction(
    reminders.map((r) =>
      prisma.reminder.create({
        data: {
          petId,
          kind: r.kind,
          title: r.title,
          notes: r.notes || null,
          dueAt: new Date(r.dueAt),
          timeOfDay: r.timeOfDay ?? null,
          recurrence: r.recurrence,
          intervalDays: r.recurrence === "custom" ? (r.intervalDays ?? null) : null,
          active: r.active ?? true,
          source: r.source,
        },
        include: REMINDER_PET_INCLUDE,
      }),
    ),
  );

  return NextResponse.json(created.map(toReminderDTO), { status: 201, headers: NO_STORE });
}
