import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCachedSession } from "@/lib/session";
import { getScheduleConfig } from "@/lib/schedule";
import { legacyWeeklySchedule } from "@/lib/weekly-slots";
import { ScheduleInactiveNotice } from "@/components/schedule-inactive-notice";
import { WeeklyTimetable } from "@/components/weekly/weekly-timetable";

export async function generateMetadata(): Promise<Metadata> {
  const config = await getScheduleConfig();
  const title = config?.weeklyScheduleTitle || "Semester Availability";
  return {
    title: `${title} | Nile University Student Union`,
    description:
      "Mark your standing weekly free hours across the semester for union meeting scheduling.",
  };
}

export const dynamic = "force-dynamic";

export default async function WeeklyTimetablePage() {
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
    console.error("Session lookup failed on /weekly:", err);
    redirect("/auth?mode=signin&callbackUrl=/weekly");
  }

  if (!session) {
    redirect("/auth?mode=signin&callbackUrl=/weekly");
  }

  // admin@nu.edu.eg is restricted strictly to the Admin Panel
  if (session.user.email === "admin@nu.edu.eg") {
    redirect("/admin");
  }

  const isDateActive = config?.dateScheduleActive ?? true;
  const isWeeklyActive = config?.weeklyScheduleActive ?? true;
  const { weeklyDays, weeklySlots } = config ?? legacyWeeklySchedule();
  const formTitle = config?.weeklyScheduleTitle || "Semester Availability";

  // If weekly schedule is inactive, render the inactive notice card
  if (!isWeeklyActive) {
    return (
      <main className="container mx-auto flex max-w-lg flex-col items-center gap-6 px-4 pt-28 sm:pt-34 pb-12">
        <ScheduleInactiveNotice
          currentMode="weekly"
          dateScheduleActive={isDateActive}
          weeklyScheduleActive={isWeeklyActive}
        />
      </main>
    );
  }

  let dbUser = null;
  let initialSlots: { dayOfWeek: number; startTime: string }[] = [];

  if (session.user.email) {
    try {
      const email = session.user.email.toLowerCase();
      // Fetch user profile and semester availability slots concurrently in 1 parallel round trip
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
        prisma.recurringAvailability.findMany({
          where: { user: { email } },
          select: { dayOfWeek: true, startTime: true },
          orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
        }),
      ]);

      dbUser = fetchedUser;
      initialSlots = records.map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
      }));
    } catch (err) {
      console.error(
        "Failed to pre-fetch member semester slots on server:",
        err,
      );
    }
  }

  return (
    <main className="container mx-auto flex max-w-xl flex-col items-center gap-6 px-4 pt-28 sm:pt-34 pb-16">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {formTitle}
        </h1>
      </div>

      <WeeklyTimetable
        user={dbUser ?? session.user}
        weeklyDays={weeklyDays}
        weeklySlots={weeklySlots}
        initialSlots={initialSlots}
      />
    </main>
  );
}
