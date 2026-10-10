"use client";

import { useSyncExternalStore } from "react";

/** "unsupported" when the browser has no Notification API (e.g. iOS Safari outside a PWA). */
export type NotificationPermissionState = NotificationPermission | "unsupported";

const listeners = new Set<() => void>();
let permStatus: PermissionStatus | null = null;

function emit() {
  for (const l of listeners) l();
}

export function notificationsSupported(): boolean {
  return typeof window !== "undefined" && "Notification" in window;
}

function readPermission(): NotificationPermissionState {
  if (!notificationsSupported()) return "unsupported";
  try {
    return Notification.permission;
  } catch {
    return "unsupported";
  }
}

function subscribe(l: () => void) {
  listeners.add(l);
  if (listeners.size === 1) {
    window.addEventListener("focus", emit);
    document.addEventListener("visibilitychange", emit);
    // Some browsers report permission changes (e.g. from site settings).
    try {
      navigator.permissions
        ?.query({ name: "notifications" as PermissionName })
        .then((status) => {
          permStatus = status;
          status.onchange = emit;
        })
        .catch(() => {});
    } catch {
      // unsupported
    }
  }
  return () => {
    listeners.delete(l);
    if (listeners.size === 0) {
      window.removeEventListener("focus", emit);
      document.removeEventListener("visibilitychange", emit);
      if (permStatus) permStatus.onchange = null;
      permStatus = null;
    }
  };
}

const getServerSnapshot = (): NotificationPermissionState | null => null;

/**
 * Notification permission, or null during SSR/hydration (so nothing
 * permission-dependent is rendered on the server).
 */
export function useNotificationPermission(): NotificationPermissionState | null {
  return useSyncExternalStore(subscribe, readPermission, getServerSnapshot);
}

/** Ask for permission. Must be called from a user gesture (click handler). */
export async function requestNotificationPermission(): Promise<NotificationPermissionState> {
  if (!notificationsSupported()) return "unsupported";
  try {
    const result = await new Promise<NotificationPermission>((resolve, reject) => {
      // Older Safari uses a callback instead of returning a promise.
      const maybe = Notification.requestPermission((p) => resolve(p));
      if (maybe && typeof maybe.then === "function") maybe.then(resolve, reject);
    });
    emit();
    return result;
  } catch {
    emit();
    return readPermission();
  }
}
