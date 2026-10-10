import type {
  Recurrence,
  ReminderDraftInput,
  ReminderKind,
  ReminderSuggestionParsed,
} from "@/lib/validation";

export type { ReminderKind, Recurrence };

/** What the client sends in ReminderCreateSchema.reminders (input shape). */
export type ReminderDraft = ReminderDraftInput;

/** One LLM-suggested reminder, relative to "today" (see suggestionToDraft). */
export type ReminderSuggestion = ReminderSuggestionParsed;

/** JSON shape returned by /api/reminders. All dates are ISO strings. */
export type ReminderDTO = {
  id: string;
  petId: string;
  kind: ReminderKind;
  title: string;
  notes: string | null;
  dueAt: string;
  timeOfDay: string | null;
  recurrence: Recurrence;
  intervalDays: number | null;
  active: boolean;
  snoozedUntil: string | null;
  lastCompletedAt: string | null;
  completedCount: number;
  source: "llm" | "user";
  pet: { name: string; type: string };
};
