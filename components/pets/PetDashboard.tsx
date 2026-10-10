"use client";

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getBrowserId, useBrowserId } from "@/lib/client/browser-id";
import type { PlanSection, ReminderKind } from "@/lib/validation";
import { AdTray } from "@/components/ads/AdTray";
import { StickyAdBar } from "@/components/ads/StickyAdBar";
import { RemindersPanel } from "@/components/reminders/RemindersPanel";
import { VaccinationPlan } from "@/components/reminders/VaccinationPlan";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { PlanPanel } from "@/components/plans/PlanPanel";
import { PetForm } from "./PetForm";
import {
  formatAge,
  lifeStage,
  petEmoji,
  readError,
  sexLabel,
  SIZE_LABELS,
  type PetDTO,
  type PetWithPlans,
  type PlanDTO,
} from "./types";

type Guide = {
  id: string;
  icon: string;
  label: string;
  blurb: string;
  section: PlanSection;
  title: string;
  description: string;
  goalPlaceholder: string;
  reminderKinds?: ReminderKind[];
};

// Step 3: the owner chooses what to learn more about.
const DEEP_DIVES: Guide[] = [
  {
    id: "nutrition",
    icon: "🥣",
    label: "Nutrition",
    blurb: "Calories, portions, feeding schedule and foods to avoid",
    section: "nutrition",
    title: "Nutrition plan",
    description: "Daily calories, portions, feeding schedule and foods to avoid.",
    goalPlaceholder: "e.g. Help with weight loss, or switching to wet food",
    reminderKinds: ["nutrition"],
  },
  {
    id: "vaccination",
    icon: "💉",
    label: "Vaccination",
    blurb: "Full vaccine timeline, boosters and what to expect",
    section: "vaccination",
    title: "Vaccination guide",
    description: "Core and optional vaccines, a dated timeline and catch-up advice.",
    goalPlaceholder: "e.g. We're travelling abroad next spring",
    reminderKinds: ["vaccine", "checkup"],
  },
  {
    id: "medication",
    icon: "💊",
    label: "Medication",
    blurb: "Flea, tick, heartworm, deworming and medication safety",
    section: "medication",
    title: "Medication & prevention guide",
    description: "Preventive medication schedule, safe dosing practices and red flags.",
    goalPlaceholder: "e.g. My cat hates taking pills",
    reminderKinds: ["medication"],
  },
];

// Everything else lives under "More for {pet}".
const MORE_GUIDES: Guide[] = [
  {
    id: "overview",
    icon: "🩺",
    label: "Health overview",
    blurb: "Strengths, risks to watch and priorities",
    section: "analysis",
    title: "Health overview",
    description: "A breed- and age-aware snapshot: strengths, risks to watch and priorities.",
    goalPlaceholder: "e.g. What should I focus on this year?",
  },
  {
    id: "growth",
    icon: "📈",
    label: "Growth",
    blurb: "Adult size, milestones and weight curve",
    section: "growth",
    title: "Growth & development",
    description: "Expected adult size, milestones, weight curve and safe exercise by age.",
    goalPlaceholder: "e.g. Is my pet's weight on track?",
  },
  {
    id: "grooming",
    icon: "✂️",
    label: "Grooming",
    blurb: "Coat, nails, ears, teeth and bathing",
    section: "grooming",
    title: "Grooming routine",
    description: "Coat, nails, ears, teeth and bathing - how often and how to do it.",
    goalPlaceholder: "e.g. Heavy shedding in summer",
  },
  {
    id: "training",
    icon: "🎾",
    label: "Training",
    blurb: "Step-by-step training and enrichment",
    section: "training",
    title: "Training plan",
    description: "Step-by-step training and enrichment tailored to age and temperament.",
    goalPlaceholder: "e.g. Stop pulling on the lead",
  },
];

type LoadState =
  | { status: "loading" }
  | { status: "ready"; pet: PetWithPlans }
  | { status: "notfound" }
  | { status: "error"; message: string };

