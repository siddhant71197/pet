// Runs `prisma migrate deploy` during the Vercel build.
//
// Vercel's database integrations name their variables differently
// (DATABASE_URL, POSTGRES_URL, STORAGE_URL, custom prefixes...), so this finds
// a Postgres URL under any of them. Migrations prefer the direct (unpooled)
// connection. If no database is connected, it prints what to do and lets the
// build continue instead of failing.
import { execSync } from "node:child_process";

const isPg = (v) => typeof v === "string" && /^postgres(ql)?:\/\//.test(v);
const env = process.env;
const keys = Object.keys(env);

const DIRECT = ["DATABASE_URL_UNPOOLED", "POSTGRES_URL_NON_POOLING", "DIRECT_URL"];
const POOLED = ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"];

const direct =
  DIRECT.find((k) => isPg(env[k])) ??
  keys.find((k) => /_URL_(UNPOOLED|NON_POOLING)$/.test(k) && isPg(env[k]));
const pooled =
  POOLED.find((k) => isPg(env[k])) ?? keys.find((k) => /_(DATABASE_)?URL$/.test(k) && isPg(env[k]));
const chosen = direct ?? pooled;

if (!chosen) {
  console.warn(
    "\n[db] No Postgres database found, so migrations were skipped.\n" +
      "[db] In Vercel: Storage -> Create Database -> Neon -> connect it to this project,\n" +
      "[db] then Deployments -> Redeploy. The app needs a database to save pets.\n",
  );
  process.exit(0);
}

console.log(`[db] Running migrations using ${chosen}`);
execSync("prisma migrate deploy", {
  stdio: "inherit",
  env: { ...env, DATABASE_URL: env[chosen] },
});
