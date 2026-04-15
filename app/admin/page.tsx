import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";
import { WEEK_DATES, TIME_SLOTS } from "@/components/calendar/constants";
import {
  AnalyticsDashboard,
  type AnalyticsData,
  type SlotEntry,
  type UserEntry,
} from "@/components/admin/analytics-dashboard";
import { Navbar } from "@/components/navbar/navbar";

export default async function AdminPage() {
  // 1. Verify session server-side.
  //    auth.api.getSession validates the session token against the DB —
  //    a tampered cookie will fail here before we ever check the email.
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) notFound();

  // 2. Check admin authorisation.
  //    ADMIN_EMAILS is a server-only env variable; it is never sent to the
  //    client, so no amount of session tampering gives access.
  if (!isAdminEmail(session.user.email)) notFound();

  // 3. Fetch every availability record for the target week, with user info.
  const rawSlots = await prisma.availability.findMany({
    where: {
      date: { in: WEEK_DATES.map((d) => new Date(d)) },
    },
    include: {
      user: {
        select: { id: true, name: true, email: true, image: true },
      },
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
  });

  // 4. Build the slot matrix (every date × startTime combination).
  const slotMatrix: SlotEntry[] = WEEK_DATES.flatMap((date) =>
    TIME_SLOTS.map((startTime) => {
      const matching = rawSlots.filter(
        (s) =>
          s.date.toISOString().slice(0, 10) === date &&
          s.startTime === startTime,
      );
      return {
        date,
        startTime,
        count: matching.length,
        users: matching.map((s) => ({
          name: s.user.name,
          email: s.user.email,
          image: s.user.image,
        })),
      };
    }),
  );

  const maxCount = slotMatrix.reduce((m, s) => Math.max(m, s.count), 0);

  // 5. Build per-user summaries, sorted by total slots descending.
  const userMap = new Map<string, UserEntry>();
  for (const slot of rawSlots) {
    const { user, date, startTime } = slot;
    const isoDate = date.toISOString().slice(0, 10);
    if (!userMap.has(user.id)) {
      userMap.set(user.id, {
        id: user.id,
        name: user.name,
        email: user.email,
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

  const analytics: AnalyticsData = {
    totalUsers: users.length,
    totalSlots: rawSlots.length,
    maxCount,
    slotMatrix,
    users,
  };

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="container mx-auto max-w-4xl px-4 pt-22 pb-10">
        <div className="mb-6">
          <h1 className="font-heading text-2xl font-semibold italic tracking-tight">
            Availability Analytics
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Week of Apr 19–23, 2026 · Admin view
          </p>
        </div>
        <AnalyticsDashboard data={analytics} />
      </main>
    </div>
  );
}
