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
