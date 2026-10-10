"use client";

import { useId, useState, type FormEvent } from "react";
import { RECURRENCES, REMINDER_KINDS } from "@/lib/validation";
import type { Recurrence, ReminderDraft, ReminderDTO, ReminderKind } from "@/lib/reminders/types";
import { KIND_META, RECURRENCE_LABEL } from "./kinds";

export type ReminderFormValues = {
  kind: ReminderKind;
  title: string;
  notes: string;
  date: string; // yyyy-mm-dd (local)
  time: string; // HH:MM (local)
  recurrence: Recurrence;
  intervalDays: string;
};

const pad = (n: number) => String(n).padStart(2, "0");
const toDateInput = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const toTimeInput = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;

/** Defaults for a new reminder: tomorrow 09:00 local. Call from event handlers only. */
export function emptyFormValues(kind: ReminderKind, now: Date): ReminderFormValues {
  const tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 9, 0);
  return {
    kind,
    title: "",
    notes: "",
    date: toDateInput(tomorrow),
    time: "09:00",
    recurrence: "none",
    intervalDays: "",
  };
}

/** Form values from an existing reminder (local time). Call from event handlers only. */
export function formValuesFromReminder(r: ReminderDTO): ReminderFormValues {
  const due = new Date(r.dueAt);
  return {
    kind: r.kind,
    title: r.title,
    notes: r.notes ?? "",
    date: toDateInput(due),
    time: r.timeOfDay ?? toTimeInput(due),
    recurrence: r.recurrence,
    intervalDays: r.intervalDays ? String(r.intervalDays) : "",
  };
}

const inputCls =
  "mt-1 block w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
const labelCls = "block text-xs font-medium text-zinc-600 dark:text-zinc-300";

export function ReminderForm({
  initial,
  kinds = REMINDER_KINDS,
  submitLabel = "Save reminder",
  onSubmit,
  onCancel,
}: {
  initial: ReminderFormValues;
  kinds?: readonly ReminderKind[];
  submitLabel?: string;
  /** Receives a draft with a local date/time converted to ISO. Throw to show an error. */
  onSubmit: (draft: ReminderDraft) => Promise<void>;
  onCancel: () => void;
}) {
  const [values, setValues] = useState<ReminderFormValues>(initial);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const id = useId();

  const kindOptions = kinds.includes(values.kind) ? kinds : [values.kind, ...kinds];

  function set<K extends keyof ReminderFormValues>(key: K, v: ReminderFormValues[K]) {
    setValues((prev) => ({ ...prev, [key]: v }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const title = values.title.trim();
    if (!title) return setError("Please add a title.");
    const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(values.date);
    if (!dm) return setError("Please pick a date.");
    const tm = /^(\d{2}):(\d{2})$/.exec(values.time || "09:00");
    if (!tm) return setError("Please pick a time.");
    let intervalDays: number | null = null;
    if (values.recurrence === "custom") {
      const n = Number(values.intervalDays);
      if (!Number.isInteger(n) || n < 1 || n > 730) {
        return setError("Repeat interval must be between 1 and 730 days.");
      }
      intervalDays = n;
    }
    const due = new Date(Number(dm[1]), Number(dm[2]) - 1, Number(dm[3]), Number(tm[1]), Number(tm[2]), 0, 0);
    if (Number.isNaN(due.getTime())) return setError("That date doesn't look right.");

    setError(null);
    setSaving(true);
    try {
      await onSubmit({
        kind: values.kind,
        title,
        notes: values.notes.trim() || null,
        dueAt: due.toISOString(),
        timeOfDay: `${tm[1]}:${tm[2]}`,
        recurrence: values.recurrence,
        intervalDays,
        source: "user",
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save the reminder.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 dark:border-zinc-800 dark:bg-zinc-900/60"
      noValidate
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor={`${id}-kind`} className={labelCls}>
            Type
          </label>
          <select
            id={`${id}-kind`}
            className={inputCls}
            value={values.kind}
            onChange={(e) => set("kind", e.target.value as ReminderKind)}
          >
            {kindOptions.map((k) => (
              <option key={k} value={k}>
                {KIND_META[k].emoji} {KIND_META[k].label}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor={`${id}-title`} className={labelCls}>
            Title
          </label>
          <input
            id={`${id}-title`}
            className={inputCls}
            value={values.title}
            maxLength={120}
            required
            placeholder="e.g. Rabies booster"
            onChange={(e) => set("title", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`${id}-date`} className={labelCls}>
            Date
          </label>
          <input
            id={`${id}-date`}
            type="date"
            className={inputCls}
            value={values.date}
            required
            onChange={(e) => set("date", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`${id}-time`} className={labelCls}>
            Time
          </label>
          <input
            id={`${id}-time`}
            type="time"
            className={inputCls}
            value={values.time}
            onChange={(e) => set("time", e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`${id}-rec`} className={labelCls}>
            Repeats
          </label>
          <select
            id={`${id}-rec`}
            className={inputCls}
            value={values.recurrence}
            onChange={(e) => set("recurrence", e.target.value as Recurrence)}
          >
            {RECURRENCES.map((r) => (
              <option key={r} value={r}>
                {RECURRENCE_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        {values.recurrence === "custom" && (
          <div>
            <label htmlFor={`${id}-interval`} className={labelCls}>
              Every how many days?
            </label>
            <input
              id={`${id}-interval`}
              type="number"
              inputMode="numeric"
              min={1}
              max={730}
              className={inputCls}
              value={values.intervalDays}
              onChange={(e) => set("intervalDays", e.target.value)}
            />
          </div>
        )}
      </div>
      <div>
        <label htmlFor={`${id}-notes`} className={labelCls}>
          Notes <span className="font-normal text-zinc-400">(optional)</span>
        </label>
        <textarea
          id={`${id}-notes`}
          rows={2}
          maxLength={500}
          className={inputCls}
          value={values.notes}
          placeholder="Dose as prescribed by your vet, clinic name…"
          onChange={(e) => set("notes", e.target.value)}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className="rounded-full px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
        >
          {saving ? "Saving…" : submitLabel}
        </button>
      </div>
    </form>
  );
}

export default ReminderForm;
