import { prisma } from "@/lib/prisma";
import { getScheduleConfig } from "@/lib/schedule";
import type {
  AnalyticsData,
  SlotEntry,
  UserEntry,
} from "@/components/admin/analytics-dashboard";

export async function getDateAnalytics(): Promise<AnalyticsData> {
  const config = await getScheduleConfig();
  if (!config) {
    return {
      totalUsers: 0,
      totalSlots: 0,
      maxCount: 0,
      slotMatrix: [],
      users: [],
      dates: [],
      timeSlots: [],
    };
  }

  const { dates, timeSlots } = config;

  const rawSlots = await prisma.availability.findMany({
    where: {
      date: {
        gte: new Date(config.startDate + "T00:00:00.000Z"),
        lte: new Date(config.endDate + "T00:00:00.000Z"),
      },
    },
    select: {
      date: true,
      startTime: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          nuId: true,
          image: true,
          committee: true,
        },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // In fixed mode: only count slots that match the configured time slots.
  // In free mode: derive the slot list from actual bookings so the matrix reflects reality.
  const allTimeSlots =
    config.slotMode === "fixed"
      ? timeSlots
      : Array.from(new Set(rawSlots.map((s) => s.startTime))).sort();

  const relevantSlots =
    config.slotMode === "fixed"
      ? rawSlots.filter((s) => timeSlots.includes(s.startTime))
      : rawSlots;

  // Fast O(N) bucketing of slots by `${date}_${startTime}` to eliminate quadratic searching
  const slotBuckets = new Map<string, typeof relevantSlots>();
  const userMap = new Map<string, UserEntry>();

  for (const slot of relevantSlots) {
    const isoDate = (slot.date as Date).toISOString().slice(0, 10);
    const bucketKey = `${isoDate}_${slot.startTime}`;
    const bucket = slotBuckets.get(bucketKey);
    if (bucket) {
      bucket.push(slot);
    } else {
      slotBuckets.set(bucketKey, [slot]);
    }

    const { user, startTime } = slot;
    if (user) {
      const key = user.id;
      if (!userMap.has(key)) {
        userMap.set(key, {
          id: user.id,
          name: user.name,
          email: user.email,
          nuId: user.nuId,
          image: user.image,
          committee: user.committee,
          totalSlots: 0,
          byDate: {},
        });
      }

      const entry = userMap.get(key)!;
      entry.totalSlots++;
      if (!entry.byDate[isoDate]) entry.byDate[isoDate] = [];
      entry.byDate[isoDate].push(startTime);
    }
  }

  const slotMatrix: SlotEntry[] = dates.flatMap((date) =>
    allTimeSlots.map((startTime) => {
      const matching = slotBuckets.get(`${date}_${startTime}`) ?? [];
      return {
        date,
        startTime,
        count: matching.length,
        users: matching
          .filter((s) => Boolean(s.user))
          .map((s) => ({
            name: s.user.name,
            email: s.user.email,
            image: s.user.image,
            committee: s.user.committee,
          })),
      };
    }),
  );

  const maxCount = slotMatrix.reduce((m, s) => Math.max(m, s.count), 0);

  const users = Array.from(userMap.values()).sort(
    (a, b) => b.totalSlots - a.totalSlots,
  );

  return {
    totalUsers: users.length,
    totalSlots: rawSlots.length,
    maxCount,
    slotMatrix,
    users,
    dates,
    timeSlots: allTimeSlots,
  };
}
