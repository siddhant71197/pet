import type { PlanSection } from "@/lib/validation";
import { SYSTEM_PROMPT, type PetProfile } from "./common";
import { buildAnalysisPrompt } from "./analysis";
import { buildGroomingPrompt } from "./grooming";
import { buildGrowthPrompt } from "./growth";
import { buildInsightsPrompt } from "./insights";
import { buildMedicalPrompt } from "./medical";
import { buildMedicationPrompt } from "./medication";
import { buildNutritionPrompt } from "./nutrition";
import { buildTrainingPrompt } from "./training";
import { buildVaccinationPrompt } from "./vaccination";

export type { PetProfile } from "./common";
export { buildRemindersPrompt, buildVaccinePlanPrompt, REMINDERS_SYSTEM_PROMPT } from "./reminders";

const BUILDERS: Record<PlanSection, (pet: PetProfile, goal?: string | null) => string> = {
  analysis: buildAnalysisPrompt,
  nutrition: buildNutritionPrompt,
  medical: buildMedicalPrompt,
  grooming: buildGroomingPrompt,
  training: buildTrainingPrompt,
  growth: buildGrowthPrompt,
  insights: (pet) => buildInsightsPrompt(pet),
  vaccination: buildVaccinationPrompt,
  medication: buildMedicationPrompt,
};

export function buildPrompt(
  section: PlanSection,
  pet: PetProfile,
  goal?: string | null,
): { prompt: string; systemPrompt: string } {
  return { prompt: BUILDERS[section](pet, goal), systemPrompt: SYSTEM_PROMPT };
}
