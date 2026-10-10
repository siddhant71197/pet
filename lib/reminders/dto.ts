// Server-side mapping from Prisma Reminder rows to the ReminderDTO JSON shape.
import type { Reminder } from "@prisma/client";
import type { Recurrence, ReminderDTO, ReminderKind } from "./types";

type ReminderWithPet = Reminder & { pet: { name: string; type: string } };

/** Prisma include/select that provides what toReminderDTO needs. */
export const REMINDER_PET_INCLUDE = { pet: { select: { name: true, type: true } } } as const;

const iso = (d: Date | null): string | null => (d ? d.toISOString() : null);

export function toReminderDTO(r: ReminderWithPet): ReminderDTO {
  return {
    id: r.id,
    petId: r.petId,
    kind: r.kind as ReminderKind,
    title: r.title,
    notes: r.notes,
    dueAt: r.dueAt.toISOString(),
    timeOfDay: r.timeOfDay,
    recurrence: r.recurrence as Recurrence,
    intervalDays: r.intervalDays,
    active: r.active,
    snoozedUntil: iso(r.snoozedUntil),
    lastCompletedAt: iso(r.lastCompletedAt),
    completedCount: r.completedCount,
    source: r.source === "llm" ? "llm" : "user",
    pet: { name: r.pet.name, type: r.pet.type },
  };
}
