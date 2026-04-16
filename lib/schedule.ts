import { prisma } from "@/lib/prisma";

export type ScheduleConfig = {
  startDate: string;
  endDate: string;
  slotMode: "fixed" | "free";
  timeSlots: string[];
  dates: string[];
};

/**
 * Loads the active schedule config from the DB.
 * Returns null if no config exists yet (admin hasn't set one up).
 */
export async function getScheduleConfig(): Promise<ScheduleConfig | null> {
  const config = await prisma.scheduleConfig.findUnique({
    where: { id: "default" },
    include: { timeSlots: { orderBy: { startTime: "asc" } } },
  });

  if (!config) return null;

  const start = config.startDate.toISOString().slice(0, 10);
  const end = config.endDate.toISOString().slice(0, 10);

  // Build array of all dates between start and end (inclusive)
  const dates: string[] = [];
  const current = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");
  while (current <= endDate) {
    dates.push(current.toISOString().slice(0, 10));
    current.setDate(current.getDate() + 1);
  }

  return {
    startDate: start,
    endDate: end,
    slotMode: config.slotMode as "fixed" | "free",
    timeSlots: config.timeSlots.map((s) => s.startTime),
    dates,
  };
}

/**
 * Formats "HH:mm" to a human-readable label like "8:30 AM".
 */
export function formatTimeSlot(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}
