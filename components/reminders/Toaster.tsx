"use client";

import Link from "next/link";
import { useState } from "react";
import { errorMessage } from "./api";
import { KIND_META, oneHourFromNow } from "./kinds";
import { useReminders } from "./RemindersProvider";
import type { Toast } from "./toastStore";

const TONE_STYLES: Record<Toast["tone"], string> = {
  reminder: "border-indigo-200 dark:border-indigo-900",
  success: "border-emerald-200 dark:border-emerald-900",
  error: "border-rose-300 dark:border-rose-900",
  info: "border-zinc-200 dark:border-zinc-800",
};

const TONE_ICON: Record<Toast["tone"], string> = {
  reminder: "🔔",
  success: "✅",
  error: "⚠️",
  info: "ℹ️",
};

function ToastCard({ toast }: { toast: Toast }) {
  const { reminders, complete, snooze, dismissToast, pushToast } = useReminders();
  const [busy, setBusy] = useState(false);
  const reminder = toast.reminderId ? reminders?.find((r) => r.id === toast.reminderId) : undefined;
  const icon = toast.kind ? KIND_META[toast.kind].emoji : TONE_ICON[toast.tone];

  async function run(fn: () => Promise<unknown>, done: string) {
    setBusy(true);
    try {
      await fn();
      dismissToast(toast.id);
      pushToast({ tone: "success", title: done });
    } catch (err) {
      setBusy(false);
      pushToast({ tone: "error", title: "Couldn't update reminder", body: errorMessage(err) });
    }
  }

  return (
    <li
      role={toast.tone === "error" ? "alert" : "status"}
      className={`pointer-events-auto w-full rounded-2xl border bg-white p-3 shadow-lg dark:bg-zinc-900 ${TONE_STYLES[toast.tone]}`}
    >
      <div className="flex items-start gap-2">
        <span className="text-lg leading-6" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{toast.title}</p>
          {toast.body && <p className="mt-0.5 text-sm text-zinc-600 dark:text-zinc-300">{toast.body}</p>}
          {toast.tone === "reminder" && toast.reminderId && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {reminder && (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => run(() => complete(reminder), `Marked “${reminder.title}” done`)}
                  className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
                >
                  ✓ Done
                </button>
              )}
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  run(() => snooze(toast.reminderId!, oneHourFromNow()), "Snoozed for 1 hour")
                }
                className="rounded-full border border-zinc-300 px-3 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
              >
                Snooze 1h
              </button>
              {toast.petId && (
                <Link
                  href={`/pets/${toast.petId}`}
                  onClick={() => dismissToast(toast.id)}
                  className="rounded-full px-3 py-1 text-xs font-medium text-indigo-600 hover:underline dark:text-indigo-400"
                >
                  Open
                </Link>
              )}
            </div>
          )}
        </div>
        <button
          type="button"
          aria-label="Dismiss notification"
          onClick={() => dismissToast(toast.id)}
          className="-m-1 rounded-full p-1 text-zinc-400 hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
        >
          <span aria-hidden>✕</span>
        </button>
      </div>
    </li>
  );
}

/** Renders in-app toasts (reminder alerts, confirmations, errors). Mount once in the root layout. */
export function Toaster() {
  const { toasts } = useReminders();
  return (
    <div
      aria-live="polite"
      aria-relevant="additions"
      className="pointer-events-none fixed inset-x-3 bottom-24 z-[60] flex justify-center sm:inset-x-auto sm:right-4 sm:bottom-24"
    >
      <ul className="flex w-full max-w-sm flex-col gap-2">
        {toasts.map((t) => (
          <ToastCard key={t.id} toast={t} />
        ))}
      </ul>
    </div>
  );
}

export default Toaster;
