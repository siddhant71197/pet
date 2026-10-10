import {
  goalBlock,
  lifeStage,
  MEDICAL_DISCLAIMER,
  nonCoreVaccines,
  petProfileBlock,
  QUICK_TIPS_INSTRUCTION,
  speciesLabel,
  vaccineGuidance,
  type PetProfile,
} from "./common";

export function buildVaccinationPrompt(pet: PetProfile, goal?: string | null): string {
  const species = speciesLabel(pet.type);
  const { stage } = lifeStage(pet);
  return [
    petProfileBlock(pet),
    "",
    `Write a detailed vaccination guide for this ${stage} ${species}. Present it as a typical schedule the owner should confirm with a vet. Cover:`,
    `## Core vaccines`,
    `- ${vaccineGuidance(species)} Explain in one line what each one protects against.`,
    `## Vaccine timeline`,
    `- A markdown table with columns: Age / date | Vaccine | Status for ${pet.name}. Use the pet's current age (${pet.ageMonths} months) to mark each row as "likely done (confirm with records)", "due now", or "upcoming". Include boosters for the next 3 years.`,
    `## Non-core vaccines`,
    `- ${nonCoreVaccines(species)}: who needs them, based on lifestyle (boarding, outdoors, travel, other pets).`,
    `## Unknown or missed history`,
    `- What to do if records are missing or a dose was missed (catch-up schedule, titer tests).`,
    `## Before and after the visit`,
    `- How to prepare, normal mild side effects, and warning signs of a reaction that need a vet right away.`,
    "",
    QUICK_TIPS_INSTRUCTION,
    "",
    goalBlock(goal),
    "",
    MEDICAL_DISCLAIMER,
  ].join("\n");
}
