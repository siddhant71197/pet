import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { PetInputSchema } from "@/lib/validation";

const BrowserIdSchema = z.uuid();
const NO_STORE = { "Cache-Control": "no-store" };

function invalidJson() {
  return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
}

// POST /api/pets  body: PetInput -> 201 Pet JSON
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return invalidJson();
  }

  const parsed = PetInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Invalid input",
        fieldErrors: z.flattenError(parsed.error).fieldErrors,
      },
      { status: 400 },
    );
  }

  const data = parsed.data;
  const pet = await prisma.pet.create({
    data: {
      browserId: data.browserId,
      type: data.type,
      name: data.name,
      ageMonths: data.ageMonths,
      sizeClass: data.sizeClass,
      weightKg: data.weightKg ?? null,
      breed: data.breed || null,
      notes: data.notes || null,
      gender: data.gender,
      neutered: data.neutered ?? null,
    },
  });

  return NextResponse.json(pet, { status: 201 });
}

// GET /api/pets?browserId=...           -> Pet[] (newest first, no plans)
// GET /api/pets?id=...&browserId=...    -> Pet with plans (newest first);
//                                          404 if missing or not owned
// browserId is required in both forms.
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const browserId = searchParams.get("browserId");

  if (!browserId || !BrowserIdSchema.safeParse(browserId).success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: { browserId: ["Must be a UUID"] } },
      { status: 400, headers: NO_STORE },
    );
  }

  if (id) {
    const pet = await prisma.pet.findUnique({
      where: { id },
      include: { plans: { orderBy: { createdAt: "desc" } } },
    });
    if (!pet || pet.browserId !== browserId) {
      return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE });
    }
    return NextResponse.json(pet, { headers: NO_STORE });
  }

  const pets = await prisma.pet.findMany({
    where: { browserId },
    orderBy: { createdAt: "desc" },
  });
  return NextResponse.json(pets, { headers: NO_STORE });
}
