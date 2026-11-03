import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon } from "@hugeicons/core-free-icons";
import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canSeePoll } from "@/lib/poll-access";
import { pollSummary, type PollType } from "@/lib/poll-display";
import { PollList } from "@/components/member/poll-list";

export const metadata: Metadata = {
  title: "Your polls | Nile University Student Union",
  description: "Polls your committee is asked to fill.",
};

export const dynamic = "force-dynamic";

export default async function PollListPage() {
  const session = await getCachedSession();
  if (!session) redirect("/auth?mode=signin&callbackUrl=/polls");
  if (session.user.email === "admin@nu.edu.eg") redirect("/admin");

  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, committee: true },
  });
  const polls = user
    ? (
        await prisma.poll.findMany({
          where: {
            active: true,
            OR: [
              { allCommittees: true },
              ...(user.committee
                ? [{ committees: { has: user.committee } }]
                : []),
            ],
          },
          select: {
            id: true,
            name: true,
            type: true,
            active: true,
            allCommittees: true,
            committees: true,
            startDate: true,
            endDate: true,
            weeklyDays: true,
            // Answered = this member saved at least one slot (counted in the same query)
            _count: {
              select: {
                availabilities: { where: { userId: user.id } },
                recurringAvailabilities: { where: { userId: user.id } },
              },
            },
          },
          orderBy: { createdAt: "desc" },
        })
      ).filter((p) => canSeePoll(p, user))
    : [];

  return (
    <main className="container mx-auto flex max-w-xl flex-col gap-6 px-4 pt-28 pb-16 sm:pt-34">
      <div className="text-center">
        <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
          Your polls
        </h1>
        {user?.committee && (
          <p className="mt-1.5 text-sm text-muted-foreground">
            Polls for {user.committee}
          </p>
        )}
      </div>

      {polls.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border px-6 py-14 text-center">
          <HugeiconsIcon
            icon={Calendar03Icon}
            size={26}
            className="text-muted-foreground"
          />
          <p className="font-heading text-base font-semibold">
            No polls for your committee yet
          </p>
          <p className="max-w-xs text-sm text-muted-foreground">
            When your head opens a poll for you, it shows up here.
          </p>
        </div>
      ) : (
        <PollList
          polls={polls.map((poll) => {
            const type = poll.type as PollType;
            const answered =
              poll._count.availabilities + poll._count.recurringAvailabilities >
              0;
            return {
              id: poll.id,
              name: poll.name,
              answered,
              summary: pollSummary({
                type,
                startDate: poll.startDate?.toISOString() ?? null,
                endDate: poll.endDate?.toISOString() ?? null,
                weeklyDays: poll.weeklyDays,
              }),
            };
          })}
        />
      )}
    </main>
  );
}
