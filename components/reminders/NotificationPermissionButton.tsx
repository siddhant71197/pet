"use client";

import { useState } from "react";
import { useReminders } from "./RemindersProvider";

/**
 * Asks for browser notification permission on click. Explains when the
 * browser doesn't support notifications or the user blocked them.
 */
export function NotificationPermissionButton({ className = "" }: { className?: string }) {
  const { permission, requestPermission } = useReminders();
  const [asking, setAsking] = useState(false);

  if (permission === null || permission === "granted") return null;

  if (permission === "unsupported") {
    return (
      <p className={`text-xs text-zinc-500 dark:text-zinc-400 ${className}`}>
        This browser can&apos;t show system notifications. Reminders will appear here while the
        site is open. On iPhone/iPad, add this site to your Home Screen to enable alerts.
      </p>
    );
  }

  if (permission === "denied") {
    return (
      <p className={`text-xs text-zinc-500 dark:text-zinc-400 ${className}`}>
        Notifications are blocked. To get alerts, allow notifications for this site in your
        browser&apos;s site settings. In-app reminders still work.
      </p>
    );
  }

  return (
    <button
      type="button"
      disabled={asking}
      onClick={async () => {
        setAsking(true);
        try {
          await requestPermission();
        } finally {
          setAsking(false);
        }
      }}
      className={`inline-flex items-center gap-2 rounded-full bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500 disabled:opacity-60 ${className}`}
    >
      <span aria-hidden>🔔</span>
      {asking ? "Waiting for your browser…" : "Enable browser notifications"}
    </button>
  );
}

export default NotificationPermissionButton;
