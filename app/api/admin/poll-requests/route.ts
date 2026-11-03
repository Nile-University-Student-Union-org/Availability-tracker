import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";
export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isSuperAdmin(session.user.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const polls = await prisma.poll.findMany({
    where: { requestStatus: "pending" },
    include: {
      createdBy: { select: { name: true, email: true, committee: true } },
    },
    orderBy: { updatedAt: "asc" },
  });
  return NextResponse.json(
    { count: polls.length, polls },
    {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    },
  );
}
