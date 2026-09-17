import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

function getDatabaseUrl(): string | undefined {
  const url = process.env.DATABASE_URL
  if (!url) return undefined

  // Ensure connection pool size does not exhaust cloud PostgreSQL limits (e.g. Aiven 20-conn ceiling)
  if (!url.includes("connection_limit")) {
    const separator = url.includes("?") ? "&" : "?"
    // In production serverless lambdas, limit to 2 connections per container.
    // In local development, limit to 3 connections to leave headroom for cloud/remote clients.
    const limit = process.env.NODE_ENV === "production" ? 2 : 3
    return `${url}${separator}connection_limit=${limit}&pool_timeout=20`
  }

  return url
}

const dbUrl = getDatabaseUrl()

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: ["error"],
    datasources: dbUrl ? { db: { url: dbUrl } } : undefined,
  })

// Always persist on globalThis so serverless containers reuse connection pool
globalForPrisma.prisma = prisma

