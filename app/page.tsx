import type { Metadata } from "next"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { getScheduleConfig } from "@/lib/schedule"
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

  const config = await getScheduleConfig()
  let initialAvailability: { date: string; startTime: string }[] = []

  if (session.user.email && config) {
    try {
      const targetDates = config.dates.map(
        (d) => new Date(d + "T00:00:00.000Z")
      )
      const records = await prisma.availability.findMany({
        where: {
          user: { email: session.user.email.toLowerCase() },
          date: { in: targetDates },
        },
        select: { date: true, startTime: true },
      })
      initialAvailability = records.map((r) => ({
        date: r.date.toISOString().slice(0, 10),
        startTime: r.startTime,
      }))
    } catch (err) {
      console.error("Failed to pre-fetch member availability on server:", err)
    }
  }

  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="container mx-auto flex max-w-lg flex-col items-center gap-6 px-4 pt-28 sm:pt-34 pb-12">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl">
            Mark Your Availability
          </h1>
          <p className="mt-2 text-xs text-muted-foreground sm:text-sm">
            Select dates and mark your available meeting intervals for the
            Student Union.
          </p>
        </div>
        <AvailabilityCalendar
          user={session.user}
          initialConfig={config}
          initialAvailability={initialAvailability}
        />
      </main>
    </div>
  )
}

