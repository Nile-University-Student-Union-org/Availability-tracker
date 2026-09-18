import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "better-auth/crypto";

/**
 * GET /api/auth/reset-first-login?email=user@nu.edu.eg
 * Checks whether the specified account is flagged for forced password reset.
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email")?.trim().toLowerCase();

    if (!email) {
      return NextResponse.json({ mustResetPassword: false }, { status: 200 });
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { mustResetPassword: true },
    });

    return NextResponse.json({
      mustResetPassword: Boolean(user?.mustResetPassword),
    });
  } catch (error: unknown) {
    console.error("Error checking password reset status:", error);
    return NextResponse.json({ mustResetPassword: false }, { status: 200 });
  }
}

/**
 * POST /api/auth/reset-first-login
 * Sets a new password for an account where mustResetPassword is true.
 */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase();
    const newPassword = String(body.newPassword ?? "");
    const confirmPassword = String(body.confirmPassword ?? "");

    if (!email) {
      return NextResponse.json(
        { error: "Email address is required." },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true, name: true, mustResetPassword: true },
    });

    if (!user) {
      return NextResponse.json(
        { error: "Account not found." },
        { status: 404 },
      );
    }

    if (!user.mustResetPassword) {
      return NextResponse.json(
        {
          error:
            "This account is not flagged for a password reset. Please sign in normally.",
        },
        { status: 400 },
      );
    }

    if (!newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
        { status: 400 },
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "Passwords do not match." },
        { status: 400 },
      );
    }

    // Hash the new password with Better Auth's standard algorithm
    const hashedPassword = await hashPassword(newPassword);

    // Update the user's credential account
    const updatedAccount = await prisma.account.updateMany({
      where: {
        userId: user.id,
        providerId: "credential",
      },
      data: {
        password: hashedPassword,
      },
    });

    // If no credential account existed, create one
    if (updatedAccount.count === 0) {
      await prisma.account.create({
        data: {
          id: `acc_${user.id}_${Date.now()}`,
          accountId: email,
          providerId: "credential",
          userId: user.id,
          password: hashedPassword,
        },
      });
    }

    // Clear the reset flag
    await prisma.user.update({
      where: { id: user.id },
      data: { mustResetPassword: false },
    });

    return NextResponse.json({
      success: true,
      message: "Password has been reset successfully. You can now log in.",
    });
  } catch (error: unknown) {
    console.error("Failed to reset member password:", error);
    const message =
      error instanceof Error ? error.message : "Failed to reset password.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
