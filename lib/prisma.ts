import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;

  // Ensure connection pool size does not exhaust cloud PostgreSQL limits (e.g. Aiven 20-conn ceiling)
  if (!url.includes("connection_limit")) {
    const separator = url.includes("?") ? "&" : "?";
    // Allow up to 5 concurrent connections per container so Promise.all queries execute
    // in parallel over the connection pooler rather than queueing sequentially.
    const limit = 5;
    return `${url}${separator}connection_limit=${limit}&pool_timeout=15`;
  }

  return url;
}

const dbUrl = getDatabaseUrl();

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
  });

// Always persist on globalThis so serverless containers reuse connection pool
globalForPrisma.prisma = prisma;
