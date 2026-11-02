import { headers } from "next/headers";
import { after, NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminEmail, isSuperAdmin, getSuperAdminEmails } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { createAudience, canCreatePoll } from "@/lib/poll-access";
import { validateWeeklySlots, sortSlots, parseDateSlots, type WeeklySlot } from "@/lib/weekly-slots";
import { escapeHtml, sendMail } from "@/lib/mail";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function context() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !(await isAdminEmail(session.user.email))) return null;
  const user = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true, committee: true },
  });
  return user ? { session, user, superAdmin: isSuperAdmin(session.user.email) } : null;
}

export async function GET() {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const whereClause = ctx.superAdmin
    ? {}
    : {
        OR: [
          { createdById: ctx.user.id },
          { allCommittees: true },
          ...(ctx.user.committee ? [{ committees: { has: ctx.user.committee } }] : []),
        ],
      };

  const polls = await prisma.poll.findMany({
    where: whereClause,
    include: {
      createdBy: {
        select: { name: true, email: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(
    { polls },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    },
  );
}

export async function POST(request: NextRequest) {
  const ctx = await context();
  if (!ctx) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const permission = canCreatePoll(true, ctx.superAdmin, ctx.user.committee);
  if (permission.error) return NextResponse.json({ error: permission.error }, { status: 400 });

  try {
    const b = await request.json();
    if (!permission.allowed || !["date", "weekly"].includes(b.type) || typeof b.name !== "string" || !b.name.trim() || b.name.trim().length > 100) {
      return NextResponse.json({ error: "Name (up to 100 characters) and poll type are required" }, { status: 400 });
    }

    const committees: string[] = Array.isArray(b.committees)
      ? Array.from(new Set<string>((b.committees as unknown[]).filter((x): x is string => typeof x === "string")))
      : [];
    if (!committees.length) return NextResponse.json({ error: "Choose at least one committee" }, { status: 400 });

    const exists = await prisma.committee.findMany({
      where: { name: { in: committees } },
      select: { name: true },
    });
    if (exists.length !== committees.length) {
      return NextResponse.json({ error: "Choose valid committees" }, { status: 400 });
    }

    const date = b.type === "date";
    const start = date && typeof b.startDate === "string" ? new Date(`${b.startDate}T00:00:00.000Z`) : null;
    const end = date && typeof b.endDate === "string" ? new Date(`${b.endDate}T00:00:00.000Z`) : null;
    if (date && (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime()) || start > end)) {
      return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    }
    if (date && !["fixed", "free"].includes(b.slotMode)) {
      return NextResponse.json({ error: "Invalid slot mode" }, { status: 400 });
    }

    const weeklyDays: number[] = b.weeklyDays;
    const weeklySlots: WeeklySlot[] = b.weeklySlots;
    if (!date && (!Array.isArray(weeklyDays) || !Array.isArray(weeklySlots) || validateWeeklySlots(weeklyDays, weeklySlots))) {
      return NextResponse.json(
        { error: validateWeeklySlots(weeklyDays, weeklySlots) ?? "Provide weekly days and slots" },
        { status: 400 },
      );
    }

    const audience = createAudience(ctx.user.committee, committees, ctx.superAdmin);
    const parsedSlots = parseDateSlots(b.timeSlots, b.slotEnds);
    if (date && "error" in parsedSlots) {
      return NextResponse.json({ error: parsedSlots.error }, { status: 400 });
    }
    const timeSlots = "slots" in parsedSlots ? parsedSlots.slots : [];

    const poll = await prisma.poll.create({
      data: {
        name: b.name.trim(),
        type: b.type,
        active: b.active ?? true,
        createdById: ctx.user.id,
        ...audience,
        ...(date ? { startDate: start, endDate: end, slotMode: b.slotMode } : { weeklyDays }),
        timeSlots: {
          create: date && b.slotMode === "fixed" ? timeSlots : [],
        },
        weeklySlots: {
          create: date ? [] : sortSlots(weeklySlots),
        },
      },
    });

    if (poll.requestStatus === "pending") {
      const creator = await prisma.user.findUnique({
        where: { id: ctx.user.id },
        select: { name: true, committee: true },
      });
      const esc = escapeHtml;
      after(() => sendMail({
        to: getSuperAdminEmails().filter((e) => e !== process.env.ADMIN_EMAIL?.trim().toLowerCase()),
        subject: `Poll approval request: ${poll.name}`,
        html: `<p>${esc(creator?.name ?? "Unknown creator")} (${esc(creator?.committee ?? "No committee")}) requested committees: ${esc(committees.join(", "))}.</p><p>Type: ${esc(poll.type)}</p><p><a href="${esc(process.env.BETTER_AUTH_URL ?? "")}/admin?tab=requests">Review request</a></p>`,
      }));
    }

    return NextResponse.json({ poll }, { status: 201 });
  } catch (e) {
    console.error("POST /api/admin/polls failed:", e);
    return NextResponse.json({ error: "Could not create the poll. Please try again." }, { status: 500 });
  }
}
