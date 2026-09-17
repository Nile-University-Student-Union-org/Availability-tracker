import type { Metadata } from "next"
import { headers } from "next/headers"
import { notFound, redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdminEmail } from "@/lib/admin"
import { getScheduleConfig } from "@/lib/schedule"
import {
  type AnalyticsData,
  type SlotEntry,
  type UserEntry,
} from "@/components/admin/analytics-dashboard"
import { AdminLayoutShell } from "@/components/admin/admin-layout-shell"

export const metadata: Metadata = {
  title: "Admin Console | Nile University Student Union",
  description:
    "Administrative dashboard for Availability Tracker schedule configuration and analytics.",
}

export default async function AdminPage() {
  const session = await auth.api.getSession({ headers: await headers() })

  if (!session) {
    redirect("/auth?mode=signin&callbackUrl=/admin")
  }

  if (!(await isAdminEmail(session.user.email))) {
    redirect("/")
  }

  const config = await getScheduleConfig()

  let analytics: AnalyticsData = {
    totalUsers: 0,
    totalSlots: 0,
    maxCount: 0,
    slotMatrix: [],
    users: [],
    dates: [],
    timeSlots: [],
  }

  let dateRangeLabel = "No schedule configured"

  if (config) {
    try {
      const { dates, timeSlots } = config
      const targetDates = dates.map((d) => new Date(d + "T00:00:00.000Z"))

      const rawSlots = await prisma.availability.findMany({
        where: {
          date: { in: targetDates },
        },
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              nuId: true,
              image: true,
              committee: true,
            },
          },
        },
        orderBy: [{ date: "asc" }, { startTime: "asc" }],
      })

      // In fixed mode: only count slots that match the configured time slots
      // (ignores any old free-booking records that remain in the DB).
      // In free mode: derive the slot list from actual bookings so the matrix reflects reality.
      const allTimeSlots =
        config.slotMode === "fixed"
          ? timeSlots
          : Array.from(new Set(rawSlots.map((s) => s.startTime))).sort()

      // In fixed mode, discard any record whose startTime isn't in the configured list.
      const relevantSlots =
        config.slotMode === "fixed"
          ? rawSlots.filter((s) => timeSlots.includes(s.startTime))
          : rawSlots

      const slotMatrix: SlotEntry[] = dates.flatMap((date) =>
        allTimeSlots.map((startTime) => {
          const matching = relevantSlots.filter(
            (s: any) =>
              s.date.toISOString().slice(0, 10) === date &&
              s.startTime === startTime
          )
          return {
            date,
            startTime,
            count: matching.length,
            users: matching
              .filter((s: any) => s.user)
              .map((s: any) => ({
                name: s.user.name,
                email: s.user.email,
                image: s.user.image,
                committee: s.user.committee,
              })),
          }
        })
      )

      const maxCount = slotMatrix.reduce((m, s) => Math.max(m, s.count), 0)

      const userMap = new Map<string, UserEntry>()
      for (const slot of relevantSlots) {
        const { user, date, startTime } = slot as any
        if (!user) continue

        const key = user.id
        if (!userMap.has(key)) {
          userMap.set(key, {
            id: user.id,
            name: user.name,
            email: user.email,
            nuId: user.nuId,
            image: user.image,
            committee: user.committee,
            totalSlots: 0,
            byDate: {},
          })
        }

        const entry = userMap.get(key)!
        const isoDate = (date as Date).toISOString().slice(0, 10)
        entry.totalSlots++
        if (!entry.byDate[isoDate]) entry.byDate[isoDate] = []
        entry.byDate[isoDate].push(startTime)
      }

      const users = Array.from(userMap.values()).sort(
        (a, b) => b.totalSlots - a.totalSlots
      )

      analytics = {
        totalUsers: users.length,
        totalSlots: rawSlots.length,
        maxCount,
        slotMatrix,
        users,
        dates,
        timeSlots: allTimeSlots,
      }

      const startLabel = new Date(
        config.startDate + "T00:00:00.000Z"
      ).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })
      const endLabel = new Date(config.endDate + "T00:00:00.000Z").toLocaleDateString(
        "en-US",
        {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        }
      )
      dateRangeLabel = `${startLabel}–${endLabel} · Admin view`
    } catch (err) {
      console.error("Failed to load admin analytics data:", err)
      dateRangeLabel = "Error loading schedule data"
    }
  }

  return (
    <AdminLayoutShell
      session={session}
      analytics={analytics}
      dateRangeLabel={dateRangeLabel}
    />
  )
}
