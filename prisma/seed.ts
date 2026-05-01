import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DIRECT_URL,
    },
  },
});

async function main() {
  // Seed the default schedule config with the original hardcoded values
  const existing = await prisma.scheduleConfig.findUnique({
    where: { id: "default" },
  });

  if (existing) {
    console.log("Schedule config already exists, skipping seed.");
    return;
  }

  await prisma.scheduleConfig.create({
    data: {
      id: "default",
      startDate: new Date("2026-04-19"),
      endDate: new Date("2026-04-23"),
      slotMode: "fixed",
      timeSlots: {
        createMany: {
          data: [
            { startTime: "08:30" },
            { startTime: "09:30" },
            { startTime: "10:30" },
            { startTime: "11:30" },
            { startTime: "12:30" },
            { startTime: "13:30" },
            { startTime: "14:30" },
            { startTime: "15:30" },
            { startTime: "16:30" },
            { startTime: "17:30" },
          ],
        },
      },
    },
  });

  console.log("Seeded default schedule config (Apr 19–23, 10 fixed slots).");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