export function PetDashboard({ petId }: { petId: string }) {
  const router = useRouter();
  const browserId = useBrowserId();
  const [load, setLoad] = useState<LoadState>({ status: "loading" });
  const [reloadKey, setReloadKey] = useState(0);
  // Guides the owner has opened (kept mounted so streams survive) and the one shown.
  const [opened, setOpened] = useState<string[]>([]);
  const [activeDeep, setActiveDeep] = useState<string | null>(null);
  const [activeMore, setActiveMore] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Close the transient edit form if the page is hidden by Activity.
  useLayoutEffect(() => {
    return () => {
      setEditing(false);
      setActionError(null);
    };
  }, []);

  // Re-runs when the page becomes visible again, keeping data fresh.
  useEffect(() => {
    if (!browserId) return;
    const ctrl = new AbortController();
    const qs = new URLSearchParams({ id: petId, browserId });
    fetch(`/api/pets?${qs}`, { signal: ctrl.signal, cache: "no-store" })
      .then(async (res) => {
        if (res.status === 404 || res.status === 400) {
          setLoad({ status: "notfound" });
          return;
        }
        if (!res.ok) throw new Error(String(res.status));
        const pet = (await res.json()) as PetWithPlans;
        setLoad({ status: "ready", pet });
      })
      .catch(() => {
        if (!ctrl.signal.aborted) {
          setLoad((prev) =>
            prev.status === "ready"
              ? prev
              : { status: "error", message: "We couldn't load this pet." },
          );
        }
      });
    return () => ctrl.abort();
  }, [browserId, petId, reloadKey]);

  const refreshPlans = useCallback(async () => {
    const qs = new URLSearchParams({ petId, browserId: getBrowserId() });
    try {
      const res = await fetch(`/api/plans?${qs}`, { cache: "no-store" });
      if (!res.ok) return;
      const plans = (await res.json()) as PlanDTO[];
      setLoad((prev) =>
        prev.status === "ready" ? { status: "ready", pet: { ...prev.pet, plans } } : prev,
      );
    } catch {
      // Non-fatal: the next page visit refetches.
    }
  }, [petId]);

  async function handleDelete(pet: PetDTO) {
    if (
      !window.confirm(
        `Delete ${pet.name}? This removes their plans and reminders and can't be undone.`,
      )
    ) {
      return;
    }
    setDeleting(true);
    setActionError(null);
    try {
      const qs = new URLSearchParams({ browserId: getBrowserId() });
      const res = await fetch(`/api/pets/${encodeURIComponent(pet.id)}?${qs}`, {
        method: "DELETE",
      });
      if (!res.ok && res.status !== 404) {
        const { message } = await readError(res, "Couldn't delete this pet.");
        setActionError(message);
        setDeleting(false);
        return;
      }
      setDeleting(false);
      router.push("/");
    } catch {
      setActionError("Network error - please try again.");
      setDeleting(false);
    }
  }

  function openGuide(id: string, group: "deep" | "more") {
    setOpened((prev) => (prev.includes(id) ? prev : [...prev, id]));
    if (group === "deep") setActiveDeep((cur) => (cur === id ? null : id));
    else setActiveMore((cur) => (cur === id ? null : id));
  }

  if (load.status === "loading") return <DashboardSkeleton />;

  if (load.status === "notfound") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-20 text-center">
        <span aria-hidden="true" className="text-5xl">
          {"\u{1F43E}"}
        </span>
        <h1 className="text-2xl font-semibold text-stone-900 dark:text-stone-100">
          Pet not found
        </h1>
        <p className="text-stone-600 dark:text-stone-400">
          This pet doesn&apos;t exist or was added on a different browser.
        </p>
        <Link
          href="/"
          className="font-medium text-teal-700 underline underline-offset-4 dark:text-teal-300"
        >
          Back to your pets
        </Link>
      </div>
    );
  }

  if (load.status === "error") {
    return (
      <div className="mx-auto flex w-full max-w-xl flex-col items-center gap-4 px-4 py-20 text-center">
        <h1 className="text-xl font-semibold text-stone-900 dark:text-stone-100">
          {load.message}
        </h1>
        <Button
          variant="secondary"
          onClick={() => {
            setLoad({ status: "loading" });
            setReloadKey((k) => k + 1);
          }}
        >
          Try again
        </Button>
      </div>
    );
  }

  const { pet } = load;
  const sex = sexLabel(pet);
  const plansBySection = (section: PlanSection) =>
    pet.plans.filter((p) => p.section === section);
  const hasAnyPlan = pet.plans.length > 0;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10">
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1 rounded-full text-sm font-medium text-stone-600 hover:text-teal-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:text-stone-400 dark:hover:text-teal-300"
      >
        <span aria-hidden="true">&larr;</span> All pets
      </Link>

      <StepLabel step={1}>Your pet</StepLabel>
      <Card className="mt-2 p-5 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start">
          <span
            aria-hidden="true"
            className={`flex size-16 shrink-0 items-center justify-center rounded-2xl text-4xl sm:size-20 sm:text-5xl ${
              pet.type === "cat"
                ? "bg-amber-100 dark:bg-amber-900/30"
                : "bg-teal-100 dark:bg-teal-900/30"
            }`}
          >
            {petEmoji(pet.type)}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-2xl font-semibold tracking-tight text-stone-900 sm:text-3xl dark:text-stone-100">
                {pet.name}
              </h1>
              <span className="rounded-full bg-teal-50 px-2.5 py-0.5 text-xs font-semibold text-teal-800 dark:bg-teal-950/50 dark:text-teal-200">
                {lifeStage(pet.type, pet.ageMonths)}
              </span>
            </div>
            <p className="mt-1 text-stone-600 dark:text-stone-400">
              {pet.breed || (pet.type === "cat" ? "Cat" : "Dog")}
            </p>
            <ul className="mt-3 flex flex-wrap gap-2 text-sm" aria-label="Pet details">
              <Chip>{formatAge(pet.ageMonths)}</Chip>
              <Chip>{SIZE_LABELS[pet.sizeClass]} size</Chip>
              {pet.weightKg != null ? <Chip>{pet.weightKg} kg</Chip> : null}
              {sex ? <Chip>{sex}</Chip> : <Chip muted>Sex not set</Chip>}
            </ul>
            {pet.notes ? (
              <p className="mt-3 line-clamp-3 text-sm text-stone-600 dark:text-stone-400">
                <span className="font-medium text-stone-700 dark:text-stone-300">Notes: </span>
                {pet.notes}
              </p>
            ) : null}
          </div>
          <div className="flex shrink-0 gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setEditing((v) => !v)}
              aria-expanded={editing}
              aria-controls="edit-pet"
            >
              {editing ? "Close" : "Edit"}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => void handleDelete(pet)}
              disabled={deleting}
            >
              {deleting ? "Deleting..." : "Delete"}
            </Button>
          </div>
        </div>
        {actionError ? (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {actionError}
          </p>
        ) : null}
        {pet.gender !== "male" && pet.gender !== "female" && !editing ? (
          <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            Add {pet.name}&apos;s sex and spay/neuter status for more accurate advice.{" "}
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="font-semibold underline underline-offset-2"
            >
              Update profile
            </button>
          </p>
        ) : null}
        {editing ? (
          <div
            id="edit-pet"
            className="mt-6 border-t border-stone-200 pt-6 dark:border-stone-800"
          >
            <h2 className="mb-4 text-lg font-semibold text-stone-900 dark:text-stone-100">
              Edit {pet.name}
            </h2>
            <PetForm
              key={pet.updatedAt}
              pet={pet}
              onSaved={(saved) => {
                setLoad((prev) =>
                  prev.status === "ready"
                    ? { status: "ready", pet: { ...prev.pet, ...saved } }
                    : prev,
                );
                setEditing(false);
              }}
              onCancel={() => setEditing(false)}
            />
          </div>
        ) : null}
      </Card>

      <AdTray
        className="mt-6"
        petName={pet.name}
        petType={pet.type}
        ageMonths={pet.ageMonths}
        petId={pet.id}
      />

      <div className="mt-8 flex flex-col gap-8">
        {/* Step 2: a short first look, generated automatically. */}
        <section aria-labelledby="insights-heading">
          <StepLabel step={2}>Insights</StepLabel>
          <Card className="mt-2 p-5 sm:p-6">
            <h2
              id="insights-heading"
              className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100"
            >
              ✨ {pet.name} at a glance
            </h2>
            <p className="mt-1 mb-4 text-sm text-stone-600 dark:text-stone-400">
              Nutrition, vaccination and medication essentials for {pet.name}&apos;s age and breed.
            </p>
            <PlanPanel
              petId={pet.id}
              petName={pet.name}
              section="insights"
              title="Insights"
              description=""
              history={plansBySection("insights")}
              onGenerated={refreshPlans}
              autoStart
              hideGoal
              hideHeader
            />
          </Card>
        </section>

        {/* Step 3: ask what the owner wants to explore further. */}
        {hasAnyPlan ? (
          <section aria-labelledby="deep-heading">
            <StepLabel step={3}>Go deeper</StepLabel>
            <Card className="mt-2 p-5 sm:p-6">
              <h2
                id="deep-heading"
                className="text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100"
              >
                Want to know more about {pet.name}?
              </h2>
              <p className="mt-1 text-sm text-stone-600 dark:text-stone-400">
                Pick a topic for a detailed, personalised guide.
              </p>
              <ChoiceGrid
                guides={DEEP_DIVES}
                active={activeDeep}
                plans={pet.plans}
                onChoose={(id) => openGuide(id, "deep")}
              />
            </Card>
            {DEEP_DIVES.filter((g) => opened.includes(g.id)).map((g) => (
              <GuideCard
                key={g.id}
                guide={g}
                hidden={activeDeep !== g.id}
                petId={pet.id}
                petName={pet.name}
                history={plansBySection(g.section)}
                onGenerated={refreshPlans}
              />
            ))}
          </section>
        ) : null}

        {hasAnyPlan ? (
          <section aria-labelledby="more-heading">
            <h2
              id="more-heading"
              className="text-base font-semibold tracking-tight text-stone-900 dark:text-stone-100"
            >
              More for {pet.name}
            </h2>
            <ChoiceGrid
              guides={[
                ...MORE_GUIDES,
                {
                  id: "reminders",
                  icon: "🔔",
                  label: "Reminders",
                  blurb: "Vaccines, meds, meals and grooming",
                  section: "insights",
                  title: "",
                  description: "",
                  goalPlaceholder: "",
                },
              ]}
              active={activeMore}
              plans={pet.plans}
              compact
              onChoose={(id) => openGuide(id, "more")}
            />
            {MORE_GUIDES.filter((g) => opened.includes(g.id)).map((g) => (
              <GuideCard
                key={g.id}
                guide={g}
                hidden={activeMore !== g.id}
                petId={pet.id}
                petName={pet.name}
                history={plansBySection(g.section)}
                onGenerated={refreshPlans}
              />
            ))}
            {opened.includes("reminders") ? (
              <div hidden={activeMore !== "reminders"}>
                <Card className="mt-4 p-5 sm:p-6">
                  <h3 className="mb-1 text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
                    Reminders
                  </h3>
                  <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
                    Vaccines, medication, meals, grooming and check-ups for {pet.name}.
                  </p>
                  <RemindersPanel petId={pet.id} />
                </Card>
              </div>
            ) : null}
          </section>
        ) : null}

        <div>
          <p className="mt-4 text-xs text-stone-500 dark:text-stone-500">
            Plans are AI-generated guidance, not a diagnosis. Always check with your vet before
            changing diet, medication or vaccines.
          </p>
        </div>
      </div>

      <StickyAdBar
        petName={pet.name}
        petType={pet.type}
        ageMonths={pet.ageMonths}
        petId={pet.id}
      />
    </div>
  );
}

