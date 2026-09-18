import { prisma } from "@/lib/prisma";
import { getScheduleConfig, DAY_OF_WEEK_MAP } from "@/lib/schedule";

export type RecurringSlotUser = {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
  committee: string | null;
};

export type RecurringSlotEntry = {
  dayOfWeek: number;
  startTime: string;
  count: number;
  users: RecurringSlotUser[];
};

export type RecurringUserEntry = {
  id: string;
  name: string | null;
  email: string;
  nuId: string | null;
  image: string | null;
  committee: string | null;
  totalSlots: number;
  byDay: Record<number, string[]>;
};

export type GoldenSlotRecommendation = {
  dayOfWeek: number;
  dayLabel: string;
  dayShort: string;
  startTime: string;
  endTime: string;
  count: number;
  totalEligible: number;
  percentage: number;
  availableUsers: RecurringSlotUser[];
  missingUsers: RecurringSlotUser[];
};

export type SemesterAnalyticsData = {
  totalUsers: number;
  totalSlots: number;
  maxCount: number;
  slotMatrix: RecurringSlotEntry[];
  users: RecurringUserEntry[];
  days: number[];
  timeSlots: string[];
  recommendations: GoldenSlotRecommendation[];
};

function getEndTime(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number);
  const endH = (h + 1) % 24;
  return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

export async function getSemesterAnalytics(
  committeeFilter?: string | null,
): Promise<SemesterAnalyticsData> {
  const config = await getScheduleConfig();

  // Nile University academic week: Sunday (0) to Thursday (4)
  // Include Saturday (6) if enabled
  const includeSaturday = config?.weeklyIncludeSaturday ?? false;
  const days = includeSaturday ? [0, 1, 2, 3, 4, 6] : [0, 1, 2, 3, 4];

  const rawSlots = await prisma.recurringAvailability.findMany({
    where: {
      dayOfWeek: { in: days },
      user: {
        email: { not: "admin@nu.edu.eg" },
        ...(committeeFilter && committeeFilter !== "all"
          ? { committee: committeeFilter }
          : {}),
      },
    },
    select: {
      dayOfWeek: true,
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
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  // All eligible users for participation percentage calculation
  const allEligibleUsers = await prisma.user.findMany({
    where: {
      email: { not: "admin@nu.edu.eg" },
      ...(committeeFilter && committeeFilter !== "all"
        ? { committee: committeeFilter }
        : {}),
    },
    select: {
      id: true,
      name: true,
      email: true,
      image: true,
      committee: true,
    },
  });

  // Determine time slots
  let timeSlots: string[] = [];
  if (config?.slotMode === "fixed" && config.timeSlots.length > 0) {
    timeSlots = config.timeSlots;
  } else {
    const fromBookings = Array.from(
      new Set(rawSlots.map((s) => s.startTime)),
    ).sort();
    timeSlots =
      fromBookings.length > 0
        ? fromBookings
        : [
            "08:30",
            "09:30",
            "10:30",
            "11:30",
            "12:30",
            "13:30",
            "14:30",
            "15:30",
            "16:30",
          ];
  }

  const relevantSlots =
    config?.slotMode === "fixed" && config.timeSlots.length > 0
      ? rawSlots.filter((s) => timeSlots.includes(s.startTime))
      : rawSlots;

  // Fast O(N) bucketing of slots by `${dayOfWeek}_${startTime}`
  const slotBuckets = new Map<string, typeof relevantSlots>();
  const userMap = new Map<string, RecurringUserEntry>();

  for (const slot of relevantSlots) {
    const key = `${slot.dayOfWeek}_${slot.startTime}`;
    const bucket = slotBuckets.get(key);
    if (bucket) {
      bucket.push(slot);
    } else {
      slotBuckets.set(key, [slot]);
    }

    const u = slot.user;
    if (!userMap.has(u.id)) {
      userMap.set(u.id, {
        id: u.id,
        name: u.name,
        email: u.email,
        nuId: u.nuId,
        image: u.image,
        committee: u.committee,
        totalSlots: 0,
        byDay: {},
      });
    }
    const entry = userMap.get(u.id)!;
    entry.totalSlots += 1;
    if (!entry.byDay[slot.dayOfWeek]) {
      entry.byDay[slot.dayOfWeek] = [];
    }
    entry.byDay[slot.dayOfWeek].push(slot.startTime);
  }

  // Construct Slot Matrix
  const slotMatrix: RecurringSlotEntry[] = [];
  let maxCount = 0;

  for (const day of days) {
    for (const time of timeSlots) {
      const key = `${day}_${time}`;
      const matching = slotBuckets.get(key) ?? [];
      const count = matching.length;
      if (count > maxCount) maxCount = count;

      slotMatrix.push({
        dayOfWeek: day,
        startTime: time,
        count,
        users: matching.map((m) => ({
          id: m.user.id,
          name: m.user.name,
          email: m.user.email,
          image: m.user.image,
          committee: m.user.committee,
        })),
      });
    }
  }

  const users = Array.from(userMap.values()).sort(
    (a, b) => b.totalSlots - a.totalSlots,
  );

  const totalEligibleCount = Math.max(users.length, allEligibleUsers.length, 1);

  // Calculate Golden Slot Recommendations
  // Sort all slots by count descending
  const sortedSlots = [...slotMatrix]
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count);

  const recommendations: GoldenSlotRecommendation[] = sortedSlots
    .slice(0, 5)
    .map((slot) => {
      const dayMeta = DAY_OF_WEEK_MAP.find((d) => d.day === slot.dayOfWeek);
      const dayLabel = dayMeta?.label ?? `Day ${slot.dayOfWeek}`;
      const dayShort = dayMeta?.short ?? `D${slot.dayOfWeek}`;

      const availableIds = new Set(slot.users.map((u) => u.id));
      const missingUsers: RecurringSlotUser[] = allEligibleUsers
        .filter((u) => !availableIds.has(u.id))
        .map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          image: u.image,
          committee: u.committee,
        }));

      const percentage = Math.round((slot.count / totalEligibleCount) * 100);

      return {
        dayOfWeek: slot.dayOfWeek,
        dayLabel,
        dayShort,
        startTime: slot.startTime,
        endTime: getEndTime(slot.startTime),
        count: slot.count,
        totalEligible: totalEligibleCount,
        percentage,
        availableUsers: slot.users,
        missingUsers,
      };
    });

  return {
    totalUsers: users.length,
    totalSlots: relevantSlots.length,
    maxCount,
    slotMatrix,
    users,
    days,
    timeSlots,
    recommendations,
  };
}
