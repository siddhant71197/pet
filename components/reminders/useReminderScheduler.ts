"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import type { ReminderDTO } from "@/lib/reminders/types";
import { alertLabel, currentAlert } from "@/lib/reminders/alerts";
import { hasFired, markFired, pruneFired } from "./firedStore";
import { pushToast } from "./toastStore";
import { notificationsSupported } from "./permission";

/** Max OS notifications per tick, so a backlog doesn't spam the user. */
const MAX_NOTIFICATIONS_PER_TICK = 3;

/**
 * Fires reminders that became due. Runs whenever `now` ticks (every 30s and
 * when the tab becomes visible, via the shared clock) or the list changes.
 * Must be mounted in the root layout (RemindersProvider) so Activity never
 * hides it and cleans up its effects.
 */
export function useReminderScheduler(reminders: ReminderDTO[] | null, now: number | null): void {
  const router = useRouter();
  const routerRef = useRef(router);
  useEffect(() => {
    routerRef.current = router;
  }, [router]);

  useEffect(() => {
    pruneFired();
  }, []);

  useEffect(() => {
    if (!reminders || now === null) return;
    const fresh = reminders
      .map((r) => ({ r, alert: currentAlert(r, now) }))
      .filter((x): x is { r: ReminderDTO; alert: NonNullable<typeof x.alert> } => x.alert !== null)
      .map(({ r, alert }) => ({ r, alert, key: alert.key }))
      .filter(({ key }) => !hasFired(key))
      .sort((a, b) => a.alert.at - b.alert.at);
    if (fresh.length === 0) return;

    const canNotify =
      notificationsSupported() &&
      (() => {
        try {
          return Notification.permission === "granted";
        } catch {
          return false;
        }
      })();

    fresh.forEach(({ r, alert, key }, i) => {
      markFired(key, now);
      const vaccine = r.kind === "vaccine";
      const title = vaccine
        ? `💉 ${r.pet.name}: ${r.title} ${alertLabel(alert.phase, r.dueAt, now)}`
        : `${r.pet.name}: ${r.title}`;
      const body = vaccine
        ? alert.phase === "week" || alert.phase === "day"
          ? `Book the vet visit now. ${r.notes ?? ""}`.trim()
          : `Mark it done once ${r.pet.name} is vaccinated. We'll keep reminding you daily until then.`
        : r.notes || "Tap to open your pet's reminders.";

      if (canNotify && i < MAX_NOTIFICATIONS_PER_TICK) {
        try {
          const n = new Notification(title, {
            body,
            tag: key,
            requireInteraction:
              r.kind === "medication" || (vaccine && (alert.phase === "due" || alert.phase === "overdue")),
          });
          n.onclick = () => {
            try {
              window.focus();
            } catch {
              // ignore
            }
            routerRef.current.push(`/pets/${r.petId}`);
            n.close();
          };
        } catch {
          // e.g. Android Chrome requires a service worker; the toast still shows.
        }
      }

      if (i < MAX_NOTIFICATIONS_PER_TICK) {
        pushToast({
          tone: "reminder",
          title,
          body: vaccine ? body : r.notes || undefined,
          reminderId: r.id,
          petId: r.petId,
          kind: r.kind,
        });
      }
    });

    const extra = fresh.length - MAX_NOTIFICATIONS_PER_TICK;
    if (extra > 0) {
      pushToast({
        tone: "info",
        title: `${extra} more reminder${extra === 1 ? " is" : "s are"} due`,
        body: "Open the bell to see everything that's due.",
      });
    }
  }, [reminders, now]);
}

export default useReminderScheduler;
