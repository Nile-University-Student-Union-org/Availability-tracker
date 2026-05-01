import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { getScheduleConfig } from "@/lib/schedule";
import {
  AnalyticsDashboard,
  type AnalyticsData,
  type SlotEntry,
  type UserEntry,
} from "@/components/admin/analytics-dashboard";
import { ScheduleConfigPanel } from "@/components/admin/schedule-config-panel";
import { Navbar } from "@/components/navbar/navbar";

export const metadata: Metadata = {
  title: "Analytics",
};

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() });
  
  if (!session) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-2xl font-bold">Unauthorized</h1>
        <p className="text-muted-foreground">Please log in to access the admin panel.</p>
        <a href="/auth?callbackUrl=/admin" className="px-4 py-2 bg-primary text-primary-foreground rounded-lg">
          Go to Login
        </a>
      </div>
    );
  }

  if (!isAdminEmail(session.user.email)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <h1 className="text-2xl font-bold">Access Denied</h1>
        <p className="text-muted-foreground">Your account ({session.user.email}) does not have admin privileges.</p>
        <a href="/" className="px-4 py-2 bg-secondary text-secondary-foreground rounded-lg">
          Back to Home
        </a>
      </div>
    );
  }

  const config = await getScheduleConfig();

  let analytics: AnalyticsData = {
    totalUsers: 0,
    totalSlots: 0,
    maxCount: 0,
    slotMatrix: [],
    users: [],
    dates: [],
    timeSlots: [],
  };

  let dateRangeLabel = "No schedule configured";

  if (config) {
    const { dates, timeSlots } = config;

    const rawSlots = await prisma.availability.findMany({
      where: {
        date: { in: dates.map((d) => new Date(d)) },
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, nuId: true, image: true },
        },
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    });

    // In fixed mode: only count slots that match the configured time slots
    // (ignores any old free-booking records that remain in the DB).
    // In free mode: derive the slot list from actual bookings so the matrix reflects reality.
    const allTimeSlots =
      config.slotMode === "fixed"
        ? timeSlots
        : Array.from(new Set(rawSlots.map((s) => s.startTime))).sort();

    // In fixed mode, discard any record whose startTime isn't in the configured list.
    const relevantSlots =
      config.slotMode === "fixed"
        ? rawSlots.filter((s) => timeSlots.includes(s.startTime))
        : rawSlots;

    const slotMatrix: SlotEntry[] = dates.flatMap((date) =>
      allTimeSlots.map((startTime) => {
        const matching = relevantSlots.filter(
          (s) =>
            s.date.toISOString().slice(0, 10) === date &&
            s.startTime === startTime,
        );
        return {
          date,
          startTime,
          count: matching.length,
          users: matching
            .filter((s) => s.user)
            .map((s) => ({
              name: s.user.name,
              email: s.user.email,
              image: s.user.image,
            })),
        };
      }),
    );

    const maxCount = slotMatrix.reduce((m, s) => Math.max(m, s.count), 0);

    const userMap = new Map<string, UserEntry>();
    for (const slot of relevantSlots) {
      const { user, date, startTime } = slot as any;
      if (!user) continue;
      const isoDate = (date as Date).toISOString().slice(0, 10);
      if (!userMap.has(user.id)) {
        userMap.set(user.id, {
          id: user.id,
          name: user.name,
          email: user.email,
          nuId: user.nuId,
          image: user.image,
          totalSlots: 0,
          byDate: {},
        });
      }
      const entry = userMap.get(user.id)!;
      entry.totalSlots++;
      if (!entry.byDate[isoDate]) entry.byDate[isoDate] = [];
      entry.byDate[isoDate].push(startTime);
    }

    const users = Array.from(userMap.values()).sort(
      (a, b) => b.totalSlots - a.totalSlots,
    );

    analytics = {
      totalUsers: users.length,
      totalSlots: rawSlots.length,
      maxCount,
      slotMatrix,
      users,
      dates,
      timeSlots: allTimeSlots,
    };

    const startLabel = new Date(
      config.startDate + "T00:00:00",
    ).toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const endLabel = new Date(
      config.endDate + "T00:00:00",
    ).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    dateRangeLabel = `${startLabel}–${endLabel} · Admin view`;
  }

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 pt-22 pb-10">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Availability Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{dateRangeLabel}</p>
        </div>
        <div className="space-y-8">
          <AnalyticsDashboard data={analytics} />
          <div>
            <h2 className="font-heading mb-4 text-xl font-semibold tracking-tight">
              Schedule Configuration
            </h2>
            <ScheduleConfigPanel />
          </div>
        </div>
      </main>
    </div>
  );
}
