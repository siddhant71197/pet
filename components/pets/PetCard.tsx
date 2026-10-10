import Link from "next/link";
import { formatAge, lifeStage, petEmoji, sexLabel, SIZE_LABELS, type PetDTO } from "./types";

export function PetCard({ pet }: { pet: PetDTO }) {
  const sex = sexLabel(pet);
  return (
    <Link
      href={`/pets/${pet.id}`}
      className="group flex items-center gap-4 rounded-3xl border border-stone-200 bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-teal-300 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 motion-reduce:transform-none dark:border-stone-800 dark:bg-stone-900/60 dark:hover:border-teal-700"
    >
      <span
        aria-hidden="true"
        className={`flex size-14 shrink-0 items-center justify-center rounded-2xl text-3xl ${
          pet.type === "cat"
            ? "bg-amber-100 dark:bg-amber-900/30"
            : "bg-teal-100 dark:bg-teal-900/30"
        }`}
      >
        {petEmoji(pet.type)}
      </span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-base font-semibold text-stone-900 dark:text-stone-100">
            {pet.name}
          </span>
          <span className="shrink-0 rounded-full bg-stone-100 px-2 py-0.5 text-xs font-medium text-stone-600 dark:bg-stone-800 dark:text-stone-300">
            {lifeStage(pet.type, pet.ageMonths)}
          </span>
        </span>
        <span className="mt-0.5 block truncate text-sm text-stone-600 dark:text-stone-400">
          {pet.breed || (pet.type === "cat" ? "Cat" : "Dog")} · {formatAge(pet.ageMonths)}
        </span>
        <span className="mt-0.5 block truncate text-xs text-stone-500 dark:text-stone-500">
          {[SIZE_LABELS[pet.sizeClass], pet.weightKg != null ? `${pet.weightKg} kg` : null, sex]
            .filter(Boolean)
            .join(" · ")}
        </span>
      </span>
      <svg
        aria-hidden="true"
        viewBox="0 0 20 20"
        className="size-5 shrink-0 text-stone-400 transition group-hover:translate-x-0.5 group-hover:text-teal-600"
        fill="currentColor"
      >
        <path
          fillRule="evenodd"
          d="M7.21 14.77a.75.75 0 0 1 .02-1.06L11.17 10 7.23 6.29a.75.75 0 1 1 1.04-1.08l4.5 4.25a.75.75 0 0 1 0 1.08l-4.5 4.25a.75.75 0 0 1-1.06-.02Z"
          clipRule="evenodd"
        />
      </svg>
    </Link>
  );
}
