import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { AvailabilityCalendar } from "@/components/calendar/availability-calendar"
import { Navbar } from "@/components/navbar/navbar"

export const metadata: Metadata = {
  title: "Mark Availability | Nile University Student Union",
  description: "Mark your available meeting slots on the official schedule.",
}

export const dynamic = "force-dynamic"

export default async function Page() {
  let session = null
  try {
    session = await auth.api.getSession({ headers: await headers() })
  } catch (err: any) {
    if (
      err?.digest?.startsWith("NEXT_REDIRECT") ||
      err?.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw err
    }
    console.error("Session lookup failed on /:", err)
    redirect("/auth?mode=signin&callbackUrl=/")
  }

  if (!session) {
    redirect("/auth?mode=signin&callbackUrl=/")
  }

  // admin@nu.edu.eg is restricted strictly to the Admin Panel and cannot mark availability
  if (session.user.email === "admin@nu.edu.eg") {
    redirect("/admin")
  }

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="container mx-auto flex max-w-lg flex-col items-center gap-6 px-4 pt-22 pb-8">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Mark Your Availability
          </h1>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            Select dates and mark your available meeting intervals for the
            Student Union.
          </p>
        </div>
        <AvailabilityCalendar user={session.user} />
      </main>
    </div>
  )
}
