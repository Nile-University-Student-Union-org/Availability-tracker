import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { getScheduleConfig } from "@/lib/schedule"
import { Navbar } from "@/components/navbar/navbar"

export default async function MemberLayout({
  children,
}: {
  children: React.ReactNode
}) {
  let session = null
  let isAdmin = false
  try {
    session = await auth.api.getSession({ headers: await headers() })
    if (session?.user?.email) {
      isAdmin = await isAdminEmail(session.user.email)
    }
  } catch {
    // ignore
  }

  const config = await getScheduleConfig()

  return (
    <div className="min-h-svh bg-background">
      <Navbar
        dateScheduleTitle={config?.dateScheduleTitle}
        weeklyScheduleTitle={config?.weeklyScheduleTitle}
        initialUser={session?.user}
        initialIsAdmin={isAdmin}
      />
      {children}
    </div>
  )
}
