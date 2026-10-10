import type { PetType, PlanSection, SizeClass } from "@/lib/validation";

/** Pet as returned by /api/pets (dates serialized as ISO strings). */
export type PetDTO = {
  id: string;
  browserId: string;
  type: PetType;
  name: string;
  ageMonths: number;
  sizeClass: SizeClass;
  weightKg: number | null;
  breed: string | null;
  notes: string | null;
  gender: "male" | "female" | "unknown" | string;
  neutered: boolean | null;
  createdAt: string;
  updatedAt: string;
};

export type PlanDTO = {
  id: string;
  petId: string;
  section: PlanSection | string;
  goal: string | null;
  content: string;
  createdAt: string;
};

export type PetWithPlans = PetDTO & { plans: PlanDTO[] };

export function formatAge(ageMonths: number): string {
  const years = Math.floor(ageMonths / 12);
  const months = ageMonths % 12;
  if (years === 0) return `${months} ${months === 1 ? "month" : "months"}`;
  const y = `${years} ${years === 1 ? "yr" : "yrs"}`;
  return months ? `${y} ${months} mo` : y;
}

export function lifeStage(type: PetType, ageMonths: number): string {
  if (type === "dog") {
    if (ageMonths < 12) return "Puppy";
    if (ageMonths >= 96) return "Senior";
    return "Adult";
  }
  if (ageMonths < 12) return "Kitten";
  if (ageMonths >= 132) return "Senior";
  return "Adult";
}

export function sexLabel(pet: Pick<PetDTO, "gender" | "neutered">): string | null {
  if (pet.gender !== "male" && pet.gender !== "female") return null;
  const base = pet.gender === "male" ? "Male" : "Female";
  if (pet.neutered === true) return `${base} (${pet.gender === "male" ? "neutered" : "spayed"})`;
  if (pet.neutered === false) return `${base} (intact)`;
  return base;
}

export const SIZE_LABELS: Record<SizeClass, string> = {
  small: "Small",
  medium: "Medium",
  large: "Large",
};

export function petEmoji(type: PetType): string {
  return type === "cat" ? "\u{1F431}" : "\u{1F436}";
}

/** Formats an ISO timestamp in the viewer's locale. Client-only (call after data is fetched). */
export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(iso));
}

/** Pulls a readable message out of a JSON error body. */
export async function readError(res: Response, fallback: string): Promise<{
  message: string;
  fieldErrors?: Record<string, string[] | undefined>;
}> {
  try {
    const data = (await res.json()) as {
      error?: string;
      fieldErrors?: Record<string, string[] | undefined>;
    };
    return { message: data.error || fallback, fieldErrors: data.fieldErrors };
  } catch {
    return { message: fallback };
  }
}
