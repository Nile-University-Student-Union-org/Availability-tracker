import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";
import { mailerConfig } from "@/lib/mailer-oauth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

async function allowed() {
  const session = await auth.api.getSession({ headers: await headers() });
  return Boolean(session && isSuperAdmin(session.user.email));
}

export async function GET() {
  if (!(await allowed())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const credential = await prisma.mailerCredential.findUnique({
    where: { id: "graph" },
    select: { status: true, accountEmail: true, lastError: true },
  });
  return NextResponse.json(
    {
      configured: Boolean(mailerConfig()),
      sender: process.env.MAIL_SENDER ?? null,
      status: credential?.status ?? "disconnected",
      accountEmail: credential?.accountEmail ?? null,
      lastError: credential?.lastError ?? null,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE() {
  if (!(await allowed())) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  await prisma.mailerCredential.updateMany({
    where: { id: "graph" },
    data: { status: "disconnected", encryptedRefreshToken: null, lastError: null },
  });
  return NextResponse.json({ status: "disconnected" });
}
