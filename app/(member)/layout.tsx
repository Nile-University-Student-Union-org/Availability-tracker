import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
import { isAdminEmail } from "@/lib/admin";
import { getScheduleConfig } from "@/lib/schedule";
import { Navbar } from "@/components/navbar/navbar";

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [session, config] = await Promise.all([
    getCachedSession().catch(() => null),
    getScheduleConfig().catch(() => null),
  ]);

  let isAdmin = false;
  if (session?.user?.email) {
    try {
      isAdmin = await isAdminEmail(session.user.email);
    } catch {
      // ignore
    }
  }

  const user = session?.user as
    | { nuId?: string | null; committee?: string | null }
    | undefined;
  // Members (e.g. first Microsoft sign-in) must set NU ID + committee before using the calendars
  if (user && !isAdmin && (!user.nuId || !user.committee)) {
    redirect("/welcome");
  }

  return (
    <div className="min-h-svh bg-background">
      <Navbar
        dateScheduleTitle={config?.dateScheduleTitle}
        weeklyScheduleTitle={config?.weeklyScheduleTitle}
        dateScheduleActive={config?.dateScheduleActive ?? true}
        weeklyScheduleActive={config?.weeklyScheduleActive ?? true}
        initialUser={session?.user}
        initialIsAdmin={isAdmin}
      />
      {children}
    </div>
  );
}
