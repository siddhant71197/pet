import { NextResponse } from "next/server";
import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { PetUpdateSchema } from "@/lib/validation";

const BrowserIdSchema = z.uuid();

function notFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

// PATCH /api/pets/[id]  body: {browserId, data: Partial<PetFields>} -> 200 Pet
//   null clears weightKg / breed / notes / neutered.
//   400 invalid body, 404 missing or not owned
export async function PATCH(request: Request, ctx: RouteContext<"/api/pets/[id]">) {
  const { id } = await ctx.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body must be valid JSON" }, { status: 400 });
  }

  const parsed = PetUpdateSchema.safeParse(body);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    // Surface nested data.* errors as top-level field names for forms.
    const fieldErrors: Record<string, string[]> = { ...flat.fieldErrors };
    for (const issue of parsed.error.issues) {
      if (issue.path[0] === "data" && typeof issue.path[1] === "string") {
        (fieldErrors[issue.path[1]] ??= []).push(issue.message);
      }
    }
    delete fieldErrors.data;
    return NextResponse.json({ error: "Invalid input", fieldErrors }, { status: 400 });
  }
  const { browserId, data } = parsed.data;

  const pet = await prisma.pet.findUnique({ where: { id }, select: { browserId: true } });
  if (!pet || pet.browserId !== browserId) return notFound();

  const update: Prisma.PetUpdateInput = {
    ...(data.type !== undefined && { type: data.type }),
    ...(data.name !== undefined && { name: data.name }),
    ...(data.ageMonths !== undefined && { ageMonths: data.ageMonths }),
    ...(data.sizeClass !== undefined && { sizeClass: data.sizeClass }),
    ...(data.weightKg !== undefined && { weightKg: data.weightKg }),
    ...(data.breed !== undefined && { breed: data.breed || null }),
    ...(data.notes !== undefined && { notes: data.notes || null }),
    ...(data.gender !== undefined && { gender: data.gender }),
    ...(data.neutered !== undefined && { neutered: data.neutered }),
  };

  const updated = await prisma.pet.update({ where: { id }, data: update });
  return NextResponse.json(updated, { headers: { "Cache-Control": "no-store" } });
}

// DELETE /api/pets/[id]?browserId=<uuid> -> 204 (plans and reminders cascade)
//   400 invalid browserId, 404 missing or not owned
export async function DELETE(request: Request, ctx: RouteContext<"/api/pets/[id]">) {
  const { id } = await ctx.params;
  const browserId = new URL(request.url).searchParams.get("browserId");
  if (!browserId || !BrowserIdSchema.safeParse(browserId).success) {
    return NextResponse.json(
      { error: "Invalid input", fieldErrors: { browserId: ["Must be a UUID"] } },
      { status: 400 },
    );
  }

  const pet = await prisma.pet.findUnique({ where: { id }, select: { browserId: true } });
  if (!pet || pet.browserId !== browserId) return notFound();

  await prisma.pet.delete({ where: { id } });
  return new Response(null, { status: 204 });
}
