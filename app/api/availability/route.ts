import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import {
  TIME_SLOTS,
  WEEK_DATES,
  type TimeSlot,
  type WeekDate,
} from "@/components/calendar/constants"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const slots = await prisma.availability.findMany({
    where: {
      userId: session.user.id,
      date: { in: WEEK_DATES.map((d) => new Date(d)) },
    },
    select: { date: true, startTime: true },
  })

  return NextResponse.json(
    slots.map((s) => ({
      date: s.date.toISOString().slice(0, 10),
      startTime: s.startTime,
    }))
  )
}

export async function POST(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as { date: string; slots: string[] }

  if (!WEEK_DATES.includes(body.date as WeekDate)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 })
  }

  const validSlots = body.slots.filter((s) =>
    TIME_SLOTS.includes(s as TimeSlot)
  )

  const date = new Date(body.date)

  await prisma.$transaction([
    prisma.availability.deleteMany({
      where: { userId: session.user.id, date },
    }),
    prisma.availability.createMany({
      data: validSlots.map((startTime) => ({
        userId: session.user.id,
        date,
        startTime,
      })),
    }),
  ])

  return NextResponse.json({ success: true })
}
