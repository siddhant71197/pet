import { AdTray } from "@/components/ads/AdTray";
import { StickyAdBar } from "@/components/ads/StickyAdBar";
import { PetsHome } from "@/components/pets/PetsHome";

const STEPS = [
  { n: 1, title: "Tell us about your pet", body: "Breed, age, size and sex." },
  { n: 2, title: "Get instant insights", body: "Nutrition, vaccines and medication at a glance." },
  { n: 3, title: "Go deeper", body: "Detailed guides and reminders when you want them." },
];

export default function Home() {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 sm:py-8">
      <section className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-teal-600 to-teal-800 px-6 py-6 text-white shadow-lg sm:px-10 sm:py-8 dark:from-teal-800 dark:to-teal-950">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-8 -bottom-12 text-[9rem] leading-none opacity-15 select-none sm:text-[12rem]"
        >
          {"\u{1F43E}"}
        </div>
        <div className="relative max-w-2xl">
          <h1 className="text-2xl leading-tight font-semibold tracking-tight text-balance sm:text-4xl">
            A care plan that fits your pet, not the average one.
          </h1>
          <p className="mt-2 max-w-xl text-sm text-teal-50/90 sm:text-base">
            Share a few details about your dog or cat and get personalised advice in seconds.
          </p>
        </div>
        <ol className="relative mt-5 grid gap-2 sm:grid-cols-3 sm:gap-3">
          {STEPS.map((s) => (
            <li
              key={s.n}
              className="flex items-start gap-3 rounded-2xl bg-white/10 px-3 py-2.5 backdrop-blur-sm"
            >
              <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-teal-800">
                {s.n}
              </span>
              <span>
                <span className="block text-sm font-semibold">{s.title}</span>
                <span className="hidden text-xs text-teal-50/80 sm:block">{s.body}</span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <PetsHome />

      <AdTray />

      <StickyAdBar />
    </div>
  );
}
