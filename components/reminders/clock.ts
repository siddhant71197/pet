"use client";

import { useSyncExternalStore } from "react";

// A shared, render-safe clock. The current time is only read inside
// subscribe/tick (effect phase or timers), never during render, and the
// server snapshot is null so SSR/hydration never sees a timestamp.

const TICK_MS = 30_000;

let current: number | null = null;
const listeners = new Set<() => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function emit() {
  for (const l of listeners) l();
}

/** Advance the shared clock to the real current time and notify subscribers. */
export function tickNow(): void {
  current = Date.now();
  emit();
}

function onVisibility() {
  if (document.visibilityState === "visible") tickNow();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    timer = setInterval(tickNow, TICK_MS);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("focus", tickNow);
    // Refresh immediately: the cached value may be stale after a pause.
    current = Date.now();
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) {
      if (timer) clearInterval(timer);
      timer = null;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("focus", tickNow);
    }
  };
}

const getSnapshot = () => current;
const getServerSnapshot = () => null;

/** Epoch ms of "now", refreshed every 30s and on tab focus. null before mount. */
export function useNow(): number | null {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
