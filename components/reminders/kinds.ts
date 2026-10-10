import type { Recurrence, ReminderKind } from "@/lib/reminders/types";

export const KIND_META: Record<
  ReminderKind,
  { label: string; emoji: string; badge: string; ring: string; dot: string }
> = {
  vaccine: {
    label: "Vaccine",
    emoji: "💉",
    badge: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-200",
    ring: "border-l-sky-400",
    dot: "bg-sky-500",
  },
  medication: {
    label: "Medication",
    emoji: "💊",
    badge: "bg-rose-100 text-rose-800 dark:bg-rose-900/50 dark:text-rose-200",
    ring: "border-l-rose-400",
    dot: "bg-rose-500",
  },
  nutrition: {
    label: "Nutrition",
    emoji: "🍖",
    badge: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200",
    ring: "border-l-amber-400",
    dot: "bg-amber-500",
  },
  grooming: {
    label: "Grooming",
    emoji: "✂️",
    badge: "bg-violet-100 text-violet-800 dark:bg-violet-900/50 dark:text-violet-200",
    ring: "border-l-violet-400",
    dot: "bg-violet-500",
  },
  checkup: {
    label: "Checkup",
    emoji: "🩺",
    badge: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200",
    ring: "border-l-emerald-400",
    dot: "bg-emerald-500",
  },
};

export const RECURRENCE_LABEL: Record<Recurrence, string> = {
  none: "One time",
  daily: "Daily",
  weekly: "Weekly",
  monthly: "Monthly",
  yearly: "Yearly",
  custom: "Custom",
};

export function recurrenceText(recurrence: Recurrence, intervalDays: number | null | undefined): string {
  if (recurrence === "custom") {
    return intervalDays ? `Every ${intervalDays} day${intervalDays === 1 ? "" : "s"}` : "Custom";
  }
  return RECURRENCE_LABEL[recurrence];
}

const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600_000],
  ["month", 30 * 24 * 3600_000],
  ["week", 7 * 24 * 3600_000],
  ["day", 24 * 3600_000],
  ["hour", 3600_000],
  ["minute", 60_000],
];

function pickUnit(absMs: number): [Intl.RelativeTimeFormatUnit, number] {
  for (const [unit, ms] of UNITS) {
    if (absMs >= ms) return [unit, Math.floor(absMs / ms)];
  }
  return ["minute", 0];
}

/**
 * Client-only relative label: "in 2 days", "tomorrow", "overdue 3h", "due now".
 * Pass `now` from useNow(); never call during SSR.
 */
export function formatRelative(target: number, now: number): string {
  const diff = target - now;
  const abs = Math.abs(diff);
  if (abs < 60_000) return diff <= 0 ? "due now" : "in under a minute";
  const [unit, value] = pickUnit(abs);
  if (diff > 0) {
    return new Intl.RelativeTimeFormat(undefined, { numeric: "auto" }).format(value, unit);
  }
  let short: string;
  try {
    short = new Intl.NumberFormat(undefined, {
      style: "unit",
      unit: unit as string,
      unitDisplay: "narrow",
    }).format(value);
  } catch {
    short = `${value} ${unit}${value === 1 ? "" : "s"}`;
  }
  return `overdue ${short}`;
}

/** Client-only absolute label like "Tue, Oct 14, 9:00 AM". */
export function formatDateTime(iso: string | number): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Tomorrow at the reminder's time of day (or 9:00) in local time. Event handlers only. */
export function tomorrowAt(timeOfDay: string | null | undefined, now: Date): Date {
  const [h, m] = (timeOfDay && /^\d{2}:\d{2}$/.test(timeOfDay) ? timeOfDay : "09:00")
    .split(":")
    .map(Number);
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, h, m, 0, 0);
}

/** One hour from the current time. Event handlers only. */
export function oneHourFromNow(): Date {
  return new Date(Date.now() + 3600_000);
}
