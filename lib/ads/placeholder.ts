import type { Ad, AdContext, AdProvider } from "./types";

const PARTNER = "Example Pet Insurance (placeholder)";
const DISCLOSURE =
  "Sponsored placeholder. PawPlan may be compensated for referrals. Coverage terms vary.";

type Creative = Pick<Ad, "id" | "headline" | "body" | "ctaLabel">;

const PUPPY: Creative[] = [
  {
    id: "placeholder-puppy-starter",
    headline: "Puppy proof your budget",
    body: "Chewed socks and swallowed toys happen. Accident and illness cover for growing pups.",
    ctaLabel: "Get a puppy quote",
  },
  {
    id: "placeholder-puppy-wellness",
    headline: "Vaccines and checkups, covered",
    body: "Add wellness care for your puppy's first-year vaccines, deworming and vet visits.",
    ctaLabel: "See wellness plans",
  },
];

const KITTEN: Creative[] = [
  {
    id: "placeholder-kitten-starter",
    headline: "Nine lives, one simple plan",
    body: "Accident and illness coverage for curious kittens. Enroll early, before conditions are pre-existing.",
    ctaLabel: "Get a kitten quote",
  },
  {
    id: "placeholder-kitten-wellness",
    headline: "Kitten vaccines, made affordable",
    body: "Wellness add-ons for core vaccines, spay/neuter and routine checkups.",
    ctaLabel: "See wellness plans",
  },
];

const SENIOR: Creative[] = [
  {
    id: "placeholder-senior-care",
    headline: "Care for every gray whisker",
    body: "Plans that help with diagnostics, chronic conditions and senior checkups.",
    ctaLabel: "Compare senior plans",
  },
];

const GENERAL: Creative[] = [
  {
    id: "placeholder-accident-illness",
    headline: "Protect your pet from unexpected vet bills",
    body: "Accident and illness coverage for dogs and cats. Compare plans in minutes.",
    ctaLabel: "Get a quote",
  },
  {
    id: "placeholder-wellness",
    headline: "Add wellness care to your pet's plan",
    body: "Routine checkups, vaccines and dental cleanings, covered month to month.",
    ctaLabel: "Get a quote",
  },
];

function creativesFor(ctx: AdContext): Creative[] {
  const age = ctx.ageMonths;
  if (age !== undefined && age < 12) {
    if (ctx.petType === "dog") return [...PUPPY, ...GENERAL];
    if (ctx.petType === "cat") return [...KITTEN, ...GENERAL];
  }
  if (age !== undefined && age >= 96) return [...SENIOR, ...GENERAL];
  return GENERAL;
}

function toAd(c: Creative, provider: string): Ad {
  return {
    ...c,
    provider,
    partnerName: PARTNER,
    imageUrl: null,
    logoUrl: null,
    disclosure: DISCLOSURE,
    action: { type: "lead_form" },
  };
}

// Fictional sample insurers for the multi-insurer tray. Replace via the CLP
// provider; these names are placeholders, not real companies.
type Insurer = {
  key: string;
  name: string;
  brandColor: string;
  highlight: string;
  headline: string;
  benefits: string[];
};

function insurersFor(ctx: AdContext): Insurer[] {
  const age = ctx.ageMonths;
  const young = age !== undefined && age < 12;
  const senior = age !== undefined && age >= 96;
  const baby = ctx.petType === "cat" ? "kitten" : ctx.petType === "dog" ? "puppy" : "pet";
  return [
    {
      key: "tailguard",
      name: "TailGuard (sample)",
      brandColor: "#0d9488",
      highlight: "Up to 90% back on vet bills",
      headline: young ? `Accident & illness cover for your ${baby}` : "Accident & illness cover",
      benefits: [
        "Emergency visits, surgery and hospital stays",
        young ? "Covers swallowed objects and parvo scares" : "Diagnostics, X-rays and lab tests",
        "Use any licensed vet",
      ],
    },
    {
      key: "whiskerwise",
      name: "Whiskerwise (sample)",
      brandColor: "#7c3aed",
      highlight: "Wellness add-on available",
      headline: young ? `First-year vaccines & checkups` : "Routine care, budgeted monthly",
      benefits: [
        young ? "Vaccine series, deworming and microchip" : "Annual vaccines and wellness exams",
        "Dental cleanings and flea/tick prevention",
        "Predictable monthly cost",
      ],
    },
    {
      key: "furshield",
      name: "FurShield (sample)",
      brandColor: "#ea580c",
      highlight: senior ? "Senior-friendly plans" : "Enroll early, pay less",
      headline: senior ? "Cover for chronic & senior conditions" : "Lock in cover before issues appear",
      benefits: [
        senior ? "Ongoing care for arthritis, kidney and thyroid issues" : "Conditions found later stay covered",
        "Cancer treatment and specialist referrals",
        "No upper age limit at renewal",
      ],
    },
    {
      key: "snoutsure",
      name: "SnoutSure (sample)",
      brandColor: "#2563eb",
      highlight: "Claims paid in days",
      headline: "Snap a photo, get reimbursed",
      benefits: [
        "Submit claims from your phone",
        "Direct pay to vet at partner clinics",
        "24/7 vet chat included",
      ],
    },
    {
      key: "barkley",
      name: "Barkley Mutual (sample)",
      brandColor: "#be123c",
      highlight: "Multi-pet discount",
      headline: "One policy for every pet at home",
      benefits: [
        "Save when you insure 2+ pets",
        "Choose your deductible and limit",
        "Cancel anytime",
      ],
    },
  ];
}

function insurerAds(ctx: AdContext, limit: number, provider: string): Ad[] {
  return insurersFor(ctx)
    .slice(0, limit)
    .map((i) => ({
      id: `placeholder-${ctx.slot}-${i.key}`,
      provider,
      partnerName: i.name,
      headline: i.headline,
      body: i.benefits.join(". ") + ".",
      ctaLabel: "Get a quote",
      imageUrl: null,
      logoUrl: null,
      disclosure: DISCLOSURE,
      action: { type: "lead_form" },
      benefits: i.benefits,
      highlight: i.highlight,
      brandColor: i.brandColor,
    }));
}

/** Builds placeholder ads for a context. Also used as the CLP fallback. */
export function placeholderAds(ctx: AdContext, limit: number, provider = "placeholder"): Ad[] {
  if (ctx.slot === "tray") return insurerAds(ctx, limit, provider);
  if (ctx.slot === "sticky") {
    return [
      {
        id: "placeholder-sticky-compare",
        provider,
        partnerName: "PawPlan insurance partners (sample)",
        headline: "Unexpected vet bills? Get covered.",
        body: "Compare quotes from multiple pet insurers in about 2 minutes.",
        ctaLabel: "Compare quotes",
        imageUrl: null,
        logoUrl: null,
        disclosure: DISCLOSURE,
        action: { type: "lead_form" },
      },
    ];
  }
  const list = creativesFor(ctx);
  // Rotate deterministically by slot so different slots on one page differ.
  const offset = ctx.slot === "sidebar" ? 1 : ctx.slot === "inline" ? 2 : 0;
  const out: Ad[] = [];
  for (let i = 0; i < Math.min(limit, list.length); i++) {
    out.push(toAd(list[(i + offset) % list.length], provider));
  }
  return out;
}

export const placeholderProvider: AdProvider = {
  name: "placeholder",
  async getAds(ctx, limit) {
    return placeholderAds(ctx, limit);
  },
};
