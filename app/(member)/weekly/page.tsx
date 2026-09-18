import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScheduleConfig } from "@/lib/schedule";
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
  try {
    session = await auth.api.getSession({ headers: await headers() });
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

  const config = await getScheduleConfig();
  const isDateActive = config?.dateScheduleActive ?? true;
  const isWeeklyActive = config?.weeklyScheduleActive ?? true;
  const includeSaturday = config?.weeklyIncludeSaturday ?? false;
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
      dbUser = await prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: {
          id: true,
          name: true,
          email: true,
          image: true,
          nuId: true,
          committee: true,
        },
      });
      const records = await prisma.recurringAvailability.findMany({
        where: {
          user: { email: session.user.email.toLowerCase() },
        },
        select: { dayOfWeek: true, startTime: true },
        orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
      });
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

  // Default standard hourly slots if no config is set
  const timeSlots =
    config && config.timeSlots.length > 0
      ? config.timeSlots
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

  return (
    <main className="container mx-auto flex max-w-xl flex-col items-center gap-6 px-4 pt-28 sm:pt-34 pb-16">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {formTitle}
        </h1>
        <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
          Mark your recurring weekly timetable to find the best standing meeting
          time for your committee.
        </p>
      </div>

      <WeeklyTimetable
        user={dbUser ?? session.user}
        timeSlots={timeSlots}
        includeSaturday={includeSaturday}
        initialSlots={initialSlots}
      />
    </main>
  );
}
