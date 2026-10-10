import { PetCard } from "./PetCard";
import type { PetDTO } from "./types";

export function PetList({ pets }: { pets: PetDTO[] }) {
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {pets.map((pet) => (
        <li key={pet.id}>
          <PetCard pet={pet} />
        </li>
      ))}
    </ul>
  );
}
