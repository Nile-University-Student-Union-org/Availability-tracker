import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
import { isAdminEmail, getEnvAdminEmails } from "@/lib/admin";
import { getScheduleConfig } from "@/lib/schedule";
import { getDateAnalytics } from "@/lib/date-analytics";
import { getSemesterAnalytics } from "@/lib/semester-analytics";
import type { AnalyticsData } from "@/components/admin/analytics-dashboard";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";

export const metadata: Metadata = {
  title: "Admin Console | Nile University Student Union",
  description:
    "Administrative dashboard for Availability Tracker schedule configuration and analytics.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  let session = null;
  let config: Awaited<ReturnType<typeof getScheduleConfig>> = null;
  let semesterAnalytics: Awaited<ReturnType<typeof getSemesterAnalytics>> = {
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

  try {
    const [fetchedSession, fetchedConfig, fetchedSemester] = await Promise.all([
      getCachedSession(),
      getScheduleConfig(),
      getSemesterAnalytics(),
    ]);
    session = fetchedSession;
    config = fetchedConfig;
    semesterAnalytics = fetchedSemester;
  } catch (err: unknown) {
    const error = err as { digest?: string };
    if (
      error?.digest?.startsWith("NEXT_REDIRECT") ||
      error?.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw err;
    }
    console.error("Admin session or config lookup failed:", err);
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

  let analytics: AnalyticsData = {
    totalUsers: 0,
    totalSlots: 0,
    maxCount: 0,
    slotMatrix: [],
    users: [],
    dates: [],
    timeSlots: [],
  };

  if (config) {
    try {
      analytics = await getDateAnalytics();
    } catch (err) {
      console.error("Failed to load admin analytics data:", err);
    }
  }

  return (
    <AdminLayoutShell
      session={session}
      analytics={analytics}
      semesterAnalytics={semesterAnalytics}
      initialConfig={config}
      initialAdmins={[]}
    />
  );
}
