import {
  goalBlock,
  lifeStage,
  MEDICAL_DISCLAIMER,
  petProfileBlock,
  QUICK_TIPS_INSTRUCTION,
  speciesLabel,
  type PetProfile,
} from "./common";

export function buildTrainingPrompt(pet: PetProfile, goal?: string | null): string {
  const species = speciesLabel(pet.type);
  const { stage } = lifeStage(pet);
  const hasGoal = Boolean(goal?.trim());
  const approach =
    species === "dog"
      ? "Use reward-based methods (positive reinforcement, life rewards, short sessions of 5 to 10 minutes)."
      : "Use reward-based methods suited to cats (short play sessions, food or play rewards, scratching and enrichment, litter training, and never punishment).";

  const sections = hasGoal
    ? [
        `## Goal`,
        `- Restate the owner's goal in one sentence.`,
        `## Step-by-step plan`,
        `- A numbered plan of 5 to 8 steps with what to do, how long, and how to know the step worked.`,
        `## Common setbacks`,
        `- Typical problems and how to handle them.`,
        `## Progress markers`,
        `- How to measure progress over 2 to 4 weeks.`,
      ]
    : [
        `## House-training`,
        `- Routine, supervision, and handling accidents for this ${species}.`,
        `## Socialization`,
        `- Exposure windows, people, other pets, sounds, and handling for a ${stage}.`,
        `## Basic cues`,
        `- Starter skills to teach first.`,
        `## Common behavior issues`,
        `- What to expect at this life stage and how to respond.`,
      ];

  return [
    petProfileBlock(pet),
    "",
    `Write a training plan for this ${stage} ${species}. ${approach}`,
    hasGoal
      ? "The owner has supplied a goal. Focus the whole plan on that goal."
      : "The owner has not supplied a goal, so give general basics.",
    ...sections,
    "",
    QUICK_TIPS_INSTRUCTION,
    "",
    goalBlock(goal),
    "",
    MEDICAL_DISCLAIMER,
  ].join("\n");
}
