// Which notification (if any) a reminder should raise right now. Pure; pass `now`.
//
// Most reminders fire once when due. Vaccines escalate: 7 days before, 1 day
// before, on the due date, then once a day while overdue until marked done.
import type { ReminderDTO } from "./types";
import { occurrenceKey } from "./recurrence";

export type AlertPhase = "week" | "day" | "due" | "overdue";

export type ReminderAlert = {
  /** Unique per firing; used for dedupe and as the Notification tag. */
  key: string;
  phase: AlertPhase;
  /** When this alert became active (epoch ms). */
  at: number;
};

const DAY = 24 * 60 * 60 * 1000;

type AlertFields = Pick<ReminderDTO, "id" | "kind" | "dueAt" | "snoozedUntil" | "active">;

export function currentAlert(r: AlertFields, now: number): ReminderAlert | null {
  if (!r.active) return null;
  const due = new Date(r.dueAt).getTime();
  const snooze = r.snoozedUntil ? new Date(r.snoozedUntil).getTime() : 0;
  if (snooze > now) return null;

  if (r.kind !== "vaccine") {
    const at = Math.max(due, snooze);
    return at <= now ? { key: occurrenceKey(r), phase: "due", at } : null;
  }

  const base = `${r.id}:${r.dueAt}`;
  if (now < due) {
    if (snooze > due - DAY) return null; // snoozed past the pre-alerts
    if (now >= due - DAY) return { key: `${base}:day`, phase: "day", at: due - DAY };
    if (now >= due - 7 * DAY && snooze <= due - 7 * DAY) {
      return { key: `${base}:week`, phase: "week", at: due - 7 * DAY };
    }
    return null;
  }

  // Due or overdue: one alert per day counted from the due time (or from the
  // end of a snooze), until the reminder is completed.
  const anchor = Math.max(due, snooze);
  const n = Math.floor((now - anchor) / DAY);
  if (n === 0) return { key: `${base}:due:${anchor}`, phase: "due", at: anchor };
  return { key: `${base}:overdue:${anchor}:${n}`, phase: "overdue", at: anchor + n * DAY };
}

/** Short title suffix for an alert, e.g. "in 7 days", "tomorrow", "overdue". */
export function alertLabel(phase: AlertPhase, dueAt: string, now: number): string {
  const due = new Date(dueAt);
  if (phase === "due" || phase === "overdue") {
    const days = Math.floor((now - due.getTime()) / DAY);
    return days >= 1 ? `overdue by ${days} day${days === 1 ? "" : "s"}` : "due today";
  }
  if (due.toDateString() === new Date(now).toDateString()) return "due today";
  const days = Math.ceil((due.getTime() - now) / DAY);
  if (days <= 1) return "due tomorrow";
  return `due in ${days} days`;
}
