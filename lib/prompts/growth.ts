import {
  goalBlock,
  isJuvenile,
  lifeStage,
  MEDICAL_DISCLAIMER,
  petProfileBlock,
  QUICK_TIPS_INSTRUCTION,
  speciesLabel,
  type PetProfile,
} from "./common";

export function buildGrowthPrompt(pet: PetProfile, goal?: string | null): string {
  const species = speciesLabel(pet.type);
  const { stage } = lifeStage(pet);
  const growing = isJuvenile(pet);
  const weightMark =
    pet.weightKg != null
      ? `Mark the row closest to the current age (${pet.ageMonths} months) with "← ${pet.name} now (${pet.weightKg} kg)" and say whether that weight is below, within, or above the typical range.`
      : `Weight is not provided, so mark the row closest to the current age (${pet.ageMonths} months) with "← ${pet.name} now" and suggest weighing the pet.`;

  const sections = growing
    ? [
        `## Expected adult size`,
        `- Estimated adult weight range and height${species === "dog" ? " at the shoulder" : ""} for this breed and size class, and the age at which growth usually finishes${species === "dog" && pet.sizeClass === "large" ? " (large breeds often grow until 18 to 24 months)" : ""}.`,
        `## Milestones by age`,
        `- Physical and behavioral milestones from now until adulthood (teething, adult teeth, sexual maturity, coat changes, growth-plate closure).`,
        `## Weight curve`,
        `- A markdown table with columns: Age | Typical weight range (kg) | Notes. Rows from birth-ish to adult size at sensible intervals (monthly while young).`,
        `- ${weightMark}`,
        `## Exercise by age`,
        species === "dog"
          ? `- How much structured exercise is appropriate at each age. ${pet.sizeClass === "large" ? "This is a large-breed puppy: give joint-safe limits (no forced running, long jogs, repeated jumping or stairs before growth plates close; the rough 5-minutes-per-month-of-age guideline for structured walks, with free play on soft ground)." : "Include limits on high-impact activity while growth plates are open."}`
          : `- Daily play by age (short bursts of hunting-style play, climbing, enrichment) and how to avoid over-tiring a kitten.`,
        `## Body condition check`,
        `- How to check body condition at home (rib feel, waist from above, abdominal tuck) using a 1 to 9 scale, and what ideal looks like while growing.`,
      ]
    : [
        `## Adult size`,
        `- Typical adult weight range for this breed and size class, and whether ${pet.name}${pet.weightKg != null ? `'s ${pet.weightKg} kg` : ""} sits within it.`,
        `## Weight maintenance`,
        `- A markdown table with columns: Body condition | What you see and feel | Action. ${weightMark.replace(/Mark the row[^.]*\./, "Highlight where the current weight likely falls.")}`,
        `- How often to weigh, and how to adjust food for a ${stage} ${species}${pet.neutered === true ? " that is spayed/neutered (lower energy needs)" : ""}.`,
        `## Mobility and exercise`,
        `- Daily exercise suited to a ${stage} ${species} of this size${stage === "senior" ? ", with joint-friendly options, signs of arthritis, and how to adapt the home (ramps, non-slip floors, raised bowls if advised)" : ""}.`,
        `## Body condition check`,
        `- How to check body condition at home (rib feel, waist from above, abdominal tuck) using a 1 to 9 scale.`,
      ];

  return [
    petProfileBlock(pet),
    "",
    growing
      ? `Write a growth guide for this ${stage} ${species}. Cover:`
      : `Write a weight and mobility maintenance guide for this ${stage} ${species} (it is no longer growing). Cover:`,
    ...sections,
    "",
    QUICK_TIPS_INSTRUCTION,
    "",
    goalBlock(goal),
    "",
    MEDICAL_DISCLAIMER,
  ].join("\n");
}
