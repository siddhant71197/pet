"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { REMINDER_KINDS } from "@/lib/validation";
import type { ReminderDraft, ReminderDTO, ReminderKind } from "@/lib/reminders/types";
import { effectiveDueAt, isDue } from "@/lib/reminders/recurrence";
import { errorMessage, fetchReminders } from "./api";
import { KIND_META, formatDateTime, formatRelative, recurrenceText } from "./kinds";
import { NotificationPermissionButton } from "./NotificationPermissionButton";
import { ReminderForm, emptyFormValues, formValuesFromReminder, type ReminderFormValues } from "./ReminderForm";
import { ReminderSuggestions } from "./ReminderSuggestions";
import { useReminders } from "./RemindersProvider";

type Editing = { mode: "new"; initial: ReminderFormValues } | { mode: "edit"; reminder: ReminderDTO; initial: ReminderFormValues };

type Loaded = { key: string; list: ReminderDTO[]; error: string | null };

export function RemindersPanel({ petId, kinds }: { petId: string; kinds?: ReminderKind[] }) {
  const { browserId, revision, now, create, update, complete, remove, pushToast } = useReminders();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [editing, setEditing] = useState<Editing | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const headingId = useId();

  const allowedKinds: readonly ReminderKind[] = kinds && kinds.length > 0 ? kinds : REMINDER_KINDS;
  const kindsKey = allowedKinds.join(",");
  const key = browserId ? `${browserId}:${petId}` : null;

  // Per-pet list including inactive (completed) reminders. Refetches whenever
  // the provider refreshes (after mutations, every 5 min, cross-tab).
  useEffect(() => {
    if (!browserId || !key) return;
    let cancelled = false;
    fetchReminders(browserId, { petId })
      .then((list) => {
        if (!cancelled) setLoaded({ key, list: Array.isArray(list) ? list : [], error: null });
      })
      .catch((err) => {
        if (!cancelled)
          setLoaded((prev) => ({
            key,
            list: prev && prev.key === key ? prev.list : [],
            error: errorMessage(err, "load"),
          }));
      });
    return () => {
      cancelled = true;
    };
  }, [browserId, petId, key, revision]);

  const ready = loaded !== null && loaded.key === key;

  const groups = useMemo(() => {
    const list = ready ? loaded.list.filter((r) => kindsKey.split(",").includes(r.kind)) : [];
    const nowDate = now !== null ? new Date(now) : null;
    const byDue = (a: ReminderDTO, b: ReminderDTO) => effectiveDueAt(a).getTime() - effectiveDueAt(b).getTime();
    const active = list.filter((r) => r.active);
    const overdue = nowDate ? active.filter((r) => isDue(r, nowDate)).sort(byDue) : [];
    const upcoming = active.filter((r) => !nowDate || !isDue(r, nowDate)).sort(byDue);
    const completed = list
      .filter((r) => !r.active)
      .sort((a, b) => (b.lastCompletedAt ?? b.dueAt).localeCompare(a.lastCompletedAt ?? a.dueAt));
    return { overdue, upcoming, completed };
  }, [ready, loaded, kindsKey, now]);

  async function run(r: ReminderDTO, fn: () => Promise<unknown>, success?: string) {
    setBusyId(r.id);
    try {
      await fn();
      if (success) pushToast({ tone: "success", title: success });
    } catch (err) {
      pushToast({ tone: "error", title: "Couldn't update reminder", body: errorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  async function submit(draft: ReminderDraft) {
    try {
      if (editing?.mode === "edit") {
        await update(editing.reminder.id, { ...draft, source: editing.reminder.source, active: true });
        pushToast({ tone: "success", title: "Reminder updated" });
      } else {
        await create(petId, [draft]);
        pushToast({ tone: "success", title: "Reminder added" });
      }
      setEditing(null);
    } catch (err) {
      throw new Error(errorMessage(err));
    }
  }

  function startNew() {
    setEditing({ mode: "new", initial: emptyFormValues(allowedKinds[0], new Date()) });
  }

  function startEdit(r: ReminderDTO) {
    setEditing({ mode: "edit", reminder: r, initial: formValuesFromReminder(r) });
  }

  function renderItem(r: ReminderDTO, section: "overdue" | "upcoming" | "completed") {
    const meta = KIND_META[r.kind];
    const busy = busyId === r.id;
    const due = effectiveDueAt(r).getTime();
    const snoozed = r.snoozedUntil && new Date(r.snoozedUntil).getTime() > new Date(r.dueAt).getTime();
    return (
      <li
        key={r.id}
        className={`rounded-2xl border border-l-4 border-zinc-200 bg-white p-3 shadow-sm dark:border-zinc-800 dark:bg-zinc-900 ${meta.ring} ${
          section === "completed" ? "opacity-75" : ""
        }`}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${meta.badge}`}>
                <span aria-hidden>{meta.emoji}</span> {meta.label}
              </span>
              <h4
                className={`text-sm font-semibold text-zinc-900 dark:text-zinc-100 ${
                  section === "completed" ? "line-through decoration-zinc-400" : ""
                }`}
              >
                {r.title}
              </h4>
              {r.source === "llm" && (
                <span className="text-[10px] font-medium uppercase tracking-wide text-indigo-500" title="Suggested by AI">
                  AI
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              {now !== null && (
                <>
                  {section === "completed" ? (
                    r.lastCompletedAt ? (
                      <>Done {formatDateTime(r.lastCompletedAt)}</>
                    ) : (
                      <>Inactive</>
                    )
                  ) : (
                    <>
                      <span
                        className={
                          section === "overdue" ? "font-semibold text-rose-600 dark:text-rose-400" : "font-medium text-zinc-700 dark:text-zinc-200"
                        }
                      >
                        {formatRelative(due, now)}
                      </span>{" "}
                      · {formatDateTime(due)}
                      {snoozed && " (snoozed)"}
                    </>
                  )}
                  {" · "}
                </>
              )}
              {recurrenceText(r.recurrence, r.intervalDays)}
              {r.completedCount > 0 && ` · done ${r.completedCount}×`}
            </p>
            {r.notes && <p className="mt-1 text-sm text-zinc-600 dark:text-zinc-300">{r.notes}</p>}
          </div>
          <div className="flex shrink-0 flex-wrap gap-1.5">
            {section !== "completed" && (
              <button
                type="button"
                disabled={busy}
                onClick={() => run(r, () => complete(r), r.recurrence === "none" ? "Marked done" : "Done. Next one scheduled")}
                className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
              >
                ✓ Done
              </button>
            )}
            <button
              type="button"
              disabled={busy}
              onClick={() => startEdit(r)}
              className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              {section === "completed" ? "Reschedule" : "Edit"}
            </button>
            <button
              type="button"
              disabled={busy}
              aria-label={`Delete ${r.title}`}
              onClick={() => {
                if (window.confirm(`Delete “${r.title}”?`)) void run(r, () => remove(r.id), "Reminder deleted");
              }}
              className="rounded-full border border-transparent px-3 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50 dark:text-rose-400 dark:hover:bg-rose-950/40"
            >
              Delete
            </button>
          </div>
        </div>
        {editing?.mode === "edit" && editing.reminder.id === r.id && (
          <div className="mt-3">
            <ReminderForm
              key={r.id}
              initial={editing.initial}
              kinds={allowedKinds}
              submitLabel={section === "completed" ? "Reschedule" : "Save changes"}
              onSubmit={submit}
              onCancel={() => setEditing(null)}
            />
          </div>
        )}
      </li>
    );
  }

  function renderSection(title: string, items: ReminderDTO[], section: "overdue" | "upcoming" | "completed", empty?: string) {
    if (items.length === 0 && !empty) return null;
    return (
      <section className="space-y-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          {title}
          <span className="rounded-full bg-zinc-100 px-2 py-0.5 text-[11px] text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
            {items.length}
          </span>
        </h3>
        {items.length === 0 ? (
          <p className="text-sm text-zinc-500 dark:text-zinc-400">{empty}</p>
        ) : (
          <ul className="space-y-2">{items.map((r) => renderItem(r, section))}</ul>
        )}
      </section>
    );
  }

  const total = groups.overdue.length + groups.upcoming.length + groups.completed.length;

  return (
    <div className="space-y-5" aria-labelledby={headingId}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id={headingId} className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">
            Reminders
          </h2>
          <p className="text-xs text-zinc-500 dark:text-zinc-400">
            {allowedKinds.map((k) => `${KIND_META[k].emoji} ${KIND_META[k].label}`).join("  ·  ")}
          </p>
        </div>
        <button
          type="button"
          onClick={startNew}
          disabled={!browserId}
          className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500 disabled:opacity-60"
        >
          + Add reminder
        </button>
      </div>

      <NotificationPermissionButton />

      {editing?.mode === "new" && (
        <ReminderForm
          key="new"
          initial={editing.initial}
          kinds={allowedKinds}
          submitLabel="Add reminder"
          onSubmit={submit}
          onCancel={() => setEditing(null)}
        />
      )}

      <ReminderSuggestions petId={petId} kinds={kinds && kinds.length > 0 ? kinds : undefined} />

      {!ready ? (
        <div className="space-y-2" aria-busy="true" aria-label="Loading reminders">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-2xl bg-zinc-100 dark:bg-zinc-800" />
          ))}
        </div>
      ) : (
        <>
          {loaded.error && (
            <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-700 dark:bg-rose-950/40 dark:text-rose-300">
              {loaded.error}
            </p>
          )}
          {total === 0 && !loaded.error ? (
            <div className="rounded-2xl border border-dashed border-zinc-300 p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:text-zinc-400">
              <span className="mb-1 block text-2xl" aria-hidden>
                🐾
              </span>
              No reminders yet. Add one or let AI suggest a schedule.
            </div>
          ) : (
            <>
              {renderSection("Overdue", groups.overdue, "overdue")}
              {renderSection("Upcoming", groups.upcoming, "upcoming", "Nothing scheduled.")}
              {groups.completed.length > 0 && (
                <details className="group">
                  <summary className="cursor-pointer list-none text-xs font-semibold uppercase tracking-wide text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200">
                    <span className="inline-block transition group-open:rotate-90" aria-hidden>
                      ▸
                    </span>{" "}
                    Completed ({groups.completed.length})
                  </summary>
                  <ul className="mt-2 space-y-2">{groups.completed.map((r) => renderItem(r, "completed"))}</ul>
                </details>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

export default RemindersPanel;
