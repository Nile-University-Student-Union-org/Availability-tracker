import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
import { isAdminEmail, getEnvAdminEmails, isSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getCommittees } from "@/lib/committees";
import { canSeeResults } from "@/lib/poll-access";
import { getDateAnalytics } from "@/lib/date-analytics";
import { getSemesterAnalytics } from "@/lib/semester-analytics";
import type { AnalyticsData } from "@/components/admin/analytics-dashboard";
import {
  AdminLayoutShell,
  type AnalyticsPollOption,
} from "@/components/admin/admin-layout-shell";

export const metadata: Metadata = {
  title: "Admin Console | Nile University Student Union",
  description:
    "Administrative dashboard for Availability Tracker schedule configuration and analytics.",
};

export const dynamic = "force-dynamic";

const EMPTY_DATE_ANALYTICS: AnalyticsData = {
  totalUsers: 0,
  totalSlots: 0,
  maxCount: 0,
  slotMatrix: [],
  users: [],
  dates: [],
  timeSlots: [],
};

const EMPTY_SEMESTER_ANALYTICS: Awaited<ReturnType<typeof getSemesterAnalytics>> = {
  totalUsers: 0,
  totalSlots: 0,
  maxCount: 0,
  slotMatrix: [],
  users: [],
  days: [0, 1, 2, 3, 4],
  timeSlots: [],
  weeklySlots: [],
  recommendations: [],
};

/** The requested poll when allowed, else the legacy poll, else the newest */
function pickPoll(options: AnalyticsPollOption[], requested: string | undefined, legacyId: string) {
  return (
    options.find((p) => p.id === requested) ??
    options.find((p) => p.id === legacyId) ??
    options[0] ??
    null
  );
}

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<{ poll?: string }>;
}) {
  let session = null;

  try {
    session = await getCachedSession();
  } catch (err: unknown) {
    const error = err as { digest?: string };
    if (
      error?.digest?.startsWith("NEXT_REDIRECT") ||
      error?.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw err;
    }
    console.error("Admin session lookup failed:", err);
    redirect("/auth?mode=signin&callbackUrl=/admin");
  }

  if (!session) {
    redirect("/auth?mode=signin&callbackUrl=/admin");
  }

  const userEmail = session.user.email.toLowerCase();
  const isSpecialAdmin = userEmail === "admin@nu.edu.eg";
  const userRole = (session.user as Record<string, unknown>).role;
  const isRoleAdmin = userRole === "admin" || userRole === "super-admin";
  const isEnvAdmin = getEnvAdminEmails().includes(userEmail);
  const isAuthorized =
    isSpecialAdmin ||
    isRoleAdmin ||
    isEnvAdmin ||
    (await isAdminEmail(userEmail));

  if (!isAuthorized) {
    redirect("/");
  }

  const superAdmin = isSuperAdmin(userEmail);
  const [{ poll: requestedPoll }, user, polls, committees, pendingCount] =
    await Promise.all([
      searchParams,
      prisma.user.findUnique({
        where: { email: userEmail },
        select: { id: true, committee: true },
      }),
      prisma.poll.findMany({
        select: {
          id: true,
          name: true,
          type: true,
          allCommittees: true,
          committees: true,
          createdById: true,
        },
        orderBy: { createdAt: "desc" },
      }),
      getCommittees(),
      superAdmin
        ? prisma.poll.count({ where: { requestStatus: "pending" } })
        : Promise.resolve(0),
    ]);

  const visible = polls.filter((p) =>
    canSeeResults(p, user?.id ?? "", user?.committee ?? null, true, superAdmin),
  );
  const toOption = (p: (typeof polls)[number]): AnalyticsPollOption => ({
    id: p.id,
    name: p.name,
  });
  const datePolls = visible.filter((p) => p.type === "date").map(toOption);
  const weeklyPolls = visible.filter((p) => p.type === "weekly").map(toOption);
  const datePoll = pickPoll(datePolls, requestedPoll, "legacy-date");
  const weeklyPoll = pickPoll(weeklyPolls, requestedPoll, "legacy-weekly");

  let analytics = EMPTY_DATE_ANALYTICS;
  let semesterAnalytics = EMPTY_SEMESTER_ANALYTICS;
  try {
    [analytics, semesterAnalytics] = await Promise.all([
      datePoll ? getDateAnalytics(datePoll.id) : EMPTY_DATE_ANALYTICS,
      weeklyPoll
        ? getSemesterAnalytics(undefined, weeklyPoll.id)
        : EMPTY_SEMESTER_ANALYTICS,
    ]);
  } catch (err) {
    console.error("Failed to load admin analytics data:", err);
  }

  return (
    <AdminLayoutShell
      session={session}
      analytics={analytics}
      semesterAnalytics={semesterAnalytics}
      initialAdmins={[]}
      viewer={{
        id: user?.id ?? "",
        committee: user?.committee ?? null,
        isSuperAdmin: superAdmin,
      }}
      committees={committees}
      pendingCount={pendingCount}
      datePolls={datePolls}
      weeklyPolls={weeklyPolls}
      datePollId={datePoll?.id ?? null}
      weeklyPollId={weeklyPoll?.id ?? null}
    />
  );
}
