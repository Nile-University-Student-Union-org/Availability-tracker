import { headers } from "next/headers";
import { after, NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { approveAudience, rejectAudience } from "@/lib/poll-access";
import { pollDecisionEmail } from "@/lib/emails/poll-request";
import { sendMail } from "@/lib/mail";
import type { PollType } from "@/lib/poll-display";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isSuperAdmin(session.user.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const body = await request.json();
  const poll = await prisma.poll.findUnique({
    where: { id },
    include: { createdBy: { select: { email: true } } },
  });
  if (!poll || poll.requestStatus !== "pending")
    return NextResponse.json(
      { error: "Pending request not found" },
      { status: 404 },
    );

  const reviewer = await prisma.user.findUnique({
    where: { email: session.user.email.toLowerCase() },
    select: { id: true },
  });

  let rejectionReason: string | null = null;
  if (body.action === "approve") {
    const audience = approveAudience(poll.committees, poll.requestedCommittees);
    await prisma.poll.update({
      where: { id },
      data: {
        ...audience,
        reviewedById: reviewer?.id,
        reviewedAt: new Date(),
        rejectionReason: null,
      },
    });
  } else if (body.action === "reject") {
    const reason = typeof body.reason === "string" ? body.reason : "";
    let rejection;
    try {
      rejection = rejectAudience(poll.requestedCommittees, reason);
    } catch (err) {
      return NextResponse.json(
        {
          error:
            err instanceof Error
              ? err.message
              : "Rejection reason is required and must be at most 500 characters",
        },
        { status: 400 },
      );
    }
    rejectionReason = rejection.rejectionReason;
    await prisma.poll.update({
      where: { id },
      data: {
        ...rejection,
        reviewedById: reviewer?.id,
        reviewedAt: new Date(),
      },
    });
  } else {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  // Polls from before requests existed have no creator to tell. Built inside after() so an email problem can't fail a decision that's already saved.
  const requesterEmail = poll.createdBy?.email;
  if (requesterEmail) {
    const decision = body.action === "approve" ? "approved" : "rejected";
    const reviewerName = session.user.name || "A HARAM admin";
    after(() =>
      sendMail({
        to: [requesterEmail],
        ...pollDecisionEmail({
          decision,
          pollName: poll.name,
          type: poll.type as PollType,
          reviewerName,
          requested: poll.requestedCommittees,
          rejectionReason,
          startDate: poll.startDate?.toISOString() ?? null,
          endDate: poll.endDate?.toISOString() ?? null,
          weeklyDays: poll.weeklyDays,
          pollUrl: `${process.env.BETTER_AUTH_URL ?? ""}/admin?tab=polls&poll=${encodeURIComponent(id)}${decision === "rejected" ? "&view=settings" : ""}`,
        }),
      }),
    );
  }
  return NextResponse.json({ success: true });
}
