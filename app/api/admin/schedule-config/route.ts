import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

async function requireAdmin() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isAdminEmail(session.user.email)) {
    return null;
  }
  return session;
}

export async function PUT(request: NextRequest) {
  const session = await requireAdmin();
  if (!session) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await request.json()) as {
    startDate: string;
    endDate: string;
    slotMode: string;
    timeSlots: string[];
  };

  // Validate dates
  const start = new Date(body.startDate);
  const end = new Date(body.endDate);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  // Validate slot mode
  if (!["fixed", "free"].includes(body.slotMode)) {
    return NextResponse.json({ error: "Invalid slot mode" }, { status: 400 });
  }

  // Validate time slots format (HH:mm)
  const timeSlotRegex = /^\d{2}:\d{2}$/;
  const validSlots = (body.timeSlots ?? []).filter((s) =>
    timeSlotRegex.test(s),
  );

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
    });

    // Replace time slots
    await tx.timeSlotConfig.deleteMany({
      where: { scheduleConfigId: "default" },
    });

    if (validSlots.length > 0) {
      await tx.timeSlotConfig.createMany({
        data: validSlots.map((startTime) => ({
          scheduleConfigId: "default",
          startTime,
        })),
      });
    }
  });

  return NextResponse.json({ success: true });
}
