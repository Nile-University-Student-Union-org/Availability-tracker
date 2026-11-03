import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { canSeePoll } from "@/lib/poll-access";
import { getPollConfig } from "@/lib/schedule";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session)
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await params;
  const [user, poll] = await Promise.all([
    prisma.user.findUnique({
      where: { email: session.user.email.toLowerCase() },
      select: { id: true, committee: true },
    }),
    getPollConfig(id),
  ]);
  if (!user || !poll || !canSeePoll(poll, user))
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  return NextResponse.json(
    {
      ...poll,
      title: poll.name,
      dateScheduleActive: poll.type === "date" && poll.active,
      weeklyScheduleActive: poll.type === "weekly" && poll.active,
      dateScheduleTitle: poll.name,
      weeklyScheduleTitle: poll.name,
    },
    {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    },
  );
}
