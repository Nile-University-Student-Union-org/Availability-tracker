import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { prisma } from "@/lib/prisma"

export const dynamic = "force-dynamic"

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session || !(await isAdminEmail(session.user.email))) {
    return null
  }
  return session
}

export async function PUT(request: NextRequest) {
  try {
    const session = await requireAdmin()
    if (!session) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const body = (await request.json()) as {
      startDate: string
      endDate: string
      slotMode: string
      timeSlots: string[]
    }

    // Validate dates with UTC
    const start = new Date(body.startDate + "T00:00:00.000Z")
    const end = new Date(body.endDate + "T00:00:00.000Z")
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 })
    }

    // Validate slot mode
    if (!["fixed", "free"].includes(body.slotMode)) {
      return NextResponse.json({ error: "Invalid slot mode" }, { status: 400 })
    }

    // Validate time slots format (HH:mm)
    const timeSlotRegex = /^\d{2}:\d{2}$/
    const validSlots = (body.timeSlots ?? []).filter((s) => timeSlotRegex.test(s))

    // Upsert config + replace all time slots atomically
    await prisma.$transaction(async (tx) => {
      await tx.scheduleConfig.upsert({
        where: { id: "default" },
        create: {
          id: "default",
          startDate: start,
          endDate: end,
          slotMode: body.slotMode,
        },
        update: {
          startDate: start,
          endDate: end,
          slotMode: body.slotMode,
        },
      })

      // Replace time slots
      await tx.timeSlotConfig.deleteMany({
        where: { scheduleConfigId: "default" },
      })

      if (validSlots.length > 0) {
        await tx.timeSlotConfig.createMany({
          data: validSlots.map((startTime) => ({
            scheduleConfigId: "default",
            startTime,
          })),
        })

        // In fixed mode, prune any previously submitted availability records
        // that were marked for time slots that the admin has now deleted.
        if (body.slotMode === "fixed") {
          await tx.availability.deleteMany({
            where: {
              startTime: { notIn: validSlots },
            },
          })
        }
      }

      // Also clean up any availability records that fall outside the new date range
      await tx.availability.deleteMany({
        where: {
          OR: [{ date: { lt: start } }, { date: { gt: end } }],
        },
      })
    })

    // Immediately purge Next.js server-side cached routes
    revalidatePath("/admin")
    revalidatePath("/")
    revalidatePath("/api/schedule-config")

    return NextResponse.json({ success: true })
  } catch (error: unknown) {
    console.error("Error in PUT /api/admin/schedule-config:", error)
    const message =
      error instanceof Error ? error.message : "Failed to update schedule config"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
