import { notFound, redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPollConfig } from "@/lib/schedule";
import { canSeePoll } from "@/lib/poll-access";
import { AvailabilityCalendar } from "@/components/calendar/availability-calendar";
import { WeeklyTimetable } from "@/components/weekly/weekly-timetable";
import { ScheduleInactiveNotice } from "@/components/schedule-inactive-notice";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const poll = await getPollConfig((await params).id);
  return { title: `${poll?.name ?? "Poll"} | Nile University Student Union` };
}

export default async function PollPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getCachedSession();
  if (!session) redirect("/auth?mode=signin");
  if (session.user.email === "admin@nu.edu.eg") redirect("/admin");
  const { id } = await params;
  const [user, poll, config] = await Promise.all([
    prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() }, select: { id: true, name: true, email: true, nuId: true, committee: true, image: true } }),
    prisma.poll.findUnique({ where: { id }, select: { id: true, name: true, type: true, active: true, allCommittees: true, committees: true, requestedCommittees: true } }),
    getPollConfig(id),
  ]);
  if (!user || !poll || !config || !canSeePoll(poll, user)) notFound();
  if (!poll.active || (poll.type === "date" && (!config.startDate || !config.endDate))) {
    return (
      <main className="container mx-auto flex max-w-lg flex-col items-center gap-6 px-4 pt-28 pb-12">
        <ScheduleInactiveNotice
          currentMode={poll.type === "date" ? "specific" : "weekly"}
          dateScheduleActive={poll.type === "date" ? false : true}
          weeklyScheduleActive={poll.type === "weekly" ? false : true}
        />
      </main>
    );
  }
  if (poll.type === "date") {
    const { startDate, endDate } = config;
    if (!startDate || !endDate) {
      return (
        <main className="container mx-auto flex max-w-lg flex-col items-center gap-6 px-4 pt-28 pb-12">
          <ScheduleInactiveNotice
            currentMode="specific"
            dateScheduleActive={false}
            weeklyScheduleActive={true}
          />
        </main>
      );
    }
    const records = await prisma.availability.findMany({ where: { userId: user.id, pollId: id }, select: { date: true, startTime: true } });
    return (
      <main className="container mx-auto flex max-w-lg flex-col items-center gap-6 px-4 pt-28 pb-12">
        <h1 className="text-center font-heading text-2xl font-bold tracking-tight sm:text-3xl">{poll.name}</h1>
        <AvailabilityCalendar
          pollId={id}
          user={user}
          initialConfig={{ ...config, startDate, endDate }}
          initialAvailability={records.map(r => ({ date: r.date.toISOString().slice(0, 10), startTime: r.startTime }))}
        />
      </main>
    );
  }
  const records = await prisma.recurringAvailability.findMany({ where: { userId: user.id, pollId: id }, select: { dayOfWeek: true, startTime: true } });
  return <main className="container mx-auto flex max-w-xl flex-col items-center gap-6 px-4 pt-28 pb-16"><h1 className="text-center font-heading text-2xl font-bold tracking-tight sm:text-3xl">{poll.name}</h1><WeeklyTimetable pollId={id} user={user} weeklyDays={config.weeklyDays} weeklySlots={config.weeklySlots} initialSlots={records} /></main>;
}
