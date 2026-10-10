import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Vercel's database integrations use different variable names; accept any.
function databaseUrl(): string | undefined {
  const isPg = (v: string | undefined) => !!v && /^postgres(ql)?:\/\//.test(v);
  for (const k of ["DATABASE_URL", "POSTGRES_PRISMA_URL", "POSTGRES_URL"]) {
    if (isPg(process.env[k])) return process.env[k];
  }
  const k = Object.keys(process.env).find(
    (key) => /_(DATABASE_)?URL$/.test(key) && isPg(process.env[key]),
  );
  return k ? process.env[k] : undefined;
}

export const prisma: PrismaClient =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasourceUrl: databaseUrl(),
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;
