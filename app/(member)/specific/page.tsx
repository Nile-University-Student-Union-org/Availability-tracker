import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCachedSession } from "@/lib/session";
import { getScheduleConfig } from "@/lib/schedule";
import { AvailabilityCalendar } from "@/components/calendar/availability-calendar";
import { ScheduleInactiveNotice } from "@/components/schedule-inactive-notice";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getScheduleConfig();
  const title = config?.dateScheduleTitle || "Specific Date Availability";
  return {
    title: `${title} | Nile University Student Union`,
    description:
      "Mark your available meeting slots for union campaigns and events.",
  };
}

export const dynamic = "force-dynamic";

export default async function SpecificDatePage() {
  let session = null;
  let config = null;

  try {
    [session, config] = await Promise.all([
      getCachedSession(),
      getScheduleConfig(),
    ]);
  } catch (err: unknown) {
    const error = err as { digest?: string };
    if (
      error?.digest?.startsWith("NEXT_REDIRECT") ||
      error?.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw err;
    }
    console.error("Session lookup failed on /specific:", err);
    redirect("/auth?mode=signin&callbackUrl=/specific");
  }

  if (!session) {
    redirect("/auth?mode=signin&callbackUrl=/specific");
  }

  // admin@nu.edu.eg is restricted strictly to the Admin Panel and cannot mark availability
  if (session.user.email === "admin@nu.edu.eg") {
    redirect("/admin");
  }

  const isDateActive = config?.dateScheduleActive ?? true;
  const isWeeklyActive = config?.weeklyScheduleActive ?? true;
  const formTitle = config?.dateScheduleTitle || "Specific Date Availability";

  // If specific date schedule is inactive, render the inactive notice card
  if (!isDateActive) {
    return (
      <main className="container mx-auto flex max-w-lg flex-col items-center gap-6 px-4 pt-28 sm:pt-34 pb-12">
        <ScheduleInactiveNotice
          currentMode="specific"
          dateScheduleActive={isDateActive}
          weeklyScheduleActive={isWeeklyActive}
        />
      </main>
    );
  }

  let dbUser = null;
  let initialAvailability: { date: string; startTime: string }[] = [];

  if (session.user.email && config) {
    try {
      const email = session.user.email.toLowerCase();
      const targetDates = config.dates.map(
        (d) => new Date(d + "T00:00:00.000Z"),
      );

      // Fetch user profile and specific date availability concurrently in 1 parallel round trip
      const [fetchedUser, records] = await Promise.all([
        prisma.user.findUnique({
          where: { email },
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            nuId: true,
            committee: true,
          },
        }),
        prisma.availability.findMany({
          where: {
            user: { email },
            date: { in: targetDates },
          },
          select: { date: true, startTime: true },
        }),
      ]);

      dbUser = fetchedUser;
      initialAvailability = records.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        startTime: r.startTime,
      }));
    } catch (err) {
      console.error("Failed to pre-fetch member availability on server:", err);
    }
  }

  return (
    <main className="container mx-auto flex max-w-lg flex-col items-center gap-6 px-4 pt-28 sm:pt-34 pb-12">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {formTitle}
        </h1>
        <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
          Select dates and mark your available meeting intervals for upcoming
          union campaigns.
        </p>
      </div>

      <AvailabilityCalendar
        user={dbUser ?? session.user}
        initialConfig={config}
        initialAvailability={initialAvailability}
      />
    </main>
  );
}
