import { z } from "zod";

export const PET_TYPES = ["dog", "cat"] as const;
export const SIZE_CLASSES = ["small", "medium", "large"] as const;
export const PLAN_SECTIONS = [
  "nutrition",
  "medical",
  "grooming",
  "training",
  "analysis",
  "growth",
  "insights",
  "vaccination",
  "medication",
] as const;
export const GENDERS = ["male", "female"] as const;
export const REMINDER_KINDS = [
  "vaccine",
  "medication",
  "nutrition",
  "grooming",
  "checkup",
] as const;
export const RECURRENCES = [
  "none",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "custom",
] as const;
export const AD_EVENT_TYPES = ["impression", "click", "lead"] as const;

export type PetType = (typeof PET_TYPES)[number];
export type SizeClass = (typeof SIZE_CLASSES)[number];
export type PlanSection = (typeof PLAN_SECTIONS)[number];
export type Gender = (typeof GENDERS)[number];
export type ReminderKind = (typeof REMINDER_KINDS)[number];
export type Recurrence = (typeof RECURRENCES)[number];
export type AdEventType = (typeof AD_EVENT_TYPES)[number];

const optionalTrimmedString = (max: number) =>
  z.string().trim().max(max).optional();

export const PetInputSchema = z.object({
  browserId: z.uuid(),
  type: z.enum(PET_TYPES),
  name: z.string().trim().min(1).max(40),
  ageMonths: z.number().int().min(0).max(300),
  sizeClass: z.enum(SIZE_CLASSES),
  weightKg: z.number().min(0.1).max(150).optional(),
  breed: optionalTrimmedString(60),
  notes: optionalTrimmedString(500),
  gender: z.enum(GENDERS),
  neutered: z.boolean().optional(),
});
export type PetInput = z.infer<typeof PetInputSchema>;

// PATCH /api/pets/[id]: any subset of the editable pet fields.
// Nullable optionals allow clearing a value.
export const PetUpdateSchema = z.object({
  browserId: z.uuid(),
  data: z
    .object({
      type: z.enum(PET_TYPES),
      name: z.string().trim().min(1).max(40),
      ageMonths: z.number().int().min(0).max(300),
      sizeClass: z.enum(SIZE_CLASSES),
      weightKg: z.number().min(0.1).max(150).nullable(),
      breed: z.string().trim().max(60).nullable(),
      notes: z.string().trim().max(500).nullable(),
      gender: z.enum(GENDERS),
      neutered: z.boolean().nullable(),
    })
    .partial(),
});
export type PetUpdate = z.infer<typeof PetUpdateSchema>;

export const PlanInputSchema = z.object({
  browserId: z.uuid(),
  petId: z.string().min(1),
  section: z.enum(PLAN_SECTIONS),
  goal: optionalTrimmedString(500),
});
export type PlanInput = z.infer<typeof PlanInputSchema>;

export const LeadInputSchema = z.object({
  name: z.string().trim().min(1).max(80),
  age: z.number().int().min(18).max(120),
  email: z.email().trim(),
  zipcode: z.string().trim().regex(/^\d{5,6}$/, "Enter a 5 or 6 digit zipcode"),
  petId: z.string().optional(),
  sourceAd: z.string().optional(),
  adProvider: z.string().trim().max(40).optional(),
  browserId: z.uuid().optional(),
  consent: z.literal(true),
});
export type LeadInput = z.infer<typeof LeadInputSchema>;

// ---- Reminders ----

const TIME_OF_DAY = /^([01]\d|2[0-3]):[0-5]\d$/;

export const ReminderDraftSchema = z.object({
  kind: z.enum(REMINDER_KINDS),
  title: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(500).nullable().optional(),
  dueAt: z.iso.datetime({ offset: true }),
  timeOfDay: z.string().regex(TIME_OF_DAY, "Use HH:MM").nullable().optional(),
  recurrence: z.enum(RECURRENCES).default("none"),
  intervalDays: z.number().int().min(1).max(730).nullable().optional(),
  active: z.boolean().optional(),
  source: z.enum(["llm", "user"]).default("user"),
});
export type ReminderDraftInput = z.input<typeof ReminderDraftSchema>;
export type ReminderDraftParsed = z.infer<typeof ReminderDraftSchema>;

export const ReminderCreateSchema = z.object({
  browserId: z.uuid(),
  petId: z.string().min(1),
  reminders: z.array(ReminderDraftSchema).min(1).max(30),
});
export type ReminderCreate = z.infer<typeof ReminderCreateSchema>;

export const ReminderPatchSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("update"),
    browserId: z.uuid(),
    data: ReminderDraftSchema.partial(),
  }),
  z.object({
    action: z.literal("complete"),
    browserId: z.uuid(),
    // Computed on the client (it knows the timezone). null = one-off, deactivate.
    nextDueAt: z.iso.datetime({ offset: true }).nullable(),
  }),
  z.object({
    action: z.literal("snooze"),
    browserId: z.uuid(),
    until: z.iso.datetime({ offset: true }),
  }),
]);
export type ReminderPatch = z.infer<typeof ReminderPatchSchema>;

export const ReminderSuggestRequestSchema = z.object({
  browserId: z.uuid(),
  petId: z.string().min(1),
  /** "vaccine" returns a dose-by-dose vaccination plan instead of a general schedule. */
  focus: z.enum(["vaccine"]).optional(),
});
export type ReminderSuggestRequest = z.infer<typeof ReminderSuggestRequestSchema>;

// One item of the LLM JSON output. Lenient defaults so minor mistakes survive.
export const ReminderSuggestionSchema = z.object({
  kind: z.enum(REMINDER_KINDS),
  title: z.string().trim().min(1).max(120),
  notes: z.string().trim().max(500).default(""),
  dueInDays: z.number().int().min(0).max(730),
  timeOfDay: z.string().regex(TIME_OF_DAY).catch("09:00"),
  recurrence: z.enum(RECURRENCES).catch("none"),
  intervalDays: z.number().int().min(1).max(730).nullable().optional(),
});
export type ReminderSuggestionParsed = z.infer<typeof ReminderSuggestionSchema>;

// ---- Ads ----

export const AdEventSchema = z.object({
  adId: z.string().trim().min(1).max(100),
  provider: z.string().trim().min(1).max(40),
  slot: z.string().trim().min(1).max(40),
  type: z.enum(AD_EVENT_TYPES),
  petId: z.string().max(100).optional(),
  browserId: z.uuid().optional(),
});
export type AdEventInput = z.infer<typeof AdEventSchema>;
