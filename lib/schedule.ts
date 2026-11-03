import { cache } from "react";
import { prisma } from "@/lib/prisma";
import { fromMinutes, toMinutes, type WeeklySlot } from "@/lib/weekly-slots";
export { DAY_OF_WEEK_MAP, formatTimeSlot } from "@/lib/weekly-slots";

export type PollConfig = {
  id: string;
  name: string;
  type: string;
  active: boolean;
  allCommittees: boolean;
  committees: string[];
  requestedCommittees: string[];
  startDate: string | null;
  endDate: string | null;
  slotMode: "fixed" | "free";
  timeSlots: string[];
  /** start → end for each fixed slot */ slotEnds: Record<string, string>;
  dates: string[];
  weeklyDays: number[];
  weeklySlots: WeeklySlot[];
};
export type ScheduleConfig = Omit<PollConfig, "startDate" | "endDate"> & {
  startDate: string;
  endDate: string;
  dateScheduleActive: boolean;
  weeklyScheduleActive: boolean;
  dateScheduleTitle: string;
  weeklyScheduleTitle: string;
};

export const getPollConfig = cache(
  async (id: string): Promise<PollConfig | null> => {
    const p = await prisma.poll.findUnique({
      where: { id },
      include: {
        timeSlots: { orderBy: { startTime: "asc" } },
        weeklySlots: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
      },
    });
    if (!p) return null;
    const start = p.startDate?.toISOString().slice(0, 10) ?? null;
    const end = p.endDate?.toISOString().slice(0, 10) ?? null;
    const dates: string[] = [];
    if (start && end)
      for (
        let d = new Date(`${start}T00:00:00.000Z`),
          last = new Date(`${end}T00:00:00.000Z`);
        d <= last;
        d.setUTCDate(d.getUTCDate() + 1)
      )
        dates.push(d.toISOString().slice(0, 10));
    return {
      id: p.id,
      name: p.name,
      type: p.type,
      active: p.active,
      allCommittees: p.allCommittees,
      committees: p.committees,
      requestedCommittees: p.requestedCommittees,
      startDate: start,
      endDate: end,
      slotMode: p.slotMode as "fixed" | "free",
      timeSlots: p.timeSlots.map((s) => s.startTime),
      slotEnds: Object.fromEntries(
        p.timeSlots.map((s) => [
          s.startTime,
          s.endTime ?? fromMinutes(toMinutes(s.startTime) + 60),
        ]),
      ),
      dates,
      weeklyDays: p.weeklyDays,
      weeklySlots: p.weeklySlots.map(({ dayOfWeek, startTime, endTime }) => ({
        dayOfWeek,
        startTime,
        endTime,
      })),
    };
  },
);

export const getScheduleConfig = cache(
  async (): Promise<ScheduleConfig | null> => {
    const [date, weekly] = await Promise.all([
      getPollConfig("legacy-date"),
      getPollConfig("legacy-weekly"),
    ]);
    if (!date && !weekly) return null;
    return {
      ...(date ?? weekly!),
      startDate: date?.startDate ?? "",
      endDate: date?.endDate ?? "",
      weeklyDays: weekly?.weeklyDays ?? [],
      weeklySlots: weekly?.weeklySlots ?? [],
      dateScheduleActive: date?.active ?? false,
      weeklyScheduleActive: weekly?.active ?? false,
      dateScheduleTitle: date?.name ?? "Specific Date Availability",
      weeklyScheduleTitle: weekly?.name ?? "Semester Availability",
    };
  },
);
