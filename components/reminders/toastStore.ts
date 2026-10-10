"use client";

import { useSyncExternalStore } from "react";
import type { ReminderKind } from "@/lib/reminders/types";

export type Toast = {
  id: number;
  title: string;
  body?: string;
  tone: "reminder" | "success" | "error" | "info";
  /** For reminder toasts: enables Done / Snooze actions. */
  reminderId?: string;
  petId?: string;
  kind?: ReminderKind;
};

export type ToastInput = Omit<Toast, "id"> & { durationMs?: number | null };

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();
const timers = new Map<number, ReturnType<typeof setTimeout>>();
const MAX_TOASTS = 5;

function emit() {
  for (const l of listeners) l();
}

export function dismissToast(id: number): void {
  const t = timers.get(id);
  if (t) clearTimeout(t);
  timers.delete(id);
  const next = toasts.filter((x) => x.id !== id);
  if (next.length !== toasts.length) {
    toasts = next;
    emit();
  }
}

/** Show a toast. Reminder toasts stay for 20s (medication: until dismissed). */
export function pushToast(input: ToastInput): number {
  const { durationMs, ...rest } = input;
  const id = nextId++;
  toasts = [...toasts, { ...rest, id }];
  // Drop the oldest if we're over the cap.
  while (toasts.length > MAX_TOASTS) {
    const oldest = toasts[0];
    dismissToast(oldest.id);
  }
  const duration =
    durationMs !== undefined
      ? durationMs
      : rest.tone === "reminder"
        ? rest.kind === "medication"
          ? null
          : 20_000
        : 5_000;
  if (duration !== null) {
    timers.set(
      id,
      setTimeout(() => dismissToast(id), duration),
    );
  }
  emit();
  return id;
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => {
    listeners.delete(l);
  };
}

const EMPTY: Toast[] = [];
const getSnapshot = () => toasts;
const getServerSnapshot = () => EMPTY;

export function useToasts(): Toast[] {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