function StepLabel({ step, children }: { step: number; children: ReactNode }) {
  return (
    <p className="flex items-center gap-2 text-xs font-semibold tracking-wide text-teal-700 uppercase dark:text-teal-300">
      <span className="flex size-5 items-center justify-center rounded-full bg-teal-600 text-[11px] text-white dark:bg-teal-500 dark:text-stone-950">
        {step}
      </span>
      {children}
    </p>
  );
}

function ChoiceGrid({
  guides,
  active,
  plans,
  compact = false,
  onChoose,
}: {
  guides: Guide[];
  active: string | null;
  plans: PlanDTO[];
  compact?: boolean;
  onChoose: (id: string) => void;
}) {
  return (
    <div className={`mt-4 grid gap-3 ${compact ? "grid-cols-2 sm:grid-cols-5" : "sm:grid-cols-3"}`}>
      {guides.map((g) => {
        const selected = active === g.id;
        const ready = g.title !== "" && plans.some((p) => p.section === g.section);
        return (
          <button
            key={g.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChoose(g.id)}
            className={`flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 ${
              selected
                ? "border-teal-500 bg-teal-50 ring-1 ring-teal-500 dark:border-teal-400 dark:bg-teal-950/40 dark:ring-teal-400"
                : "border-stone-200 bg-white hover:border-teal-300 hover:bg-teal-50/50 dark:border-stone-700 dark:bg-stone-900 dark:hover:border-teal-700"
            } ${compact ? "p-3" : ""}`}
          >
            <span className="flex w-full items-center justify-between gap-2">
              <span aria-hidden="true" className={compact ? "text-xl" : "text-2xl"}>
                {g.icon}
              </span>
              {ready ? (
                <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">
                  Ready
                </span>
              ) : null}
            </span>
            <span className="font-semibold text-stone-900 dark:text-stone-100">
              {compact ? g.label : `Yes, tell me about ${g.label.toLowerCase()}`}
            </span>
            <span className="text-xs text-stone-600 dark:text-stone-400">{g.blurb}</span>
          </button>
        );
      })}
    </div>
  );
}

