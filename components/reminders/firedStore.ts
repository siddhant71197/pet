"use client";

// Remembers which reminder occurrences already fired (OS notification and/or
// toast) so reloads and other tabs don't repeat them. Keyed by occurrenceKey.

const STORAGE_KEY = "pets:firedReminders";
const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

type FiredMap = Record<string, number>;

// Fallback when localStorage is unavailable (private mode, blocked storage).
const memory: FiredMap = {};

function read(): FiredMap {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...memory };
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const out: FiredMap = { ...memory };
      for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
        if (typeof v === "number") out[k] = v;
      }
      return out;
    }
  } catch {
    // fall through
  }
  return { ...memory };
}

function write(map: FiredMap): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(map));
  } catch {
    // ignore: memory copy still prevents repeats in this session
  }
}

function prune(map: FiredMap, now: number): FiredMap {
  const out: FiredMap = {};
  for (const [k, ts] of Object.entries(map)) {
    if (now - ts < MAX_AGE_MS) out[k] = ts;
  }
  return out;
}

export function hasFired(key: string): boolean {
  return key in memory || key in read();
}

export function markFired(key: string, now: number = Date.now()): void {
  memory[key] = now;
  const map = prune(read(), now);
  map[key] = now;
  write(map);
}

/** Drop entries older than 30 days. */
export function pruneFired(now: number = Date.now()): void {
  write(prune(read(), now));
}
