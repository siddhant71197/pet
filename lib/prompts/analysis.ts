import { goalBlock, lifeStage, MEDICAL_DISCLAIMER, petProfileBlock, speciesLabel, type PetProfile } from "./common";

export function buildAnalysisPrompt(pet: PetProfile, goal?: string | null): string {
  const species = speciesLabel(pet.type);
  const { stage } = lifeStage(pet);
  return [
    petProfileBlock(pet),
    "",
    `Write a profile analysis for this ${species}. Cover:`,
    `## Life stage summary`,
    `- Confirm the ${stage} stage and what it means day to day for a ${species} of this age.`,
    `## Size considerations`,
    `- How size class${pet.weightKg != null ? " and weight" : ""} affects growth, lifespan, energy, and joints.`,
    `## Key risks to watch for`,
    `- The most common health and behavior risks for this life stage, size, and breed. Keep to the top 5 to 7.`,
    `## Quick takeaways`,
    `- 3 bullet points the owner should act on first.`,
    "",
    goalBlock(goal),
    "",
    MEDICAL_DISCLAIMER,
  ].join("\n");
}
