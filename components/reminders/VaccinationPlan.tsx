"use client";

import { useEffect, useRef, useState } from "react";
import type { ReminderDTO, ReminderSuggestion } from "@/lib/reminders/types";
import { suggestionToDraft } from "@/lib/reminders/recurrence";
import { errorMessage, fetchReminders, suggestReminders } from "./api";
import { formatDateTime, formatRelative } from "./kinds";
import { useReminders } from "./RemindersProvider";

const DAY = 24 * 60 * 60 * 1000;

type Loaded = { key: string; list: ReminderDTO[] };
type Proposal =
  | { status: "loading" }
  | { status: "ready"; items: ReminderSuggestion[]; selected: boolean[] }
  | { status: "error"; message: string };

/**
 * Dose-by-dose vaccination plan with escalating alerts. When the pet has no
 * vaccine reminders yet, an AI-built plan is proposed and saved in one click.
 */
export function VaccinationPlan({ petId, petName }: { petId: string; petName: string }) {
  const { browserId, revision, now, create, complete, permission, requestPermission, pushToast } =
    useReminders();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [proposal, setProposal] = useState<Proposal | null>(null);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const key = browserId ? `${browserId}:${petId}` : null;

  useEffect(() => {
    if (!browserId || !key) return;
    let cancelled = false;
    fetchReminders(browserId, { petId })
      .then((list) => {
        if (!cancelled) setLoaded({ key, list: Array.isArray(list) ? list : [] });
      })
      .catch(() => {
        if (!cancelled) setLoaded({ key, list: [] });
      });
    return () => {
      cancelled = true;
    };
  }, [browserId, petId, key, revision]);

  const ready = loaded !== null && loaded.key === key;
  const doses = ready
    ? loaded.list
        .filter((r) => r.kind === "vaccine")
        .sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime())
    : [];
  const hasPlan = doses.length > 0;

  async function propose() {
    if (!browserId) return;
    setProposal({ status: "loading" });
    try {
      const items = await suggestReminders(browserId, petId, "vaccine");
      if (items.length === 0) {
        setProposal({ status: "error", message: "The AI couldn't build a plan. Please try again." });
        return;
      }
      setProposal({ status: "ready", items, selected: items.map(() => true) });
    } catch (err) {
      setProposal({ status: "error", message: errorMessage(err, "suggest") });
    }
  }

  // Build a proposal automatically the first time a pet without a plan is shown.
  const proposeRef = useRef(propose);
  useEffect(() => {
    proposeRef.current = propose;
  });
  const autoProposed = useRef(false);
  const shouldPropose = ready && !hasPlan && proposal === null;
  useEffect(() => {
    if (!shouldPropose || autoProposed.current) return;
    const t = setTimeout(() => {
      autoProposed.current = true;
      void proposeRef.current();
    }, 0);
    return () => clearTimeout(t);
  }, [shouldPropose]);

  async function savePlan() {
    if (proposal?.status !== "ready") return;
    // Ask for notification permission inside the click (browsers require a gesture).
    if (permission === "default") void requestPermission();
    const today = new Date();
    const drafts = proposal.items
      .filter((_, i) => proposal.selected[i])
      .map((s) => suggestionToDraft(s, today));
    if (drafts.length === 0) return;
    setSaving(true);
    try {
      await create(petId, drafts);
      setProposal(null);
      pushToast({
        tone: "success",
        title: `Vaccination alerts on for ${petName}`,
        body: "We'll remind you 7 days before, the day before, on the day, and daily if overdue.",
      });
    } catch (err) {
      pushToast({ tone: "error", title: "Couldn't save the plan", body: errorMessage(err) });
    } finally {
      setSaving(false);
    }
  }

  async function markDone(r: ReminderDTO) {
    setBusyId(r.id);
    try {
      await complete(r);
    } catch (err) {
      pushToast({ tone: "error", title: "Couldn't update", body: errorMessage(err) });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            💉 {petName}&apos;s vaccination plan
          </h3>
          <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
            Alerts 7 days before, the day before, on the day, and every day while overdue, until
            you mark the dose done.
          </p>
        </div>
        <AlertStatus permission={permission} hasPlan={hasPlan} onEnable={() => void requestPermission()} />
      </div>

      {!ready ? (
        <Spinner text="Loading vaccination plan..." />
      ) : hasPlan ? (
        <ol className="relative flex flex-col gap-3 border-l-2 border-sky-200 pl-5 dark:border-sky-900">
          {doses.map((r) => (
            <DoseRow
              key={r.id}
              r={r}
              now={now}
              busy={busyId === r.id}
              onDone={() => void markDone(r)}
            />
          ))}
        </ol>
      ) : proposal === null || proposal.status === "loading" ? (
        <Spinner text={`Building ${petName}'s vaccination plan...`} />
      ) : proposal.status === "error" ? (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        >
          {proposal.message}
          <button
            type="button"
            onClick={() => void propose()}
            className="rounded-full bg-white px-3 py-1 font-medium ring-1 ring-amber-300 hover:bg-amber-100 dark:bg-stone-900 dark:ring-amber-800"
          >
            Try again
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="text-sm text-stone-700 dark:text-stone-300">
            Here&apos;s a suggested plan. Untick anything {petName} has already had, then turn on
            alerts.
          </p>
          <ul className="flex flex-col gap-2">
            {proposal.items.map((s, i) => (
              <li key={`${s.title}-${i}`}>
                <label className="flex cursor-pointer items-start gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900">
                  <input
                    type="checkbox"
                    className="mt-1 size-4 accent-teal-600"
                    checked={proposal.selected[i]}
                    onChange={(e) =>
                      setProposal({
                        ...proposal,
                        selected: proposal.selected.map((v, j) => (j === i ? e.target.checked : v)),
                      })
                    }
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="font-medium text-stone-900 dark:text-stone-100">{s.title}</span>
                      <span className="text-xs font-medium text-sky-700 dark:text-sky-300">
                        {s.dueInDays === 0 ? "Due today" : `In ${dueText(s.dueInDays)}`}
                        {s.recurrence !== "none" ? " · repeats" : ""}
                      </span>
                    </span>
                    {s.notes ? (
                      <span className="mt-0.5 block text-xs text-stone-600 dark:text-stone-400">{s.notes}</span>
                    ) : null}
                  </span>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void savePlan()}
              disabled={saving || !proposal.selected.some(Boolean)}
              className="inline-flex h-11 items-center gap-2 rounded-full bg-teal-600 px-5 text-sm font-semibold text-white shadow-sm transition hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:text-stone-950"
            >
              🔔 {saving ? "Saving..." : "Save plan & turn on alerts"}
            </button>
            <button
              type="button"
              onClick={() => void propose()}
              disabled={saving}
              className="text-sm font-medium text-stone-600 underline underline-offset-2 hover:text-teal-700 dark:text-stone-400"
            >
              Rebuild plan
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-stone-500 dark:text-stone-500">
        Typical schedule - confirm every date with your vet. Alerts appear while PawPlan is open in
        your browser.
      </p>
    </div>
  );
}

function Spinner({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 py-4 text-sm text-stone-600 dark:text-stone-400" aria-live="polite">
      <span className="inline-block size-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent motion-reduce:animate-none" />
      {text}
    </div>
  );
}

function dueText(days: number): string {
  if (days < 14) return `${days} day${days === 1 ? "" : "s"}`;
  if (days < 60) return `${Math.round(days / 7)} weeks`;
  return `${Math.round(days / 30)} months`;
}

function DoseRow({
  r,
  now,
  busy,
  onDone,
}: {
  r: ReminderDTO;
  now: number | null;
  busy: boolean;
  onDone: () => void;
}) {
  const due = new Date(r.dueAt).getTime();
  const done = !r.active;
  let status: { label: string; cls: string };
  if (done) {
    status = { label: "Done", cls: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300" };
  } else if (now !== null && due <= now) {
    status = { label: "Overdue", cls: "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-300" };
  } else if (now !== null && due - now <= 7 * DAY) {
    status = { label: "Due soon", cls: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300" };
  } else {
    status = { label: "Upcoming", cls: "bg-sky-100 text-sky-800 dark:bg-sky-900/40 dark:text-sky-300" };
  }

  return (
    <li className="relative">
      <span
        aria-hidden="true"
        className={`absolute top-4 -left-[27px] size-3 rounded-full ring-4 ring-white dark:ring-stone-900 ${done ? "bg-emerald-500" : status.label === "Overdue" ? "bg-red-500" : "bg-sky-500"}`}
      />
      <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-stone-200 bg-white px-4 py-3 dark:border-stone-700 dark:bg-stone-900">
        <div className="min-w-0 flex-1">
          <p className={`font-medium ${done ? "text-stone-500 line-through" : "text-stone-900 dark:text-stone-100"}`}>
            {r.title}
          </p>
          <p className="text-xs text-stone-600 dark:text-stone-400">
            {now !== null ? (
              <>
                {formatDateTime(r.dueAt)}
                {!done ? ` · ${formatRelative(due, now)}` : ""}
              </>
            ) : (
              " "
            )}
          </p>
          {r.notes && !done ? (
            <p className="mt-0.5 text-xs text-stone-500 dark:text-stone-400">{r.notes}</p>
          ) : null}
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${status.cls}`}>{status.label}</span>
        {!done ? (
          <button
            type="button"
            onClick={onDone}
            disabled={busy}
            className="rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 disabled:opacity-60 dark:bg-teal-500 dark:text-stone-950"
          >
            {busy ? "Saving..." : "Mark done"}
          </button>
        ) : null}
      </div>
    </li>
  );
}

function AlertStatus({
  permission,
  hasPlan,
  onEnable,
}: {
  permission: string | null;
  hasPlan: boolean;
  onEnable: () => void;
}) {
  if (!hasPlan || permission === null) return null;
  if (permission === "granted") {
    return (
      <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
        🔔 Alerts on
      </span>
    );
  }
  if (permission === "default") {
    return (
      <button
        type="button"
        onClick={onEnable}
        className="rounded-full bg-teal-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-700 dark:bg-teal-500 dark:text-stone-950"
      >
        🔔 Enable browser alerts
      </button>
    );
  }
  return (
    <span className="max-w-xs rounded-xl bg-stone-100 px-3 py-1.5 text-xs text-stone-600 dark:bg-stone-800 dark:text-stone-300">
      {permission === "denied"
        ? "Browser alerts are blocked; you'll still see in-app alerts. Allow notifications in your browser settings to get pop-ups."
        : "This browser doesn't support pop-up alerts; you'll see in-app alerts instead."}
    </span>
  );
}

export default VaccinationPlan;
