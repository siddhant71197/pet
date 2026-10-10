import {
  goalBlock,
  lifeStage,
  MEDICAL_DISCLAIMER,
  parasiteGuidance,
  petProfileBlock,
  QUICK_TIPS_INSTRUCTION,
  speciesLabel,
  type PetProfile,
} from "./common";

export function buildMedicationPrompt(pet: PetProfile, goal?: string | null): string {
  const species = speciesLabel(pet.type);
  const { stage } = lifeStage(pet);
  return [
    petProfileBlock(pet),
    "",
    `Write a medication and preventive care guide for this ${stage} ${species}. Never give doses or brand-specific dosing; say "as prescribed by your vet". Cover:`,
    `## Parasite prevention`,
    `- ${parasiteGuidance(species)}`,
    `## Prevention schedule`,
    `- A markdown table with columns: Medication type | What it prevents | How often | Notes for ${pet.name}. Cover flea/tick, heartworm (if relevant), and intestinal deworming.`,
    `## Giving medication safely`,
    `- How to give pills, chews and spot-on treatments to a ${species}; never use products made for a different species (for example dog flea products are toxic to cats); store safely.`,
    `## Common medications to discuss with your vet`,
    `- Typical conditions for this life stage, size and breed that may need medication (for example joint support for large or senior pets, allergy or ear treatments), described generally.`,
    `## Never give at home`,
    `- Human medicines that are dangerous for ${species}s (for example ibuprofen, acetaminophen/paracetamol, aspirin without vet advice).`,
    `## When to call the vet`,
    `- Side effects and red-flag signs after medication.`,
    "",
    QUICK_TIPS_INSTRUCTION,
    "",
    goalBlock(goal),
    "",
    MEDICAL_DISCLAIMER,
  ].join("\n");
}
