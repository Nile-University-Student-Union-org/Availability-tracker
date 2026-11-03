import { prisma } from "@/lib/prisma";
import { getPollConfig } from "@/lib/schedule";
import type {
  AnalyticsData,
  SlotEntry,
  UserEntry,
} from "@/components/admin/analytics-dashboard";

export async function getDateAnalytics(
  pollId = "legacy-date",
): Promise<AnalyticsData> {
  const config = await getPollConfig(pollId);
  if (!config || !config.startDate || !config.endDate) {
    return {
      totalUsers: 0,
      totalSlots: 0,
      maxCount: 0,
      slotMatrix: [],
      users: [],
      dates: [],
      timeSlots: [],
      slotEnds: {},
    };
  }

  const { dates, timeSlots } = config;
  const poll = await prisma.poll.findUnique({
    where: { id: pollId },
    select: { committees: true, allCommittees: true },
  });

  const rawSlots = await prisma.availability.findMany({
    where: {
      pollId,
      ...(poll && !poll.allCommittees
        ? { user: { committee: { in: poll.committees } } }
        : {}),
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

  const slotMatrix: SlotEntry[] = [];
  let maxCount = 0;

  for (const date of dates) {
    for (const timeSlot of allTimeSlots) {
      const bucketKey = `${date}_${timeSlot}`;
      const bucket = slotBuckets.get(bucketKey) ?? [];
      const count = bucket.length;
      if (count > maxCount) maxCount = count;

      slotMatrix.push({
        date,
        startTime: timeSlot,
        count,
        users: bucket
          .filter((s) => s.user !== null)
          .map((s) => ({
            id: s.user!.id,
            name: s.user!.name,
            email: s.user!.email,
            nuId: s.user!.nuId,
            image: s.user!.image,
            committee: s.user!.committee,
          })),
      });
    }
  }

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
    slotEnds: config.slotEnds,
  };
}
