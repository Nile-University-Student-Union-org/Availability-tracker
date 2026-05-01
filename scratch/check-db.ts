import { PrismaClient } from '@prisma/client';

// Use the DIRECT_URL explicitly to bypass the pooler for this check
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
});

async function main() {
  const tables = await prisma.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';`;
  console.log('Tables:', tables);
}

main()
  .catch(e => console.error(e))
  .finally(async () => await prisma.$disconnect());
