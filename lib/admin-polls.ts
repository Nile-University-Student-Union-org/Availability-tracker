import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";

export type AdminViewer = { id: string; committee: string | null; superAdmin: boolean };

/** Polls an admin manages or can read results for (superadmins see all) */
export function adminPollsWhere(viewer: AdminViewer): Prisma.PollWhereInput {
  if (viewer.superAdmin) return {};
  return {
    OR: [
      { createdById: viewer.id },
      { allCommittees: true },
      ...(viewer.committee ? [{ committees: { has: viewer.committee } }] : []),
    ],
  };
}

export type OverviewPoll = {
  id: string;
  name: string;
  type: "date" | "weekly";
  active: boolean;
  allCommittees: boolean;
  committees: string[];
  requestedCommittees: string[];
  requestStatus: "pending" | "rejected" | null;
  rejectionReason: string | null;
  createdById: string | null;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
  weeklyDays: number[];
  createdBy: { name: string; email: string } | null;
  /** Members who marked at least one slot */
  respondents: number;
  /** Members the poll is open to */
  audience: number;
};

/** Every visible poll with how many of its members have answered */
export async function getAdminOverview(viewer: AdminViewer): Promise<OverviewPoll[]> {
  const [polls, answered, byCommittee] = await Promise.all([
    prisma.poll.findMany({
      where: adminPollsWhere(viewer),
      include: { createdBy: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.$queryRaw<{ pollId: string; n: number }[]>`
      SELECT "pollId", COUNT(DISTINCT "userId")::int AS n FROM (
        SELECT "pollId", "userId" FROM availability
        UNION ALL
        SELECT "pollId", "userId" FROM recurring_availability
      ) answers GROUP BY "pollId"`,
    prisma.user.groupBy({ by: ["committee"], _count: { _all: true } }),
  ]);

  const respondents = new Map(answered.map((r) => [r.pollId, r.n]));
  const members = new Map(byCommittee.map((c) => [c.committee, c._count._all]));
  const everyone = byCommittee.reduce((sum, c) => sum + (c.committee ? c._count._all : 0), 0);

  return polls.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type as "date" | "weekly",
    active: p.active,
    allCommittees: p.allCommittees,
    committees: p.committees,
    requestedCommittees: p.requestedCommittees,
    requestStatus: p.requestStatus as OverviewPoll["requestStatus"],
    rejectionReason: p.rejectionReason,
    createdById: p.createdById,
    createdAt: p.createdAt.toISOString(),
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    weeklyDays: p.weeklyDays,
    createdBy: p.createdBy,
    respondents: respondents.get(p.id) ?? 0,
    audience: p.allCommittees
      ? everyone
      : p.committees.reduce((sum, c) => sum + (members.get(c) ?? 0), 0),
  }));
}
