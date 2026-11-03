import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getPollConfig } from "@/lib/schedule";
import { canSeePoll } from "@/lib/poll-access";
import { AvailabilityCalendar } from "@/components/calendar/availability-calendar";
import { WeeklyTimetable } from "@/components/weekly/weekly-timetable";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const poll = await getPollConfig((await params).id);
  return { title: `${poll?.name ?? "Poll"} | Nile University Student Union` };
}

export default async function PollPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getCachedSession();
  if (!session) redirect("/auth?mode=signin");
  if (session.user.email === "admin@nu.edu.eg") redirect("/admin");
  const { id } = await params;
  const [user, poll] = await Promise.all([
    prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: {
        id: true,
        name: true,
        email: true,
        nuId: true,
        committee: true,
        image: true,
      },
    }),
    getPollConfig(id),
  ]);
  if (!user || !poll || !canSeePoll(poll, user)) notFound();
  if (
    !poll.active ||
    (poll.type === "date" && (!poll.startDate || !poll.endDate))
  ) {
    return (
      <main className="container mx-auto flex max-w-md flex-col items-center gap-6 px-4 pt-28 pb-12">
        <div className="w-full rounded-3xl border border-border/80 bg-card p-6 text-center shadow-xs">
          <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
            {poll.name}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            This poll is closed
          </p>
          <div className="mt-6 flex justify-center">
            <Link
              href="/polls"
              className={cn(
                buttonVariants({ variant: "default" }),
                "min-h-[44px] px-6 text-sm font-semibold touch-manipulation active:scale-[0.98]",
              )}
            >
              Back to your polls
            </Link>
          </div>
        </div>
      </main>
    );
  }
  if (poll.type === "date") {
    const { startDate, endDate } = poll;
    if (!startDate || !endDate) {
      return (
        <main className="container mx-auto flex max-w-md flex-col items-center gap-6 px-4 pt-28 pb-12">
          <div className="w-full rounded-3xl border border-border/80 bg-card p-6 text-center shadow-xs">
            <h1 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
              {poll.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This poll is closed
            </p>
            <div className="mt-6 flex justify-center">
              <Link
                href="/polls"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "min-h-[44px] px-6 text-sm font-semibold touch-manipulation active:scale-[0.98]",
                )}
              >
                Back to your polls
              </Link>
            </div>
          </div>
        </main>
      );
    }
    const records = await prisma.availability.findMany({
      where: { userId: user.id, pollId: id },
      select: { date: true, startTime: true },
    });
    return (
      <main className="container mx-auto flex max-w-lg flex-col items-center gap-6 px-4 pt-28 pb-12">
        <h1 className="text-center font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          {poll.name}
        </h1>
        <AvailabilityCalendar
          pollId={id}
          user={user}
          initialConfig={{ ...poll, startDate, endDate }}
          initialAvailability={records.map((r) => ({
            date: r.date.toISOString().slice(0, 10),
            startTime: r.startTime,
          }))}
        />
      </main>
    );
  }
  const records = await prisma.recurringAvailability.findMany({
    where: { userId: user.id, pollId: id },
    select: { dayOfWeek: true, startTime: true },
  });
  return (
    <main className="container mx-auto flex max-w-xl flex-col items-center gap-6 px-4 pt-28 pb-16">
      <h1 className="text-center font-heading text-2xl font-bold tracking-tight sm:text-3xl">
        {poll.name}
      </h1>
      <WeeklyTimetable
        pollId={id}
        user={user}
        weeklyDays={poll.weeklyDays}
        weeklySlots={poll.weeklySlots}
        initialSlots={records}
      />
    </main>
  );
}
