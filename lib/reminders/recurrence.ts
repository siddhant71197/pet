// Pure, isomorphic reminder date helpers. No module-level Date usage: callers
// pass `now` / `today` so these are safe in render-free contexts on client and server.
import type { Recurrence, ReminderDraft, ReminderDTO, ReminderSuggestion } from "./types";

type DueFields = Pick<ReminderDTO, "dueAt" | "snoozedUntil">;

/** The moment the reminder should fire: the later of dueAt and snoozedUntil. */
export function effectiveDueAt(r: DueFields): Date {
  const due = new Date(r.dueAt);
  if (r.snoozedUntil) {
    const snooze = new Date(r.snoozedUntil);
    if (snooze.getTime() > due.getTime()) return snooze;
  }
  return due;
}

/** True when the reminder is active and its effective due time has passed. */
export function isDue(r: DueFields & Pick<ReminderDTO, "active">, now: Date): boolean {
  return r.active && effectiveDueAt(r).getTime() <= now.getTime();
}

function addMonthsClamped(d: Date, months: number, anchorDay: number): Date {
  const next = new Date(d.getTime());
  next.setDate(1); // avoid overflow while moving months
  next.setMonth(next.getMonth() + months);
  const lastDay = new Date(next.getFullYear(), next.getMonth() + 1, 0).getDate();
  next.setDate(Math.min(anchorDay, lastDay));
  return next;
}

/**
 * Next occurrence strictly after `now`, stepping from `dueAt` in local time.
 * Returns null for one-off reminders (or "custom" without a valid interval).
 * Month/year steps keep the original day-of-month, clamped to the month end
 * (Jan 31 -> Feb 28/29 -> Mar 31).
 */
export function nextOccurrence(
  dueAt: Date,
  recurrence: Recurrence,
  intervalDays: number | null,
  now: Date,
): Date | null {
  if (recurrence === "none") return null;
  if (recurrence === "custom" && (!intervalDays || intervalDays < 1)) return null;

  const anchorDay = dueAt.getDate();
  let steps = 0;
  let next = new Date(dueAt.getTime());
  // Always advance at least once, then until strictly after now.
  do {
    steps += 1;
    switch (recurrence) {
      case "daily":
        next = new Date(dueAt.getTime());
        next.setDate(next.getDate() + steps);
        break;
      case "weekly":
        next = new Date(dueAt.getTime());
        next.setDate(next.getDate() + 7 * steps);
        break;
      case "custom":
        next = new Date(dueAt.getTime());
        next.setDate(next.getDate() + intervalDays! * steps);
        break;
      case "monthly":
        next = addMonthsClamped(dueAt, steps, anchorDay);
        break;
      case "yearly":
        next = addMonthsClamped(dueAt, 12 * steps, anchorDay);
        break;
    }
    if (steps > 100_000) return null; // safety valve
  } while (next.getTime() <= now.getTime());
  return next;
}

/** Convert a relative LLM suggestion into an absolute draft (local time). */
export function suggestionToDraft(s: ReminderSuggestion, today: Date): ReminderDraft {
  const [h, m] = (s.timeOfDay || "09:00").split(":").map(Number);
  const due = new Date(today.getFullYear(), today.getMonth(), today.getDate() + s.dueInDays, h, m, 0, 0);
  return {
    kind: s.kind,
    title: s.title,
    notes: s.notes || null,
    dueAt: due.toISOString(),
    timeOfDay: s.timeOfDay,
    recurrence: s.recurrence,
    intervalDays: s.recurrence === "custom" ? (s.intervalDays ?? null) : null,
    source: "llm",
  };
}

/** Stable key for one firing of a reminder (used for dedupe + Notification tag). */
export function occurrenceKey(r: Pick<ReminderDTO, "id" | "dueAt" | "snoozedUntil">): string {
  return `${r.id}:${effectiveDueAt(r).toISOString()}`;
}
