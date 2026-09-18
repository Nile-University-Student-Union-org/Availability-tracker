import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { isAdminEmail } from "@/lib/admin";

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const members = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        nuId: true,
        committee: true,
        role: true,
        mustResetPassword: true,
        createdAt: true,
        image: true,
        _count: {
          select: {
            availabilities: true,
            recurringAvailabilities: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({ members });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to fetch members";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = String(body.id ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 },
      );
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const currentEmail = session.user.email.toLowerCase();
    const targetEmail = targetUser.email.toLowerCase();

    // Prevent deleting self
    if (targetUser.id === session.user.id || targetEmail === currentEmail) {
      return NextResponse.json(
        { error: "You cannot delete your own account" },
        { status: 400 },
      );
    }

    // Protect primary root admin
    if (targetEmail === "admin@nu.edu.eg") {
      return NextResponse.json(
        { error: "The primary system administrator cannot be deleted" },
        { status: 400 },
      );
    }

    // Remove from AdminEmail table if present
    await prisma.adminEmail.deleteMany({
      where: { email: targetEmail },
    });

    // Delete user (cascades to sessions, accounts, and availabilities)
    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `Member "${targetUser.name}" (${targetEmail}) has been deleted.`,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to delete member";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = String(body.id ?? "").trim();
    const action = String(body.action ?? "").trim();

    if (!id) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 },
      );
    }

    if (action !== "reset-password") {
      return NextResponse.json({ error: "Invalid action" }, { status: 400 });
    }

    const targetUser = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, email: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Flag user for forced password reset upon next login
    await prisma.user.update({
      where: { id },
      data: { mustResetPassword: true },
    });

    // Immediately revoke all existing sessions so they are forced to log in
    await prisma.session.deleteMany({
      where: { userId: id },
    });

    return NextResponse.json({
      success: true,
      message: `Password reset triggered for ${targetUser.name}. They will be required to set a new password on their next login.`,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to reset password";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
