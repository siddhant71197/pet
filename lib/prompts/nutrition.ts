import {
  goalBlock,
  lifeStage,
  MEDICAL_DISCLAIMER,
  petProfileBlock,
  QUICK_TIPS_INSTRUCTION,
  speciesLabel,
  type PetProfile,
} from "./common";

// Resting energy requirement (RER) = 70 * kg^0.75 kcal/day, a standard veterinary approximation.
function restingEnergy(kg: number): number {
  return Math.round(70 * Math.pow(kg, 0.75));
}

export function buildNutritionPrompt(pet: PetProfile, goal?: string | null): string {
  const species = speciesLabel(pet.type);
  const { stage } = lifeStage(pet);
  const rer =
    pet.weightKg != null
      ? `Resting energy requirement for the stated weight: about ${restingEnergy(pet.weightKg)} kcal/day (70 × kg^0.75). Multiply by a life-stage factor to estimate daily needs.`
      : `Weight is not provided, so base the calorie estimate on typical weights for a ${pet.sizeClass} ${species} and state that assumption.`;

  const neuteredLine =
    pet.neutered === true
      ? "The pet is spayed/neutered: use the lower neutered-adult factor (about 1.6 × RER for adult dogs, 1.2 × RER for adult cats) and flag the higher weight-gain risk."
      : pet.neutered === false
        ? "The pet is intact: use the intact-adult factor (about 1.8 × RER for adult dogs, 1.4 × RER for adult cats) if adult."
        : "Spay/neuter status is unknown: give ranges for both and say which applies.";

  return [
    petProfileBlock(pet),
    "",
    `Write a nutrition plan for this ${stage} ${species}. Cover:`,
    `## Daily calories`,
    `- ${rer} Give a daily calorie range (for example "X to Y kcal/day") and say that exact needs depend on body condition, activity, and spay/neuter status. ${neuteredLine}`,
    `## Feeding schedule`,
    `- Meals per day and portion guidance by age and size.`,
    `## Food type`,
    `- Complete and balanced food guidance (for example AAFCO or FEDIAF statement), wet vs dry, and transition tips.`,
    `## Foods to avoid`,
    `- Toxic and risky foods for ${species}s, such as ${species === "dog" ? "chocolate, grapes and raisins, xylitol, onions and garlic, cooked bones, macadamia nuts" : "onions and garlic, lilies (plant), grapes, raw fish or raw egg, xylitol, dog food, cooked bones"}.`,
    `## Hydration`,
    `- Water intake guidance${species === "cat" ? " (cats often under-drink, so wet food helps)" : ""}.`,
    `## Treats`,
    `- Keep treats to about 10% of daily calories, and suggest healthy options.`,
    "",
    QUICK_TIPS_INSTRUCTION,
    "",
    goalBlock(goal),
    "",
    MEDICAL_DISCLAIMER,
  ].join("\n");
}
