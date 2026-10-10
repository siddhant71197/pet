"use client";

import { useId, useState } from "react";
import { getBrowserId } from "@/lib/client/browser-id";
import { RECURRENCES } from "@/lib/validation";
import type { Recurrence, ReminderKind, ReminderSuggestion } from "@/lib/reminders/types";
import { suggestionToDraft } from "@/lib/reminders/recurrence";
import { errorMessage, suggestReminders } from "./api";
import { KIND_META, RECURRENCE_LABEL } from "./kinds";
import { useReminders } from "./RemindersProvider";

type Item = { key: number; selected: boolean; s: ReminderSuggestion };

const smallInput =
  "rounded-lg border border-zinc-300 bg-white px-2 py-1 text-sm text-zinc-900 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

function Spinner() {
  return (
    <span
      aria-hidden
      className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent"
    />
  );
}

export function ReminderSuggestions({
  petId,
  kinds,
  onAdded,
}: {
  petId: string;
  kinds?: readonly ReminderKind[];
  onAdded?: (count: number) => void;
}) {
  const { create, pushToast } = useReminders();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [items, setItems] = useState<Item[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const id = useId();

  async function fetchSuggestions() {
    setLoading(true);
    setError(null);
    try {
      const list = await suggestReminders(getBrowserId(), petId);
      const filtered = kinds ? list.filter((s) => kinds.includes(s.kind)) : list;
      setItems(filtered.map((s, i) => ({ key: i, selected: true, s })));
      if (filtered.length === 0) setError("No suggestions for this section right now. Try again later.");
    } catch (err) {
      setError(errorMessage(err, "suggest"));
    } finally {
      setLoading(false);
    }
  }

  function edit(key: number, patch: Partial<ReminderSuggestion>) {
    setItems((prev) => prev?.map((it) => (it.key === key ? { ...it, s: { ...it.s, ...patch } } : it)) ?? null);
  }

  function toggle(key: number, selected: boolean) {
    setItems((prev) => prev?.map((it) => (it.key === key ? { ...it, selected } : it)) ?? null);
  }

  async function addSelected() {
    if (!items) return;
    const chosen = items.filter((it) => it.selected && it.s.title.trim());
    if (chosen.length === 0) return setError("Select at least one reminder to add.");
    setSaving(true);
    setError(null);
    try {
      const today = new Date();
      const drafts = chosen.map((it) =>
        suggestionToDraft(
          {
            ...it.s,
            title: it.s.title.trim(),
            intervalDays: it.s.recurrence === "custom" ? (it.s.intervalDays ?? 30) : null,
          },
          today,
        ),
      );
      await create(petId, drafts);
      pushToast({ tone: "success", title: `Added ${drafts.length} reminder${drafts.length === 1 ? "" : "s"}` });
      setItems(null);
      onAdded?.(drafts.length);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  const selectedCount = items?.filter((i) => i.selected).length ?? 0;

  return (
    <section
      aria-labelledby={`${id}-h`}
      className="rounded-2xl border border-indigo-200 bg-indigo-50/60 p-4 dark:border-indigo-900 dark:bg-indigo-950/30"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 id={`${id}-h`} className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
            ✨ AI schedule
          </h3>
          <p className="text-xs text-indigo-800/80 dark:text-indigo-200/70">
            Get a suggested schedule based on your pet&apos;s profile. Review and edit before adding.
          </p>
        </div>
        <button
          type="button"
          onClick={fetchSuggestions}
          disabled={loading || saving}
          className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
        >
          {loading && <Spinner />}
          {loading ? "Thinking…" : items ? "Suggest again" : "Suggest schedule with AI"}
        </button>
      </div>

      {loading && (
        <p className="mt-3 text-sm text-indigo-800 dark:text-indigo-200" role="status">
          Building a schedule. This can take up to a minute…
        </p>
      )}

      {error && (
        <p role="alert" className="mt-3 text-sm text-rose-600 dark:text-rose-400">
          {error}
        </p>
      )}

      {items && items.length > 0 && !loading && (
        <div className="mt-4">
          <ul className="space-y-2">
            {items.map((it) => {
              const meta = KIND_META[it.s.kind];
              const base = `${id}-${it.key}`;
              return (
                <li
                  key={it.key}
                  className={`rounded-xl border border-l-4 bg-white p-3 dark:bg-zinc-900 ${meta.ring} ${
                    it.selected ? "border-zinc-200 dark:border-zinc-800" : "border-zinc-200 opacity-60 dark:border-zinc-800"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <input
                      id={`${base}-sel`}
                      type="checkbox"
                      checked={it.selected}
                      onChange={(e) => toggle(it.key, e.target.checked)}
                      className="mt-2 h-4 w-4 rounded accent-indigo-600"
                      aria-label={`Include ${it.s.title}`}
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
                          {meta.emoji} {meta.label}
                        </span>
                        <input
                          aria-label="Title"
                          className={`${smallInput} min-w-0 flex-1`}
                          value={it.s.title}
                          maxLength={120}
                          onChange={(e) => edit(it.key, { title: e.target.value })}
                        />
                      </div>
                      {it.s.notes && <p className="text-xs text-zinc-500 dark:text-zinc-400">{it.s.notes}</p>}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-600 dark:text-zinc-300">
                        <label className="inline-flex items-center gap-1">
                          In
                          <input
                            type="number"
                            min={0}
                            max={730}
                            inputMode="numeric"
                            className={`${smallInput} w-20`}
                            value={it.s.dueInDays}
                            onChange={(e) => {
                              const n = Math.max(0, Math.min(730, Math.floor(Number(e.target.value) || 0)));
                              edit(it.key, { dueInDays: n });
                            }}
                          />
                          days
                        </label>
                        <label className="inline-flex items-center gap-1">
                          at
                          <input
                            type="time"
                            className={smallInput}
                            value={it.s.timeOfDay}
                            onChange={(e) => edit(it.key, { timeOfDay: e.target.value || "09:00" })}
                          />
                        </label>
                        <label className="inline-flex items-center gap-1">
                          <span className="sr-only">Repeats</span>
                          <select
                            className={smallInput}
                            value={it.s.recurrence}
                            onChange={(e) => edit(it.key, { recurrence: e.target.value as Recurrence })}
                          >
                            {RECURRENCES.map((r) => (
                              <option key={r} value={r}>
                                {RECURRENCE_LABEL[r]}
                              </option>
                            ))}
                          </select>
                        </label>
                        {it.s.recurrence === "custom" && (
                          <label className="inline-flex items-center gap-1">
                            every
                            <input
                              type="number"
                              min={1}
                              max={730}
                              className={`${smallInput} w-20`}
                              value={it.s.intervalDays ?? 30}
                              onChange={(e) => {
                                const n = Math.max(1, Math.min(730, Math.floor(Number(e.target.value) || 1)));
                                edit(it.key, { intervalDays: n });
                              }}
                            />
                            days
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
          <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setItems(null)}
              className="rounded-full px-4 py-2 text-sm font-medium text-zinc-600 hover:bg-zinc-200 dark:text-zinc-300 dark:hover:bg-zinc-800"
            >
              Discard
            </button>
            <button
              type="button"
              onClick={addSelected}
              disabled={saving || selectedCount === 0}
              className="inline-flex items-center gap-2 rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-emerald-500 disabled:opacity-60"
            >
              {saving && <Spinner />}
              Add selected ({selectedCount})
            </button>
          </div>
        </div>
      )}
    </section>
  );
}

export default ReminderSuggestions;
