import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const user = await prisma.user.findUnique({ where: { email: session.user.email.toLowerCase() }, select: { committee: true } });
  const polls = await prisma.poll.findMany({ where: { active: true, OR: [{ allCommittees: true }, ...(user?.committee ? [{ committees: { has: user.committee } }] : [])] }, select: { id: true, name: true, type: true, active: true }, orderBy: { createdAt: "desc" } });
  return NextResponse.json(polls, { headers: { "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0" } });
}
