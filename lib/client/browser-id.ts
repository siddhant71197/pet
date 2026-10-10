"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "pets:browserId";

// In-memory fallback for when localStorage is unavailable (private mode etc).
let memoryId: string | null = null;

function readStored(): string | null {
  try {
    return window.localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * Returns this browser's anonymous id, creating and persisting it on first use.
 * Client-only: call from event handlers or effects, never during server render.
 */
export function getBrowserId(): string {
  if (memoryId) return memoryId;
  const stored = readStored();
  if (stored) {
    memoryId = stored;
    return stored;
  }
  const id = crypto.randomUUID();
  try {
    window.localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // ignore: fall back to memory for this session
  }
  memoryId = id;
  return id;
}

function subscribe(onChange: () => void): () => void {
  const handler = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      memoryId = null;
      onChange();
    }
  };
  window.addEventListener("storage", handler);
  return () => window.removeEventListener("storage", handler);
}

const getServerSnapshot = (): string | null => null;

/** Browser id, or null during SSR / the hydration pass. */
export function useBrowserId(): string | null {
  return useSyncExternalStore(subscribe, getBrowserId, getServerSnapshot);
}
