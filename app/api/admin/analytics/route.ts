import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminEmail, isSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { canSeeResults } from "@/lib/poll-access";
import { getDateAnalytics } from "@/lib/date-analytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: Request) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !(await isAdminEmail(session.user.email))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const pollId = new URL(request.url).searchParams.get("pollId") ?? "legacy-date";
    const [user, poll] = await Promise.all([
      prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() }, select: { id: true, committee: true } }),
      prisma.poll.findUnique({ where: { id: pollId }, select: { id: true, committees: true, requestedCommittees: true, allCommittees: true, createdById: true } }),
    ]);
    if (!user || !poll || !canSeeResults(poll, user.id, user.committee, true, isSuperAdmin(session.user.email))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const analytics = await getDateAnalytics(pollId);

    return NextResponse.json(analytics, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/analytics:", error);
    return NextResponse.json(
      { error: "Failed to load date analytics" },
      { status: 500 },
    );
  }
}
