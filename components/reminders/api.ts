"use client";

import type { ReminderDraft, ReminderDTO, ReminderSuggestion } from "@/lib/reminders/types";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      cache: "no-store",
      headers: init?.body ? { "Content-Type": "application/json", ...init?.headers } : init?.headers,
    });
  } catch {
    throw new ApiError(0, "Network error. Check your connection and try again.");
  }
  if (res.status === 204) return undefined as T;
  let body: unknown = null;
  try {
    body = await res.json();
  } catch {
    body = null;
  }
  if (!res.ok) {
    const msg =
      body && typeof body === "object" && "error" in body && typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return body as T;
}

export function fetchReminders(
  browserId: string,
  opts: { petId?: string; active?: boolean } = {},
): Promise<ReminderDTO[]> {
  const qs = new URLSearchParams({ browserId });
  if (opts.petId) qs.set("petId", opts.petId);
  if (opts.active) qs.set("active", "1");
  return request<ReminderDTO[]>(`/api/reminders?${qs.toString()}`);
}

export function createReminders(
  browserId: string,
  petId: string,
  reminders: ReminderDraft[],
): Promise<ReminderDTO[]> {
  return request<ReminderDTO[]>("/api/reminders", {
    method: "POST",
    body: JSON.stringify({ browserId, petId, reminders }),
  });
}

export type ReminderUpdateData = Partial<ReminderDraft>;

export function patchReminder(
  id: string,
  body:
    | { browserId: string; action: "update"; data: ReminderUpdateData }
    | { browserId: string; action: "complete"; nextDueAt: string | null }
    | { browserId: string; action: "snooze"; until: string },
): Promise<ReminderDTO> {
  return request<ReminderDTO>(`/api/reminders/${encodeURIComponent(id)}`, {
    method: "PATCH",
    body: JSON.stringify(body),
  });
}

export function deleteReminder(browserId: string, id: string): Promise<void> {
  const qs = new URLSearchParams({ browserId });
  return request<void>(`/api/reminders/${encodeURIComponent(id)}?${qs.toString()}`, {
    method: "DELETE",
  });
}

export async function suggestReminders(
  browserId: string,
  petId: string,
  focus?: "vaccine",
): Promise<ReminderSuggestion[]> {
  const res = await request<{ suggestions?: ReminderSuggestion[] }>("/api/reminders/suggest", {
    method: "POST",
    body: JSON.stringify({ browserId, petId, focus }),
  });
  return Array.isArray(res?.suggestions) ? res.suggestions : [];
}

/** Human message for an error thrown by the helpers above. */
export function errorMessage(err: unknown, context: "suggest" | "save" | "load" = "save"): string {
  if (err instanceof ApiError) {
    if (err.status === 429) {
      return "You've made a lot of AI requests recently. Please wait a bit and try again.";
    }
    if (err.status === 502 && context === "suggest") {
      return "The AI couldn't produce a schedule right now. Please try again in a moment.";
    }
    if (err.status === 404) return "That item couldn't be found. It may have been deleted.";
    return err.message;
  }
  return "Something went wrong. Please try again.";
}
