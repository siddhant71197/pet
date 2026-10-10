import {
  goalBlock,
  lifeStage,
  MEDICAL_DISCLAIMER,
  petProfileBlock,
  QUICK_TIPS_INSTRUCTION,
  speciesLabel,
  type PetProfile,
} from "./common";

export function buildGroomingPrompt(pet: PetProfile, goal?: string | null): string {
  const species = speciesLabel(pet.type);
  const { stage } = lifeStage(pet);
  const breedLine = pet.breed?.trim()
    ? `Coat type for ${pet.breed.trim()}: state the typical coat (for example short, double, curly, silky, or hairless) and what that means. If the breed is uncertain, say so.`
    : `Breed is not provided, so describe the coat for a typical ${species} of this size and note the assumption.`;

  return [
    petProfileBlock(pet),
    "",
    `Write a grooming plan for this ${stage} ${species}. Cover:`,
    `## Coat type`,
    `- ${breedLine}`,
    `## Brushing`,
    `- How often and which tools to use.`,
    `## Bathing`,
    `- How often, which products to use, and what to avoid.`,
    `## Nails`,
    `- Trimming frequency and how to keep the quick safe.`,
    `## Ears`,
    `- Cleaning routine and warning signs of infection.`,
    `## Teeth`,
    `- Brushing routine and dental products to look for.`,
    `## Seasonal tips`,
    `- Adjustments for shedding seasons, heat, cold, and wet weather.`,
    ...(pet.neutered === true
      ? [`- Spayed/neutered pets can put on weight, which makes self-grooming harder${species === "cat" ? " (watch for a matted lower back)" : ""}; mention this briefly.`]
      : []),
    "",
    QUICK_TIPS_INSTRUCTION,
    "",
    goalBlock(goal),
    "",
    MEDICAL_DISCLAIMER,
  ].join("\n");
}
