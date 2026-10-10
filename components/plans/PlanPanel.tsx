"use client";

import { useEffect, useId, useRef, useState } from "react";
import { getBrowserId } from "@/lib/client/browser-id";
import type { PlanSection } from "@/lib/validation";
import { Button } from "@/components/ui/Button";
import { inputClasses } from "@/components/ui/Field";
import { formatDateTime, readError, type PlanDTO } from "@/components/pets/types";
import { Markdown } from "./Markdown";

type StreamState = {
  text: string;
  status: "streaming" | "stopped" | "error";
};

const ERROR_MARKER = /\n*\[Error:\s*([^\]]*)\]\s*$/;

function friendlyStatusError(status: number, message: string): string {
  switch (status) {
    case 429:
      return "You've reached the limit of plans for now. Please wait a bit and try again.";
    case 404:
      return "We couldn't find this pet. It may have been deleted.";
    case 400:
      return "Something about this request wasn't valid. Try shortening your goal.";
    case 502:
    case 503:
    case 504:
      return "Our AI vet assistant is having trouble right now. Please try again in a moment.";
    default:
      return message || "Something went wrong generating the plan.";
  }
}

export function PlanPanel({
  petId,
  petName,
  section,
  title,
  description,
  goalPlaceholder,
  history,
  onGenerated,
  autoStart = false,
  hideGoal = false,
  hideHeader = false,
}: {
  petId: string;
  petName: string;
  section: PlanSection;
  title: string;
  description: string;
  goalPlaceholder?: string;
  /** Saved plans for this section, newest first. */
  history: PlanDTO[];
  /** Called after a plan finishes streaming (it has been saved server-side). */
  onGenerated: () => Promise<void>;
  /** Start generating on mount when there is no saved plan yet. */
  autoStart?: boolean;
  /** Hide the optional goal input (the generate button stays). */
  hideGoal?: boolean;
  /** Hide the title/description (when the parent renders its own). */
  hideHeader?: boolean;
}) {
  const uid = useId();
  const [goal, setGoal] = useState("");
  const [stream, setStream] = useState<StreamState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // Deliberately NOT aborted in effect cleanup: with cacheComponents, hidden
  // pages run effect cleanups, and the stream should survive navigation.
  const abortRef = useRef<AbortController | null>(null);

  const streaming = stream?.status === "streaming";
  const selected =
    (selectedId && history.find((p) => p.id === selectedId)) || history[0] || null;

  async function generate() {
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setError(null);
    setStream({ text: "", status: "streaming" });

    let text = "";
    try {
      const res = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          browserId: getBrowserId(),
          petId,
          section,
          goal: goal.trim() || undefined,
        }),
        signal: ctrl.signal,
      });

      if (!res.ok || !res.body) {
        const { message } = await readError(res, "");
        setError(friendlyStatusError(res.status, message));
        setStream(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        text += decoder.decode(value, { stream: true });
        setStream({ text, status: "streaming" });
      }
      text += decoder.decode();

      const marker = ERROR_MARKER.exec(text);
      if (marker) {
        setStream({ text: text.slice(0, marker.index), status: "error" });
        setError(
          `${marker[1] || "Plan generation failed."} The partial plan below was not saved.`,
        );
        return;
      }
      if (!text.trim()) {
        setStream(null);
        setError("The assistant returned an empty plan. Please try again.");
        return;
      }

      setStream({ text, status: "streaming" });
      await onGenerated();
      setSelectedId(null);
      setStream(null);
    } catch {
      if (ctrl.signal.aborted) {
        setStream((s) => (s && s.text ? { ...s, status: "stopped" } : null));
      } else {
        setStream((s) => (s && s.text ? { ...s, status: "error" } : null));
        setError("Connection lost while generating. Check your network and try again.");
      }
    } finally {
      if (abortRef.current === ctrl) abortRef.current = null;
    }
  }

  // Auto-start once per mount. Deferred to a timeout so state updates happen
  // outside the effect body; the cleanup cancels a pending start (StrictMode).
  const autoStarted = useRef(false);
  const generateRef = useRef(generate);
  useEffect(() => {
    generateRef.current = generate;
  });
  const shouldAutoStart = autoStart && history.length === 0;
  useEffect(() => {
    if (!shouldAutoStart || autoStarted.current) return;
    const t = setTimeout(() => {
      autoStarted.current = true;
      void generateRef.current();
    }, 0);
    return () => clearTimeout(t);
  }, [shouldAutoStart]);

  function stop() {
    abortRef.current?.abort();
  }

  const showingStream = stream !== null;
  const content = showingStream ? stream.text : (selected?.content ?? "");
  const goalId = `${uid}-goal`;
  const historyId = `${uid}-history`;

  return (
    <div className="flex flex-col gap-5">
      {hideHeader ? null : (
        <div className="flex flex-col gap-1">
          <h2 className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            {title}
          </h2>
          <p className="text-sm text-stone-600 dark:text-stone-400">{description}</p>
        </div>
      )}

      <form
        className={`flex flex-col gap-3 sm:flex-row sm:items-end ${hideGoal ? "sm:justify-end" : ""}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (!streaming) void generate();
        }}
      >
        <div className={`flex flex-1 flex-col gap-1.5 ${hideGoal ? "hidden" : ""}`}>
          <label
            htmlFor={goalId}
            className="text-sm font-medium text-stone-700 dark:text-stone-300"
          >
            Goal or question <span className="font-normal text-stone-500">(optional)</span>
          </label>
          <input
            id={goalId}
            className={inputClasses}
            value={goal}
            maxLength={500}
            onChange={(e) => setGoal(e.target.value)}
            placeholder={goalPlaceholder ?? `Anything specific about ${petName}?`}
            disabled={streaming}
          />
        </div>
        {streaming ? (
          <Button variant="secondary" onClick={stop} className="sm:w-auto">
            <span aria-hidden="true" className="size-2.5 rounded-sm bg-current" />
            Stop
          </Button>
        ) : (
          <Button type="submit" className="sm:w-auto">
            {history.length > 0 || stream ? "Regenerate" : "Generate plan"}
          </Button>
        )}
      </form>

      {error ? (
        <div
          role="alert"
          className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200"
        >
          {error}
        </div>
      ) : null}

      {!showingStream && history.length > 1 ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <label htmlFor={historyId} className="text-stone-600 dark:text-stone-400">
            Showing
          </label>
          <select
            id={historyId}
            className={`${inputClasses} w-auto max-w-full py-1.5`}
            value={selected?.id ?? ""}
            onChange={(e) => setSelectedId(e.target.value)}
          >
            {history.map((p, i) => (
              <option key={p.id} value={p.id}>
                {i === 0 ? "Latest" : `Plan ${history.length - i}`}
                {` - ${formatDateTime(p.createdAt)}`}
                {p.goal ? ` - "${p.goal.slice(0, 40)}${p.goal.length > 40 ? "..." : ""}"` : ""}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      {!showingStream && selected && (history.length === 1 || selected.goal) ? (
        <p className="-mt-2 text-xs text-stone-500 dark:text-stone-500">
          {[
            history.length === 1 ? `Generated ${formatDateTime(selected.createdAt)}` : null,
            selected.goal ? `Goal: ${selected.goal}` : null,
          ]
            .filter(Boolean)
            .join(" · ")}
        </p>
      ) : null}

      <div
        aria-live="polite"
        aria-busy={streaming}
        className="rounded-2xl border border-stone-200 bg-white px-5 py-4 dark:border-stone-800 dark:bg-stone-950/40 sm:px-6 sm:py-5"
      >
        {content ? (
          <>
            <Markdown>{content}</Markdown>
            {streaming ? <span className="stream-caret text-teal-600" aria-hidden="true" /> : null}
            {stream?.status === "stopped" ? (
              <p className="mt-4 text-xs text-stone-500">
                Stopped. This partial plan wasn&apos;t saved - generate again for a full plan.
              </p>
            ) : null}
          </>
        ) : streaming ? (
          <div className="flex items-center gap-3 py-6 text-sm text-stone-600 dark:text-stone-400">
            <span className="inline-block size-4 animate-spin rounded-full border-2 border-teal-500 border-t-transparent motion-reduce:animate-none" />
            Preparing {petName}&apos;s {title.toLowerCase()}...
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-8 text-center">
            <span aria-hidden="true" className="text-3xl">
              {"\u{1F43E}"}
            </span>
            <p className="font-medium text-stone-800 dark:text-stone-200">No plan yet</p>
            <p className="max-w-sm text-sm text-stone-600 dark:text-stone-400">
              Generate a personalised {title.toLowerCase()} for {petName}. It takes about 20-40
              seconds.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
