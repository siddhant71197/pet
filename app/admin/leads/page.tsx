import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";

export default function AdminLeadsPage() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Insurance leads</h1>
        <div className="flex items-center gap-2">
          <a
            href="/admin/ads"
            className="rounded border px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Ad performance
          </a>
          <a
            href="/admin/leads/csv"
            className="rounded border px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
          >
            Download CSV
          </a>
        </div>
      </div>
      <Suspense fallback={<p className="text-black/50 dark:text-white/50">Loading leads...</p>}>
        <LeadsTable />
      </Suspense>
    </main>
  );
}

async function LeadsTable() {
  await connection();
  const leads = await prisma.insuranceLead.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <>
      <p className="mb-3 text-sm text-black/60 dark:text-white/60">Total: {leads.length}</p>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-left text-sm">
          <thead>
            <tr className="border-b dark:border-white/15">
              <th className="py-2 pr-4">Created</th>
              <th className="py-2 pr-4">Name</th>
              <th className="py-2 pr-4">Age</th>
              <th className="py-2 pr-4">Email</th>
              <th className="py-2 pr-4">Zipcode</th>
              <th className="py-2 pr-4">Pet ID</th>
              <th className="py-2 pr-4">Source ad</th>
              <th className="py-2 pr-4">Ad provider</th>
            </tr>
          </thead>
          <tbody>
            {leads.map((lead) => (
              <tr key={lead.id} className="border-b align-top dark:border-white/10">
                <td className="py-2 pr-4 whitespace-nowrap">
                  {lead.createdAt.toISOString()}
                </td>
                <td className="py-2 pr-4">{lead.name}</td>
                <td className="py-2 pr-4">{lead.age}</td>
                <td className="py-2 pr-4">{lead.email}</td>
                <td className="py-2 pr-4">{lead.zipcode}</td>
                <td className="py-2 pr-4">{lead.petId ?? ""}</td>
                <td className="py-2 pr-4">{lead.sourceAd ?? ""}</td>
                <td className="py-2 pr-4">{lead.adProvider ?? ""}</td>
              </tr>
            ))}
            {leads.length === 0 && (
              <tr>
                <td colSpan={8} className="py-6 text-center text-black/50 dark:text-white/50">
                  No leads yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
