import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { getScheduleConfig } from "@/lib/schedule";

function isValidEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email =
      request.nextUrl.searchParams.get("email")?.trim().toLowerCase() ?? "";
    if (!isValidEmail(email)) {
      return NextResponse.json([]);
    }

    const isUserAdmin = await isAdminEmail(session.user.email);
    if (!isUserAdmin && session.user.email.toLowerCase() !== email) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
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

    const targetDates = config.dates.map((d) => new Date(d + "T00:00:00.000Z"));

    const slots = await prisma.availability.findMany({
      where: {
        userId: user.id,
        date: { in: targetDates },
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
      {
        headers: {
          "Cache-Control":
            "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        },
      },
    );
  } catch (error: unknown) {
    console.error("Error in GET /api/availability:", error);
    return NextResponse.json(
      { error: "Failed to fetch availability records" },
      { status: 500 },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // admin@nu.edu.eg cannot mark availability
    if (session.user.email === "admin@nu.edu.eg") {
      return NextResponse.json(
        { error: "Admin accounts cannot mark availability" },
        { status: 403 },
      );
    }

    const config = await getScheduleConfig();
    if (!config) {
      return NextResponse.json(
        { error: "No schedule configured" },
        { status: 400 },
      );
    }

    if (!config.dateScheduleActive) {
      return NextResponse.json(
        {
          error:
            "Specific Date availability submissions are currently closed by the Student Union.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as {
      date?: string;
      slots?: string[];
      updates?: Array<{ date: string; slots?: string[] }>;
      memberName?: string;
      memberEmail?: string;
      memberId?: string;
      memberCommittee?: string;
    };

    const memberEmail = (body.memberEmail || session.user.email)
      ?.trim()
      .toLowerCase();
    const memberName = body.memberName?.trim();
    const memberId = body.memberId?.trim();
    const memberCommittee = body.memberCommittee?.trim();

    if (!memberEmail) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    if (!memberEmail.endsWith("@nu.edu.eg")) {
      return NextResponse.json(
        { error: "Only @nu.edu.eg emails are allowed" },
        { status: 400 },
      );
    }

    const isUserAdmin = await isAdminEmail(session.user.email);
    if (!isUserAdmin && session.user.email.toLowerCase() !== memberEmail) {
      return NextResponse.json(
        {
          error:
            "Forbidden: You can only submit availability for your own account",
        },
        { status: 403 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { email: memberEmail },
    });

    const resolvedName = memberName || existingUser?.name;
    const resolvedId = memberId || existingUser?.nuId;
    const resolvedCommittee = memberCommittee || existingUser?.committee;

    if (!resolvedName || !resolvedId || !resolvedCommittee) {
      return NextResponse.json(
        { error: "Name, email, ID, and committee are required" },
        { status: 400 },
      );
    }

    if (!/^\d{9}$/.test(resolvedId)) {
      return NextResponse.json(
        { error: "NU ID must be 9 digits" },
        { status: 400 },
      );
    }

    const rawUpdates =
      Array.isArray(body.updates) && body.updates.length > 0
        ? body.updates
        : body.date
          ? [{ date: body.date, slots: body.slots ?? [] }]
          : [];

    if (rawUpdates.length === 0) {
      return NextResponse.json(
        { error: "No date updates provided" },
        { status: 400 },
      );
    }

    // Validate dates and sanitize slots
    const validatedUpdates: Array<{ date: Date; validSlots: string[] }> = [];
    const timeRegex = /^\d{2}:\d{2}$/;

    for (const update of rawUpdates) {
      if (!config.dates.includes(update.date)) {
        return NextResponse.json(
          { error: `Invalid date: ${update.date}` },
          { status: 400 },
        );
      }

      const slots = Array.isArray(update.slots) ? update.slots : [];
      let validSlots: string[];
      if (config.slotMode === "fixed") {
        validSlots = slots.filter((s) => config.timeSlots.includes(s));
      } else {
        validSlots = slots.filter((s) => timeRegex.test(s));
      }

      validatedUpdates.push({
        date: new Date(update.date + "T00:00:00.000Z"),
        validSlots,
      });
    }

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
    });

    const transactionOps = [];
    for (const item of validatedUpdates) {
      transactionOps.push(
        prisma.availability.deleteMany({
          where: { userId: user.id, date: item.date },
        }),
      );
      if (item.validSlots.length > 0) {
        transactionOps.push(
          prisma.availability.createMany({
            data: item.validSlots.map((startTime) => ({
              userId: user.id,
              date: item.date,
              startTime,
            })),
          }),
        );
      }
    }

    await prisma.$transaction(transactionOps);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    console.error("Error in POST /api/availability:", error);
    const message =
      error instanceof Error ? error.message : "Failed to save availability";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
