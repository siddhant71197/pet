// Sliding-window, in-memory rate limiter.
// NOTE: state lives in process memory, so limits are per server instance and
// reset on restart.

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSec: number };

export function createRateLimiter({ limit, windowMs }: { limit: number; windowMs: number }) {
  const log = new Map<string, number[]>();

  function check(key: string): RateLimitResult {
    const now = Date.now();
    const recent = (log.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      log.set(key, recent);
      return { ok: false, retryAfterSec: Math.max(1, Math.ceil((recent[0] + windowMs - now) / 1000)) };
    }
    recent.push(now);
    log.set(key, recent);

    // Keep the map from growing without bound.
    if (log.size > 5000) {
      for (const [k, times] of log) {
        if (times.every((t) => now - t >= windowMs)) log.delete(k);
      }
    }
    return { ok: true };
  }

  return { check };
}

/** Shared by /api/plans and /api/reminders/suggest: 10 LLM generations per browserId per hour. */
export const generationLimiter = createRateLimiter({ limit: 10, windowMs: 60 * 60 * 1000 });
