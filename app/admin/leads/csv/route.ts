import { connection } from "next/server";
import { prisma } from "@/lib/db";


// Prevent spreadsheet formula injection and quote special characters.
function csvCell(value: string | number | null | undefined): string {
  let s = value === null || value === undefined ? "" : String(value);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

// GET /admin/leads/csv (protected by proxy.ts)
export async function GET() {
  await connection();
  const leads = await prisma.insuranceLead.findMany({
    orderBy: { createdAt: "desc" },
  });

  const header = ["id", "createdAt", "name", "age", "email", "zipcode", "petId", "sourceAd", "adProvider", "browserId"];
  const rows = leads.map((l) =>
    [
      l.id,
      l.createdAt.toISOString(),
      l.name,
      l.age,
      l.email,
      l.zipcode,
      l.petId,
      l.sourceAd,
      l.adProvider,
      l.browserId,
    ]
      .map(csvCell)
      .join(","),
  );
  const csv = [header.join(","), ...rows].join("\r\n") + "\r\n";

  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="insurance-leads.csv"',
      "Cache-Control": "no-store",
    },
  });
}
