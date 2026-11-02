import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient({ datasources: { db: { url: process.env.DIRECT_URL } } });

async function main() {
  const exists = await prisma.poll.findUnique({ where: { id: "legacy-date" } });
  if (exists) return console.log("Legacy polls already exist, skipping seed.");
  await prisma.poll.create({ data: { id: "legacy-date", name: "Specific Date Availability", type: "date", active: true, allCommittees: true, startDate: new Date("2026-04-19"), endDate: new Date("2026-04-23"), timeSlots: { create: ["08:30","09:30","10:30","11:30","12:30","13:30","14:30","15:30","16:30","17:30"].map(startTime => ({ startTime })) } } });
  await prisma.poll.create({ data: { id: "legacy-weekly", name: "Semester Availability", type: "weekly", active: true, allCommittees: true, weeklyDays: [0,1,2,3,4], weeklySlots: { create: [0,1,2,3,4].flatMap(dayOfWeek => ["08:30","09:30","10:30","11:30","12:30","13:30","14:30","15:30","16:30","17:30"].map(startTime => ({ dayOfWeek, startTime, endTime: `${String((Number(startTime.slice(0,2))+1)%24).padStart(2,"0")}:${startTime.slice(3)}` }))) } } });
  console.log("Seeded legacy date and weekly polls.");
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
