import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminEmail, isSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { canSeeResults } from "@/lib/poll-access";
import { getSemesterAnalytics } from "@/lib/semester-analytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !(await isAdminEmail(session.user.email))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const committee = request.nextUrl.searchParams.get("committee") ?? null;
    const pollId =
      request.nextUrl.searchParams.get("pollId") ?? "legacy-weekly";

    const [user, poll] = await Promise.all([
      prisma.user.findUnique({
        where: { email: session.user.email.toLowerCase() },
        select: { id: true, committee: true },
      }),
      prisma.poll.findUnique({
        where: { id: pollId },
        select: {
          committees: true,
          requestedCommittees: true,
          allCommittees: true,
          createdById: true,
        },
      }),
    ]);
    if (
      !user ||
      !poll ||
      !canSeeResults(
        poll,
        user.id,
        user.committee,
        true,
        isSuperAdmin(session.user.email),
      )
    )
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const analytics = await getSemesterAnalytics(committee, pollId);

    return NextResponse.json(analytics, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
  } catch (error: unknown) {
    console.error("GET /api/admin/recurring-analytics failed:", error);
    return NextResponse.json(
      { error: "Failed to load semester analytics" },
      { status: 500 },
    );
  }
}
