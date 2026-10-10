import { Suspense } from "react";
import { connection } from "next/server";
import { prisma } from "@/lib/db";

// /admin/ads (protected by proxy.ts): impressions, clicks and leads per ad.
export default function AdminAdsPage() {
  return (
    <main className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Ad performance</h1>
        <a
          href="/admin/leads"
          className="rounded border px-3 py-1.5 text-sm hover:bg-black/5 dark:border-white/20 dark:hover:bg-white/10"
        >
          Leads
        </a>
      </div>
      <Suspense fallback={<p className="text-black/50 dark:text-white/50">Loading stats...</p>}>
        <AdStatsTable />
      </Suspense>
    </main>
  );
}

type Row = { adId: string; provider: string; impression: number; click: number; lead: number };

function pct(n: number, d: number): string {
  return d > 0 ? `${((n / d) * 100).toFixed(1)}%` : "–";
}

async function AdStatsTable() {
  await connection();
  const groups = await prisma.adEvent.groupBy({
    by: ["adId", "provider", "type"],
    _count: { _all: true },
  });

  const rows = new Map<string, Row>();
  for (const g of groups) {
    const k = `${g.provider}\u0000${g.adId}`;
    const row = rows.get(k) ?? { adId: g.adId, provider: g.provider, impression: 0, click: 0, lead: 0 };
    if (g.type === "impression" || g.type === "click" || g.type === "lead") row[g.type] += g._count._all;
    rows.set(k, row);
  }
  const list = [...rows.values()].sort((a, b) => b.impression - a.impression || b.click - a.click);
  const total = list.reduce(
    (t, r) => ({ impression: t.impression + r.impression, click: t.click + r.click, lead: t.lead + r.lead }),
    { impression: 0, click: 0, lead: 0 },
  );

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="border-b dark:border-white/15">
            <th className="py-2 pr-4">Ad</th>
            <th className="py-2 pr-4">Provider</th>
            <th className="py-2 pr-4 text-right">Impressions</th>
            <th className="py-2 pr-4 text-right">Clicks</th>
            <th className="py-2 pr-4 text-right">CTR</th>
            <th className="py-2 pr-4 text-right">Leads</th>
            <th className="py-2 pr-4 text-right">Lead / click</th>
          </tr>
        </thead>
        <tbody className="tabular-nums">
          {list.map((r) => (
            <tr key={`${r.provider}:${r.adId}`} className="border-b dark:border-white/10">
              <td className="py-2 pr-4 font-mono text-xs">{r.adId}</td>
              <td className="py-2 pr-4">{r.provider}</td>
              <td className="py-2 pr-4 text-right">{r.impression}</td>
              <td className="py-2 pr-4 text-right">{r.click}</td>
              <td className="py-2 pr-4 text-right">{pct(r.click, r.impression)}</td>
              <td className="py-2 pr-4 text-right">{r.lead}</td>
              <td className="py-2 pr-4 text-right">{pct(r.lead, r.click)}</td>
            </tr>
          ))}
          {list.length === 0 ? (
            <tr>
              <td colSpan={7} className="py-6 text-center text-black/50 dark:text-white/50">
                No ad events yet.
              </td>
            </tr>
          ) : (
            <tr className="font-semibold">
              <td className="py-2 pr-4">Total</td>
              <td className="py-2 pr-4" />
              <td className="py-2 pr-4 text-right">{total.impression}</td>
              <td className="py-2 pr-4 text-right">{total.click}</td>
              <td className="py-2 pr-4 text-right">{pct(total.click, total.impression)}</td>
              <td className="py-2 pr-4 text-right">{total.lead}</td>
              <td className="py-2 pr-4 text-right">{pct(total.lead, total.click)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
