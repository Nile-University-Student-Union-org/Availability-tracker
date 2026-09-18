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

export async function PUT(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
  }

  try {
    const body = await req.json();
    const id = String(body.id ?? "").trim();
    const name = String(body.name ?? "").trim();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const nuId =
      body.nuId !== undefined &&
      body.nuId !== null &&
      String(body.nuId).trim() !== ""
        ? String(body.nuId).trim()
        : null;
    const committee =
      body.committee !== undefined &&
      body.committee !== null &&
      String(body.committee).trim() !== "" &&
      String(body.committee).trim().toLowerCase() !== "none"
        ? String(body.committee).trim()
        : null;

    if (!id) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 },
      );
    }

    if (!name || name.length < 2) {
      return NextResponse.json(
        { error: "Member name must be at least 2 characters" },
        { status: 400 },
      );
    }

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { error: "A valid university email is required" },
        { status: 400 },
      );
    }

    if (!email.endsWith("@nu.edu.eg")) {
      return NextResponse.json(
        { error: "Only @nu.edu.eg email addresses are permitted" },
        { status: 400 },
      );
    }

    if (nuId && !/^\d{9}$/.test(nuId)) {
      return NextResponse.json(
        { error: "Student ID must be exactly 9 digits (e.g. 202xxxxxx)" },
        { status: 400 },
      );
    }

    const existingUser = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        name: true,
        email: true,
        nuId: true,
        committee: true,
        role: true,
      },
    });

    if (!existingUser) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const oldEmail = existingUser.email.toLowerCase();

    // Check email uniqueness if email is changed
    if (email !== oldEmail) {
      // Prevent changing root admin email to something else
      if (oldEmail === "admin@nu.edu.eg") {
        return NextResponse.json(
          { error: "Primary system administrator email cannot be modified" },
          { status: 400 },
        );
      }

      const emailConflict = await prisma.user.findFirst({
        where: {
          email,
          NOT: { id },
        },
        select: { id: true, name: true },
      });

      if (emailConflict) {
        return NextResponse.json(
          {
            error: `The email "${email}" is already registered to another member (${emailConflict.name}).`,
          },
          { status: 400 },
        );
      }

      // If user is in AdminEmail table, update their admin authorization email
      await prisma.adminEmail.updateMany({
        where: { email: oldEmail },
        data: { email },
      });

      // Update Better Auth account credentials accountId if it matched old email
      await prisma.account.updateMany({
        where: { userId: id, accountId: oldEmail },
        data: { accountId: email },
      });
    }

    // Check nuId uniqueness if provided and changed
    if (nuId && nuId !== existingUser.nuId) {
      const nuIdConflict = await prisma.user.findFirst({
        where: {
          nuId,
          NOT: { id },
        },
        select: { id: true, name: true },
      });

      if (nuIdConflict) {
        return NextResponse.json(
          {
            error: `Student ID "${nuId}" is already assigned to ${nuIdConflict.name}.`,
          },
          { status: 400 },
        );
      }
    }

    const updatedMember = await prisma.user.update({
      where: { id },
      data: {
        name,
        email,
        nuId,
        committee,
      },
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
    });

    return NextResponse.json({
      success: true,
      message: `Member "${updatedMember.name}" updated successfully.`,
      member: updatedMember,
    });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to update member";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
