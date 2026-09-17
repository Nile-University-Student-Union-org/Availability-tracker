import { PrismaClient } from "@prisma/client"

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma =
  globalForPrisma.prisma ?? new PrismaClient({ log: ["error"] })

// Always persist on globalThis so serverless containers reuse connection pool
globalForPrisma.prisma = prisma

