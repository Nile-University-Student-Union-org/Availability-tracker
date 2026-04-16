import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getScheduleConfig } from "@/lib/schedule";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getScheduleConfig();
  if (!config) {
    return NextResponse.json([]);
  }

  const slots = await prisma.availability.findMany({
    where: {
      userId: session.user.id,
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
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const config = await getScheduleConfig();
  if (!config) {
    return NextResponse.json(
      { error: "No schedule configured" },
      { status: 400 },
    );
  }

  const body = (await request.json()) as { date: string; slots: string[] };

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
  ]);

  return NextResponse.json({ success: true });
}
