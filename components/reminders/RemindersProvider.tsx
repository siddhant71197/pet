"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { getBrowserId, useBrowserId } from "@/lib/client/browser-id";
import type { ReminderDraft, ReminderDTO } from "@/lib/reminders/types";
import { effectiveDueAt, isDue, nextOccurrence } from "@/lib/reminders/recurrence";
import {
  createReminders,
  deleteReminder,
  fetchReminders,
  patchReminder,
  type ReminderUpdateData,
} from "./api";
import { tickNow, useNow } from "./clock";
import {
  requestNotificationPermission,
  useNotificationPermission,
  type NotificationPermissionState,
} from "./permission";
import { dismissToast, pushToast, useToasts, type Toast, type ToastInput } from "./toastStore";
import { useReminderScheduler } from "./useReminderScheduler";

const REFRESH_MS = 5 * 60_000;
const CHANNEL_NAME = "pets-reminders";

export type RemindersContextValue = {
  browserId: string | null;
  /** Active reminders for all pets (null until first load). */
  reminders: ReminderDTO[] | null;
  /** Active reminders whose effective due time has passed, oldest first. */
  due: ReminderDTO[];
  /** Epoch ms from the shared clock; null before mount. Use for client-only date labels. */
  now: number | null;
  loading: boolean;
  error: string | null;
  /** Increments after every successful refresh; per-pet views refetch on change. */
  revision: number;
  refresh: () => Promise<void>;
  create: (petId: string, drafts: ReminderDraft[]) => Promise<ReminderDTO[]>;
  update: (id: string, data: ReminderUpdateData) => Promise<ReminderDTO>;
  complete: (r: ReminderDTO) => Promise<ReminderDTO>;
  snooze: (r: ReminderDTO | string, until: Date) => Promise<ReminderDTO>;
  remove: (id: string) => Promise<void>;
  permission: NotificationPermissionState | null;
  requestPermission: () => Promise<NotificationPermissionState>;
  toasts: Toast[];
  pushToast: (t: ToastInput) => number;
  dismissToast: (id: number) => void;
};

const RemindersContext = createContext<RemindersContextValue | null>(null);

export function RemindersProvider({ children }: { children: ReactNode }) {
  const browserId = useBrowserId();
  const now = useNow();
  const permission = useNotificationPermission();
  const toasts = useToasts();

  const [reminders, setReminders] = useState<ReminderDTO[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [revision, setRevision] = useState(0);

  const requestSeq = useRef(0);
  const channelRef = useRef<BroadcastChannel | null>(null);

  const load = useCallback((id: string): Promise<void> => {
    const seq = ++requestSeq.current;
    return fetchReminders(id, { active: true }).then(
      (list) => {
        if (seq !== requestSeq.current) return; // a newer request won
        setReminders(Array.isArray(list) ? list : []);
        setError(null);
        setRevision((v) => v + 1);
        tickNow();
      },
      (err: unknown) => {
        if (seq !== requestSeq.current) return;
        setError(err instanceof Error ? err.message : "Couldn't load reminders");
        setReminders((prev) => prev ?? []);
      },
    );
  }, []);

  const refresh = useCallback(async () => {
    await load(getBrowserId());
  }, [load]);

  const afterMutation = useCallback(async () => {
    try {
      channelRef.current?.postMessage({ type: "changed" });
    } catch {
      // ignore
    }
    await refresh();
  }, [refresh]);

  // Initial load, periodic refresh, refresh on tab visibility.
  useEffect(() => {
    if (!browserId) return;
    void load(browserId);
    const interval = setInterval(() => void load(browserId), REFRESH_MS);
    const onVisible = () => {
      if (document.visibilityState === "visible") void load(browserId);
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [browserId, load]);

  // Cross-tab sync.
  useEffect(() => {
    if (!browserId || typeof BroadcastChannel === "undefined") return;
    let channel: BroadcastChannel;
    try {
      channel = new BroadcastChannel(CHANNEL_NAME);
    } catch {
      return;
    }
    channelRef.current = channel;
    channel.onmessage = () => void load(browserId);
    return () => {
      channel.close();
      if (channelRef.current === channel) channelRef.current = null;
    };
  }, [browserId, load]);

  useReminderScheduler(reminders, now);

  const create = useCallback(
    async (petId: string, drafts: ReminderDraft[]) => {
      const created = await createReminders(getBrowserId(), petId, drafts);
      await afterMutation();
      return created;
    },
    [afterMutation],
  );

  const update = useCallback(
    async (id: string, data: ReminderUpdateData) => {
      const updated = await patchReminder(id, { browserId: getBrowserId(), action: "update", data });
      await afterMutation();
      return updated;
    },
    [afterMutation],
  );

  const complete = useCallback(
    async (r: ReminderDTO) => {
      const next = nextOccurrence(new Date(r.dueAt), r.recurrence, r.intervalDays, new Date());
      const updated = await patchReminder(r.id, {
        browserId: getBrowserId(),
        action: "complete",
        nextDueAt: next ? next.toISOString() : null,
      });
      await afterMutation();
      return updated;
    },
    [afterMutation],
  );

  const snooze = useCallback(
    async (r: ReminderDTO | string, until: Date) => {
      const id = typeof r === "string" ? r : r.id;
      const updated = await patchReminder(id, {
        browserId: getBrowserId(),
        action: "snooze",
        until: until.toISOString(),
      });
      await afterMutation();
      return updated;
    },
    [afterMutation],
  );

  const remove = useCallback(
    async (id: string) => {
      await deleteReminder(getBrowserId(), id);
      await afterMutation();
    },
    [afterMutation],
  );

  const due = useMemo(() => {
    if (!reminders || now === null) return [];
    const nowDate = new Date(now);
    return reminders
      .filter((r) => isDue(r, nowDate))
      .sort((a, b) => effectiveDueAt(a).getTime() - effectiveDueAt(b).getTime());
  }, [reminders, now]);

  const value = useMemo<RemindersContextValue>(
    () => ({
      browserId,
      reminders,
      due,
      now,
      loading: browserId !== null && reminders === null,
      error,
      revision,
      refresh,
      create,
      update,
      complete,
      snooze,
      remove,
      permission,
      requestPermission: requestNotificationPermission,
      toasts,
      pushToast,
      dismissToast,
    }),
    [browserId, reminders, due, now, error, revision, refresh, create, update, complete, snooze, remove, permission, toasts],
  );

  return <RemindersContext.Provider value={value}>{children}</RemindersContext.Provider>;
}

export function useReminders(): RemindersContextValue {
  const ctx = useContext(RemindersContext);
  if (!ctx) throw new Error("useReminders must be used inside <RemindersProvider>");
  return ctx;
}

export default RemindersProvider;
