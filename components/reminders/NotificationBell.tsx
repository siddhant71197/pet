"use client";

import Link from "next/link";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import type { ReminderDTO } from "@/lib/reminders/types";
import { effectiveDueAt } from "@/lib/reminders/recurrence";
import { errorMessage } from "./api";
import { KIND_META, formatRelative, oneHourFromNow, tomorrowAt } from "./kinds";
import { NotificationPermissionButton } from "./NotificationPermissionButton";
import { useReminders } from "./RemindersProvider";

export function NotificationBell() {
  const { due, now, complete, snooze, pushToast } = useReminders();
  const [open, setOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelId = useId();

  // Close when Activity hides this subtree (transient UI shouldn't be restored).
  useLayoutEffect(() => {
    return () => setOpen(false);
  }, []);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function act(r: ReminderDTO, action: "done" | "hour" | "tomorrow") {
    setBusyId(r.id);
    try {
      if (action === "done") {
        await complete(r);
        pushToast({ tone: "success", title: `Marked “${r.title}” done` });
      } else if (action === "hour") {
        await snooze(r, oneHourFromNow());
        pushToast({ tone: "info", title: `Snoozed “${r.title}” for 1 hour` });
      } else {
        await snooze(r, tomorrowAt(r.timeOfDay, new Date()));
        pushToast({ tone: "info", title: `Snoozed “${r.title}” until tomorrow` });
      }
    } catch (err) {
      pushToast({ tone: "error", title: "Couldn't update reminder", body: errorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  const count = due.length;
  const label = count > 0 ? `Reminders, ${count} due` : "Reminders";

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex h-10 w-10 items-center justify-center rounded-full text-xl transition hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 dark:hover:bg-zinc-800"
      >
        <span aria-hidden>🔔</span>
        {count > 0 && (
          <span
            aria-hidden
            className="absolute -right-0.5 -top-0.5 inline-flex min-w-5 items-center justify-center rounded-full bg-rose-600 px-1 text-[11px] font-bold leading-5 text-white ring-2 ring-white dark:ring-zinc-950"
          >
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div
          id={panelId}
          role="dialog"
          aria-label="Due reminders"
          className="fixed inset-x-3 top-16 z-50 max-h-[70vh] overflow-y-auto rounded-2xl border border-zinc-200 bg-white p-3 shadow-xl sm:absolute sm:inset-x-auto sm:right-0 sm:top-12 sm:w-96 dark:border-zinc-800 dark:bg-zinc-900"
        >
          <div className="mb-2 flex items-center justify-between px-1">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">Due now</h2>
            <span className="text-xs text-zinc-500 dark:text-zinc-400">
              {count === 0 ? "All caught up" : `${count} reminder${count === 1 ? "" : "s"}`}
            </span>
          </div>

          {count === 0 ? (
            <p className="px-1 py-6 text-center text-sm text-zinc-500 dark:text-zinc-400">
              <span className="mb-1 block text-2xl" aria-hidden>
                🐾
              </span>
              Nothing due. Nice work!
            </p>
          ) : (
            <ul className="space-y-2">
              {due.map((r) => {
                const meta = KIND_META[r.kind];
                const busy = busyId === r.id;
                return (
                  <li
                    key={r.id}
                    className={`rounded-xl border border-l-4 border-zinc-200 bg-zinc-50 p-3 dark:border-zinc-800 dark:bg-zinc-950 ${meta.ring}`}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-lg leading-6" aria-hidden>
                        {meta.emoji}
                      </span>
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/pets/${r.petId}`}
                          onClick={() => setOpen(false)}
                          className="block truncate text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                        >
                          {r.pet.name}: {r.title}
                        </Link>
                        <p className="text-xs text-rose-600 dark:text-rose-400">
                          {now !== null ? formatRelative(effectiveDueAt(r).getTime(), now) : ""}
                        </p>
                      </div>
                    </div>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => act(r, "done")}
                        className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                      >
                        ✓ Done
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => act(r, "hour")}
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Snooze 1h
                      </button>
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => act(r, "tomorrow")}
                        className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
                      >
                        Tomorrow
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-3 border-t border-zinc-200 px-1 pt-3 dark:border-zinc-800">
            <NotificationPermissionButton />
          </div>
        </div>
      )}
    </div>
  );
}

export default NotificationBell;