function GuideCard({
  guide,
  hidden,
  petId,
  petName,
  history,
  onGenerated,
}: {
  guide: Guide;
  hidden: boolean;
  petId: string;
  petName: string;
  history: PlanDTO[];
  onGenerated: () => Promise<void>;
}) {
  return (
    <div hidden={hidden} className="mt-4 flex flex-col gap-4">
      <Card className="p-5 sm:p-6">
        <PlanPanel
          petId={petId}
          petName={petName}
          section={guide.section}
          title={`${guide.icon} ${guide.title}`}
          description={guide.description}
          goalPlaceholder={guide.goalPlaceholder}
          history={history}
          onGenerated={onGenerated}
          autoStart
        />
      </Card>
      {guide.id === "vaccination" ? (
        <Card className="p-5 sm:p-6">
          <VaccinationPlan petId={petId} petName={petName} />
        </Card>
      ) : guide.reminderKinds ? (
        <Card className="p-5 sm:p-6">
          <h3 className="mb-1 text-lg font-semibold tracking-tight text-stone-900 dark:text-stone-100">
            🔔 {guide.label} reminders
          </h3>
          <p className="mb-4 text-sm text-stone-600 dark:text-stone-400">
            Get notified so {petName} never misses a {guide.id === "nutrition" ? "meal change or weigh-in" : guide.id === "vaccination" ? "vaccine or check-up" : "dose"}.
          </p>
          <RemindersPanel petId={petId} kinds={guide.reminderKinds} />
        </Card>
      ) : null}
    </div>
  );
}

function Chip({ children, muted = false }: { children: ReactNode; muted?: boolean }) {
  return (
    <li
      className={`rounded-full px-3 py-1 ${
        muted
          ? "border border-dashed border-stone-300 text-stone-500 dark:border-stone-700"
          : "bg-stone-100 text-stone-700 dark:bg-stone-800 dark:text-stone-300"
      }`}
    >
      {children}
    </li>
  );
}

export function DashboardSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:py-10"
      aria-busy="true"
      aria-label="Loading pet"
    >
      <Skeleton className="mb-4 h-5 w-20" />
      <Skeleton className="h-36 rounded-3xl" />
      <Skeleton className="mt-6 h-[150px] rounded-2xl" />
      <div className="mt-8">
        <div className="flex flex-col gap-4">
          <div className="flex gap-2 overflow-hidden">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-9 w-24 shrink-0 rounded-full" />
            ))}
          </div>
          <Skeleton className="h-80 rounded-3xl" />
        </div>
      </div>
    </div>
  );
}
