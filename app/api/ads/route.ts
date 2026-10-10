import { NextResponse, type NextRequest } from "next/server";
import { getAds, AD_SLOTS, type AdContext, type AdSlotId } from "@/lib/ads";

const NO_STORE = { "Cache-Control": "no-store" };

// GET /api/ads?slot=home|sidebar|inline&petType=dog|cat&ageMonths=&zip=&petId=&limit=
// -> 200 { ads: Ad[] }
export async function GET(request: NextRequest) {
  const sp = request.nextUrl.searchParams;
  const slotParam = sp.get("slot") ?? "home";
  if (!(AD_SLOTS as readonly string[]).includes(slotParam)) {
    return NextResponse.json({ error: "Invalid slot" }, { status: 400, headers: NO_STORE });
  }

  const ctx: AdContext = { slot: slotParam as AdSlotId };
  const petType = sp.get("petType");
  if (petType === "dog" || petType === "cat") ctx.petType = petType;
  const age = Number(sp.get("ageMonths"));
  if (sp.has("ageMonths") && Number.isInteger(age) && age >= 0 && age <= 300) ctx.ageMonths = age;
  const zip = sp.get("zip");
  if (zip && /^\d{5,6}$/.test(zip)) ctx.zip = zip;
  const petId = sp.get("petId");
  if (petId && petId.length <= 100) ctx.petId = petId;
  const limit = Number(sp.get("limit") ?? "1");

  const ads = await getAds(ctx, limit);
  return NextResponse.json({ ads }, { headers: NO_STORE });
}
