import {
  goalBlock,
  lifeStage,
  MEDICAL_DISCLAIMER,
  nonCoreVaccines,
  parasiteGuidance,
  petProfileBlock,
  QUICK_TIPS_INSTRUCTION,
  speciesLabel,
  vaccineGuidance,
  type PetProfile,
} from "./common";

export function buildMedicalPrompt(pet: PetProfile, goal?: string | null): string {
  const species = speciesLabel(pet.type);
  const { stage } = lifeStage(pet);
  const spayWord = pet.gender === "female" ? "spay" : pet.gender === "male" ? "neuter" : "spay or neuter";
  const spayLine =
    pet.neutered === true
      ? `- The pet is already ${pet.gender === "female" ? "spayed" : pet.gender === "male" ? "neutered" : "spayed or neutered"}, so do not give ${spayWord} timing advice. Briefly mention post-${spayWord} weight management instead.`
      : `- ${spayWord[0].toUpperCase() + spayWord.slice(1)} timing: a question to discuss with the vet (mention breed and size factors).`;

  return [
    petProfileBlock(pet),
    "",
    `Write a preventive care and medical schedule for this ${stage} ${species}. Present it as a typical schedule the owner should confirm with a vet. Cover:`,
    `## Core vaccines`,
    `- ${vaccineGuidance(species)}`,
    `- Mention non-core options (${nonCoreVaccines(species)}) only if lifestyle fits.`,
    `## Vaccine timeline`,
    `- A markdown table with columns: Age / date | Vaccine | Status for ${pet.name}. Use the pet's current age (${pet.ageMonths} months) to mark each row as "likely done (confirm with records)", "due now", or "upcoming". Include future boosters for the next 3 years.`,
    `## Parasite prevention`,
    `- ${parasiteGuidance(species)}`,
    `## Dental care`,
    `- Dental check at each visit, home brushing, and when professional cleanings are usually needed.`,
    `## Routine checkups`,
    `- Exam frequency for this life stage (puppies and kittens every 3 to 4 weeks until about 16 weeks; adults yearly; seniors about every 6 months).`,
    spayLine,
    `## Age-specific checks`,
    `- Checks that matter for this exact life stage and size (for example growth and joint checks for large puppies, bloodwork, blood pressure, weight, and kidney or thyroid screening for seniors).`,
    `- Red-flag signs that need a prompt vet visit.`,
    "",
    QUICK_TIPS_INSTRUCTION,
    "",
    goalBlock(goal),
    "",
    MEDICAL_DISCLAIMER,
  ].join("\n");
}
