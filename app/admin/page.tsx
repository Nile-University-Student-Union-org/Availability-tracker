import type { Metadata } from "next"
import { headers } from "next/headers"
import { redirect } from "next/navigation"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { isAdminEmail, getEnvAdminEmails } from "@/lib/admin"
import { getScheduleConfig } from "@/lib/schedule"
import { getSemesterAnalytics } from "@/lib/semester-analytics"
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

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  let session = null
  let config: Awaited<ReturnType<typeof getScheduleConfig>> = null
  let semesterAnalytics: Awaited<ReturnType<typeof getSemesterAnalytics>> = {
    totalUsers: 0,
    totalSlots: 0,
    maxCount: 0,
    slotMatrix: [],
    users: [],
    days: [0, 1, 2, 3, 4],
    timeSlots: [],
    recommendations: [],
  }

  try {
    const [fetchedSession, fetchedConfig, fetchedSemester] = await Promise.all([
      auth.api.getSession({ headers: await headers() }),
      getScheduleConfig(),
      getSemesterAnalytics(),
    ])
    session = fetchedSession
    config = fetchedConfig
    semesterAnalytics = fetchedSemester
  } catch (err: unknown) {
    const error = err as { digest?: string }
    if (
      error?.digest?.startsWith("NEXT_REDIRECT") ||
      error?.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw err
    }
    console.error("Admin session or config lookup failed:", err)
    redirect("/auth?mode=signin&callbackUrl=/admin")
  }

  if (!session) {
    redirect("/auth?mode=signin&callbackUrl=/admin")
  }

  const userEmail = session.user.email.toLowerCase()
  const isSpecialAdmin = userEmail === "admin@nu.edu.eg"
  const userRole = (session.user as Record<string, unknown>).role
  const isRoleAdmin = userRole === "admin" || userRole === "super-admin"
  const isEnvAdmin = getEnvAdminEmails().includes(userEmail)
  const isAuthorized =
    isSpecialAdmin ||
    isRoleAdmin ||
    isEnvAdmin ||
    (await isAdminEmail(userEmail))

  if (!isAuthorized) {
    redirect("/")
  }

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

      const rawSlots = await prisma.availability.findMany({
        where: {
          date: {
            gte: new Date(config.startDate + "T00:00:00.000Z"),
            lte: new Date(config.endDate + "T00:00:00.000Z"),
          },
        },
        select: {
          date: true,
          startTime: true,
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

      // In fixed mode: only count slots that match the configured time slots.
      // In free mode: derive the slot list from actual bookings so the matrix reflects reality.
      const allTimeSlots =
        config.slotMode === "fixed"
          ? timeSlots
          : Array.from(new Set(rawSlots.map((s) => s.startTime))).sort()

      const relevantSlots =
        config.slotMode === "fixed"
          ? rawSlots.filter((s) => timeSlots.includes(s.startTime))
          : rawSlots

      // Fast O(N) bucketing of slots by `${date}_${startTime}` to eliminate quadratic searching
      const slotBuckets = new Map<string, typeof relevantSlots>()
      const userMap = new Map<string, UserEntry>()

      for (const slot of relevantSlots) {
        const isoDate = (slot.date as Date).toISOString().slice(0, 10)
        const bucketKey = `${isoDate}_${slot.startTime}`
        const bucket = slotBuckets.get(bucketKey)
        if (bucket) {
          bucket.push(slot)
        } else {
          slotBuckets.set(bucketKey, [slot])
        }

        const { user, startTime } = slot
        if (user) {
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
          entry.totalSlots++
          if (!entry.byDate[isoDate]) entry.byDate[isoDate] = []
          entry.byDate[isoDate].push(startTime)
        }
      }

      const slotMatrix: SlotEntry[] = dates.flatMap((date) =>
        allTimeSlots.map((startTime) => {
          const matching = slotBuckets.get(`${date}_${startTime}`) ?? []
          return {
            date,
            startTime,
            count: matching.length,
            users: matching
              .filter((s) => Boolean(s.user))
              .map((s) => ({
                name: s.user.name,
                email: s.user.email,
                image: s.user.image,
                committee: s.user.committee,
              })),
          }
        })
      )

      const maxCount = slotMatrix.reduce((m, s) => Math.max(m, s.count), 0)

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
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      })
      const endLabel = new Date(
        config.endDate + "T00:00:00.000Z"
      ).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
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
      semesterAnalytics={semesterAnalytics}
      dateRangeLabel={dateRangeLabel}
      initialConfig={config}
      initialAdmins={[]}
    />
  )
}
