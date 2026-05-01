import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getScheduleConfig } from "@/lib/schedule";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email")?.trim() ?? "";
  if (!isValidEmail(email)) {
    return NextResponse.json([]);
  }

  const config = await getScheduleConfig();
  if (!config) {
    return NextResponse.json([]);
  }

  const user = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (!user) {
    return NextResponse.json([]);
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
  });

  return NextResponse.json(
    slots.map((s) => ({
      date: s.date.toISOString().slice(0, 10),
      startTime: s.startTime,
    })),
  );
}

export async function POST(request: NextRequest) {
  const config = await getScheduleConfig();
  if (!config) {
    return NextResponse.json(
      { error: "No schedule configured" },
      { status: 400 },
    );
  }

  const body = (await request.json()) as {
    date: string;
    slots: string[];
    memberName: string;
    memberEmail: string;
  };

  const memberEmail = body.memberEmail?.trim().toLowerCase();
  const memberName = body.memberName?.trim();
  if (!isValidEmail(memberEmail) || !memberName) {
    return NextResponse.json(
      { error: "Name and valid email are required" },
      { status: 400 },
    );
  }

  if (!config.dates.includes(body.date)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  // In fixed mode, validate slots against configured time slots.
  // In free mode, accept any HH:mm format.
  let validSlots: string[];
  if (config.slotMode === "fixed") {
    validSlots = body.slots.filter((s) => config.timeSlots.includes(s));
  } else {
    const timeRegex = /^\d{2}:\d{2}$/;
    validSlots = body.slots.filter((s) => timeRegex.test(s));
  }

  const date = new Date(body.date);
  const user = await prisma.user.upsert({
    where: { email: memberEmail },
    update: { name: memberName },
    create: {
      id: crypto.randomUUID(),
      name: memberName,
      email: memberEmail,
      emailVerified: false,
    },
    select: { id: true },
  });

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
  ]);

  return NextResponse.json({ success: true });
}
