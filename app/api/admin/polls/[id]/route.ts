import { headers } from "next/headers";
import { after, NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminEmail, isSuperAdmin, getSuperAdminEmails } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import {
  canSeeResults,
  canEditOrDeletePoll,
  editAudience,
} from "@/lib/poll-access";
import {
  validateWeeklySlots,
  sortSlots,
  parseDateSlots,
  type WeeklySlot,
} from "@/lib/weekly-slots";
import { getPollConfig } from "@/lib/schedule";
import { sendMail } from "@/lib/mail";
import { pollRequestEmail } from "@/lib/emails/poll-request";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function load(id: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !(await isAdminEmail(session.user.email))) return null;
  const [user, poll] = await Promise.all([
    prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true, committee: true },
    }),
    prisma.poll.findUnique({
      where: { id },
      include: {
        timeSlots: { orderBy: { startTime: "asc" } },
        weeklySlots: { orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }] },
        createdBy: { select: { name: true, email: true } },
      },
    }),
  ]);
  if (!user || !poll)
    return {
      session,
      user,
      poll: null,
      superAdmin: isSuperAdmin(session.user.email),
    };
  const superAdmin = isSuperAdmin(session.user.email);
  return canSeeResults(poll, user.id, user.committee, true, superAdmin)
    ? { session, user, poll, superAdmin }
    : { session, user, poll: null, superAdmin };
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await load(id);
  if (!ctx?.session)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!ctx.poll)
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  return NextResponse.json(
    { poll: ctx.poll, config: await getPollConfig(id) },
    {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    },
  );
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await load(id);
  if (!ctx?.session || !ctx.user)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!ctx.poll)
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  if (!canEditOrDeletePoll(ctx.poll, ctx.user.id, ctx.superAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const b = await request.json();
    const poll = ctx.poll;
    const nextName = typeof b.name === "string" ? b.name.trim() : poll.name;
    if (!nextName || nextName.length > 100)
      return NextResponse.json(
        { error: "Poll name is required (up to 100 characters)" },
        { status: 400 },
      );

    // Audience only changes when committees are sent; a rename alone keeps it
    let audience: ReturnType<typeof editAudience> | null = null;
    if (Array.isArray(b.committees)) {
      const chosen = Array.from(
        new Set<string>(
          (b.committees as unknown[]).filter(
            (x): x is string => typeof x === "string",
          ),
        ),
      );
      const found = await prisma.committee.findMany({
        where: { name: { in: chosen } },
        select: { name: true },
      });
      if (found.length !== chosen.length || !chosen.length) {
        return NextResponse.json(
          { error: "Choose valid committees" },
          { status: 400 },
        );
      }
      audience = editAudience(
        poll.committees,
        chosen,
        ctx.user.committee,
        ctx.superAdmin,
      );
    }
    const willBePending = audience?.requestStatus === "pending";

    const startDate =
      poll.type === "date" && b.startDate
        ? new Date(`${b.startDate}T00:00:00.000Z`)
        : poll.startDate;
    const endDate =
      poll.type === "date" && b.endDate
        ? new Date(`${b.endDate}T00:00:00.000Z`)
        : poll.endDate;
    if (
      poll.type === "date" &&
      (!startDate ||
        !endDate ||
        isNaN(startDate.getTime()) ||
        isNaN(endDate.getTime()) ||
        startDate > endDate)
    ) {
      return NextResponse.json(
        { error: "Invalid date range" },
        { status: 400 },
      );
    }

    const days: number[] = Array.isArray(b.weeklyDays)
      ? b.weeklyDays
      : poll.weeklyDays;
    const weekly: WeeklySlot[] = Array.isArray(b.weeklySlots)
      ? b.weeklySlots
      : poll.weeklySlots;
    if (poll.type === "weekly") {
      const error = validateWeeklySlots(days, weekly);
      if (error) return NextResponse.json({ error }, { status: 400 });
    }

    // Slots are only replaced when the editor sends them
    const parsedSlots = parseDateSlots(b.timeSlots, b.slotEnds);
    if (poll.type === "date" && b.timeSlots && "error" in parsedSlots) {
      return NextResponse.json({ error: parsedSlots.error }, { status: 400 });
    }
    const timeSlots = "slots" in parsedSlots ? parsedSlots.slots : [];

    const pendingCommittees =
      audience?.requestedCommittees ?? poll.requestedCommittees;

    await prisma.$transaction(async (tx) => {
      await tx.poll.update({
        where: { id },
        data: {
          name: nextName,
          active: typeof b.active === "boolean" ? b.active : poll.active,
          ...(audience
            ? {
                ...audience,
                rejectionReason: null,
                // A superadmin choosing committees turns an all-committees poll into a scoped one
                ...(ctx.superAdmin ? { allCommittees: false } : {}),
              }
            : {}),
          ...(poll.type === "date"
            ? { startDate, endDate, slotMode: b.slotMode ?? poll.slotMode }
            : { weeklyDays: days }),
        },
      });
      if (poll.type === "date" && b.timeSlots) {
        await tx.pollTimeSlot.deleteMany({ where: { pollId: id } });
        await tx.pollTimeSlot.createMany({
          data: timeSlots.map((slot) => ({ pollId: id, ...slot })),
        });
      }
      if (poll.type === "weekly" && b.weeklySlots) {
        await tx.pollWeeklySlot.deleteMany({ where: { pollId: id } });
        await tx.pollWeeklySlot.createMany({
          data: sortSlots(weekly).map((s) => ({ pollId: id, ...s })),
        });
      }
    });

    if (
      willBePending &&
      (poll.requestStatus !== "pending" ||
        pendingCommittees.some((c) => !poll.requestedCommittees.includes(c)))
    ) {
      const email = pollRequestEmail({
        kind:
          poll.requestStatus === "rejected"
            ? "resubmitted"
            : poll.committees.length
              ? "added"
              : "new",
        pollName: nextName,
        type: poll.type as "date" | "weekly",
        creatorName: ctx.session.user.name || "A committee head",
        creatorCommittee: ctx.user.committee,
        requested: pendingCommittees,
        live: audience?.committees ?? poll.committees,
        startDate: startDate?.toISOString() ?? null,
        endDate: endDate?.toISOString() ?? null,
        weeklyDays: days,
        slotCount:
          poll.type === "date"
            ? b.timeSlots
              ? timeSlots.length
              : poll.timeSlots.length
            : weekly.length,
        slotMode: (b.slotMode ?? poll.slotMode) as "fixed" | "free",
        reviewUrl: `${process.env.BETTER_AUTH_URL ?? ""}/admin?tab=requests`,
      });
      after(() =>
        sendMail({
          to: getSuperAdminEmails().filter(
            (e) => e !== process.env.ADMIN_EMAIL?.trim().toLowerCase(),
          ),
          ...email,
        }),
      );
    }

    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("PATCH /api/admin/polls/[id] failed:", e);
    return NextResponse.json(
      { error: "Could not save the poll. Please try again." },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const ctx = await load(id);
  if (!ctx?.session || !ctx.user)
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!ctx.poll)
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  if (!canEditOrDeletePoll(ctx.poll, ctx.user.id, ctx.superAdmin)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  await prisma.poll.delete({ where: { id } });
  return NextResponse.json({ success: true });
}
