import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getScheduleConfig } from "@/lib/schedule"

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim() ?? ""
  if (!isValidEmail(email)) {
    return NextResponse.json([])
  }

  const config = await getScheduleConfig()
  if (!config) {
    return NextResponse.json([])
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  })
  if (!user) {
    return NextResponse.json([])
  }

  const slots = await prisma.availability.findMany({
    where: {
      userId: user.id,
      date: { in: config.dates.map((d) => new Date(d)) },
      // In fixed mode, hide any old free-booking records that no longer
      // match the configured time slots after a mode switch.
      ...(config.slotMode === "fixed" && config.timeSlots.length > 0
        ? { startTime: { in: config.timeSlots } }
        : {}),
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
  const config = await getScheduleConfig()
  if (!config) {
    return NextResponse.json(
      { error: "No schedule configured" },
      { status: 400 }
    )
  }

  const body = (await request.json()) as {
    date: string
    slots?: string[]
    memberName?: string
    memberEmail?: string
    memberId?: string
    memberCommittee?: string
  }

  const memberEmail = body.memberEmail?.trim().toLowerCase()
  const memberName = body.memberName?.trim()
  const memberId = body.memberId?.trim()
  const memberCommittee = body.memberCommittee?.trim()

  if (!memberEmail) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  if (!memberEmail.endsWith("@nu.edu.eg")) {
    return NextResponse.json(
      { error: "Only @nu.edu.eg emails are allowed" },
      { status: 400 }
    )
  }

  const existingUser = await prisma.user.findUnique({
    where: { email: memberEmail },
  })

  const resolvedName = memberName || existingUser?.name
  const resolvedId = memberId || existingUser?.nuId
  const resolvedCommittee = memberCommittee || existingUser?.committee

  if (!resolvedName || !resolvedId || !resolvedCommittee) {
    return NextResponse.json(
      { error: "Name, email, ID, and committee are required" },
      { status: 400 }
    )
  }

  if (!/^\d{9}$/.test(resolvedId)) {
    return NextResponse.json(
      { error: "NU ID must be 9 digits" },
      { status: 400 }
    )
  }

  if (!config.dates.includes(body.date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 })
  }

  // In fixed mode, validate slots against configured time slots.
  // In free mode, accept any HH:mm format.
  const slots = Array.isArray(body.slots) ? body.slots : []
  let validSlots: string[]
  if (config.slotMode === "fixed") {
    validSlots = slots.filter((s) => config.timeSlots.includes(s))
  } else {
    const timeRegex = /^\d{2}:\d{2}$/
    validSlots = slots.filter((s) => timeRegex.test(s))
  }

  const date = new Date(body.date)
  const user = await prisma.user.upsert({
    where: { email: memberEmail },
    update: {
      name: resolvedName,
      nuId: resolvedId,
      committee: resolvedCommittee,
    },
    create: {
      id: crypto.randomUUID(),
      name: resolvedName,
      email: memberEmail,
      nuId: resolvedId,
      committee: resolvedCommittee,
      emailVerified: false,
    },
    select: { id: true },
  })

  await prisma.$transaction([
    prisma.availability.deleteMany({
      where: { userId: user.id, date },
    }),
    prisma.availability.createMany({
      data: validSlots.map((startTime) => ({
        userId: user.id,
        date,
        startTime,
      })),
    }),
  ])

  return NextResponse.json({ success: true })
}
