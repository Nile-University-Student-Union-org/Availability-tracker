import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
import { isAdminEmail, getEnvAdminEmails, isSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getCommittees } from "@/lib/committees";
import { getAdminOverview } from "@/lib/admin-polls";
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell";

export const metadata: Metadata = {
  title: "Admin Console | Nile University Student Union",
  description:
    "Administrative dashboard for Availability Tracker polls, results and members.",
};

export const dynamic = "force-dynamic";

export default async function AdminPage() {
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
  const user = await prisma.user.findUnique({
    where: { email: userEmail },
    select: { id: true, committee: true },
  });
  const viewer = {
    id: user?.id ?? "",
    committee: user?.committee ?? null,
    isSuperAdmin: superAdmin,
  };
  const [committees, pendingCount, overviewPolls] = await Promise.all([
    getCommittees(),
    superAdmin
      ? prisma.poll.count({ where: { requestStatus: "pending" } })
      : Promise.resolve(0),
    getAdminOverview({
      id: viewer.id,
      committee: viewer.committee,
      superAdmin,
    }).catch((err) => {
      console.error("Failed to load admin overview:", err);
      return [];
    }),
  ]);

  return (
    <AdminLayoutShell
      session={session}
      initialAdmins={[]}
      viewer={viewer}
      committees={committees}
      pendingCount={pendingCount}
      overviewPolls={overviewPolls}
    />
  );
}
