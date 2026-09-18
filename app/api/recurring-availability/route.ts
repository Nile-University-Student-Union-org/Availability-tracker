import { headers } from "next/headers"
import { revalidatePath } from "next/cache"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { prisma } from "@/lib/prisma"
import { getScheduleConfig } from "@/lib/schedule"

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const email =
      request.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? ""
    if (!isValidEmail(email)) {
      return NextResponse.json([])
    }

    const isUserAdmin = await isAdminEmail(session.user.email)
    if (!isUserAdmin && session.user.email.toLowerCase() !== email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const config = await getScheduleConfig()
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json([])
    }

    const slots = await prisma.recurringAvailability.findMany({
      where: {
        userId: user.id,
        // If fixed mode with time slots configured, filter matching slots
        ...(config && config.slotMode === "fixed" && config.timeSlots.length > 0
          ? { startTime: { in: config.timeSlots } }
          : {}),
      },
      select: { dayOfWeek: true, startTime: true },
      orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
    })

    return NextResponse.json(
      slots.map((s) => ({
        dayOfWeek: s.dayOfWeek,
        startTime: s.startTime,
      })),
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        },
      }
    )
  } catch (error: unknown) {
    console.error("Error in GET /api/recurring-availability:", error)
    return NextResponse.json(
      { error: "Failed to fetch recurring availability records" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // admin@nu.edu.eg cannot mark availability
    if (session.user.email === "admin@nu.edu.eg") {
      return NextResponse.json(
        { error: "Admin accounts cannot mark availability" },
        { status: 403 }
      )
    }

    const config = await getScheduleConfig()
    if (config && !config.weeklyScheduleActive) {
      return NextResponse.json(
        {
          error:
            "Semester Availability submissions are currently closed by the Student Union.",
        },
        { status: 403 }
      )
    }

    const body = (await request.json()) as {
      name?: string
      nuId?: string
      committee?: string
      slots: { dayOfWeek: number; startTime: string }[]
    }

    const userEmail = session.user.email.toLowerCase()
    const user = await prisma.user.findUnique({
      where: { email: userEmail },
      select: { id: true },
    })

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 })
    }

    // Update member profile fields if provided
    const updateData: { name?: string; nuId?: string; committee?: string } = {}
    if (body.name && body.name.trim().length > 0) {
      updateData.name = body.name.trim()
    }
    if (body.nuId && /^\d{9}$/.test(body.nuId.trim())) {
      updateData.nuId = body.nuId.trim()
    }
    if (body.committee && body.committee.trim().length > 0) {
      updateData.committee = body.committee.trim()
    }

    if (Object.keys(updateData).length > 0) {
      await prisma.user.update({
        where: { id: user.id },
        data: updateData,
      })
    }

    // Validate slots format
    const timeSlotRegex = /^\d{2}:\d{2}$/
    const validSlots = (body.slots ?? []).filter(
      (s) =>
        typeof s.dayOfWeek === "number" &&
        s.dayOfWeek >= 0 &&
        s.dayOfWeek <= 6 &&
        timeSlotRegex.test(s.startTime) &&
        (!config ||
          config.slotMode !== "fixed" ||
          config.timeSlots.length === 0 ||
          config.timeSlots.includes(s.startTime))
    )

    // Deduplicate slots by dayOfWeek-startTime
    const uniqueSlotsMap = new Map<string, { dayOfWeek: number; startTime: string }>()
    for (const slot of validSlots) {
      const key = `${slot.dayOfWeek}_${slot.startTime}`
      uniqueSlotsMap.set(key, slot)
    }
    const dedupedSlots = Array.from(uniqueSlotsMap.values())

    // Atomically replace the user's recurring availability records
    await prisma.$transaction(async (tx) => {
      await tx.recurringAvailability.deleteMany({
        where: { userId: user.id },
      })

      if (dedupedSlots.length > 0) {
        await tx.recurringAvailability.createMany({
          data: dedupedSlots.map((s) => ({
            userId: user.id,
            dayOfWeek: s.dayOfWeek,
            startTime: s.startTime,
          })),
        })
      }
    })

    revalidatePath("/weekly")
    revalidatePath("/admin")
    revalidatePath("/specific")

    return NextResponse.json({
      success: true,
      count: dedupedSlots.length,
    })
  } catch (error: unknown) {
    console.error("Error in POST /api/recurring-availability:", error)
    return NextResponse.json(
      { error: "Failed to save semester availability records" },
      { status: 500 }
    )
  }
}
