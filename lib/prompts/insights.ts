import {
  lifeStage,
  MEDICAL_DISCLAIMER,
  parasiteGuidance,
  petProfileBlock,
  speciesLabel,
  vaccineGuidance,
  type PetProfile,
} from "./common";

// Short first-look summary shown right after the owner adds a pet. Detailed
// guides (nutrition, vaccination, medication) are generated on request.
export function buildInsightsPrompt(pet: PetProfile): string {
  const species = speciesLabel(pet.type);
  const { stage } = lifeStage(pet);
  return [
    petProfileBlock(pet),
    "",
    `Give the owner a short first look at caring for ${pet.name}, a ${stage} ${species}. Keep the whole answer under 280 words. Skip the "## Assumptions" section for this answer; instead start with one sentence summarizing ${pet.name}'s life stage and what matters most right now.`,
    `Then use exactly these sections, each with 3 or 4 short bullets that are specific to this pet's age, size, breed and sex:`,
    `## 🥣 Nutrition at a glance`,
    `- Food type for this life stage, meals per day, and an approximate daily calorie range.`,
    `## 💉 Vaccinations at a glance`,
    `- Which vaccines are likely done, due now, or coming up next for a ${pet.ageMonths}-month-old ${species}. Reference: ${vaccineGuidance(species)}`,
    `## 💊 Medication & prevention at a glance`,
    `- Parasite prevention and routine preventive medication to discuss with the vet. Reference: ${parasiteGuidance(species)} Never give doses; say "as prescribed by your vet".`,
    "",
    `Do not add any other sections and do not add a quick tips section.`,
    "",
    MEDICAL_DISCLAIMER,
  ].join("\n");
}
