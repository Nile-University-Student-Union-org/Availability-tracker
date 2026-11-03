import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowRight01Icon,
  Calendar03Icon,
  Tick02Icon,
} from "@hugeicons/core-free-icons";
import { getCachedSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { canSeePoll } from "@/lib/poll-access";
import { pollSummary, type PollType } from "@/lib/poll-display";

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
        <ul className="flex flex-col gap-3">
          {polls.map((poll) => {
            const type = poll.type as PollType;
            const answered =
              poll._count.availabilities + poll._count.recurringAvailabilities >
              0;
            return (
              <li key={poll.id}>
                <Link
                  href={`/polls/${poll.id}`}
                  aria-label={answered ? `${poll.name}, answered` : poll.name}
                  className="group flex min-h-[56px] items-center gap-4 rounded-3xl border border-border/70 bg-card/60 p-4 shadow-xs transition-[background-color,transform] touch-manipulation hover:bg-card active:scale-[0.97] sm:p-5"
                >
                  <span
                    className={`relative flex size-11 shrink-0 items-center justify-center rounded-2xl bg-sky-500/10 text-sky-700 dark:text-sky-300 ${answered ? "ring-2 ring-emerald-500/40 ring-offset-2 ring-offset-background" : ""}`}
                  >
                    <HugeiconsIcon icon={Calendar03Icon} size={20} />
                    {answered && (
                      <span className="absolute -right-1.5 -bottom-1.5 flex size-5 items-center justify-center rounded-full bg-emerald-600 text-white ring-2 ring-background">
                        <HugeiconsIcon
                          icon={Tick02Icon}
                          size={12}
                          strokeWidth={2.6}
                        />
                      </span>
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="min-w-0 font-heading text-base font-semibold tracking-tight break-words">
                        {poll.name}
                      </span>
                      {answered && (
                        <span className="inline-flex h-[22px] shrink-0 items-center gap-1 rounded-full border border-emerald-600/30 bg-emerald-500/10 px-2 text-[11px] font-semibold text-emerald-700 dark:border-emerald-400/40 dark:text-emerald-300">
                          <HugeiconsIcon
                            icon={Tick02Icon}
                            size={12}
                            strokeWidth={2.2}
                          />
                          Answered
                        </span>
                      )}
                    </span>
                    <span className="mt-0.5 block truncate text-xs text-muted-foreground">
                      <span className="tabular-nums">
                        {pollSummary({
                          type,
                          startDate: poll.startDate?.toISOString() ?? null,
                          endDate: poll.endDate?.toISOString() ?? null,
                          weeklyDays: poll.weeklyDays,
                        })}
                      </span>
                    </span>
                  </span>
                  <HugeiconsIcon
                    icon={ArrowRight01Icon}
                    size={18}
                    className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}
