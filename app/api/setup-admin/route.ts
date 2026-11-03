import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  // In production, return 404 unless a ?token= query param equals SETUP_ADMIN_TOKEN (and that env var is set)
  if (process.env.NODE_ENV === "production") {
    const token = searchParams.get("token");
    const expectedToken = process.env.SETUP_ADMIN_TOKEN;
    if (!expectedToken || !token || token !== expectedToken) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  }

  const adminEmail = process.env.ADMIN_EMAIL || "admin@nu.edu.eg";
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD environment variable is not configured" },
      { status: 500 },
    );
  }

  try {
    // Force reset: delete existing user if they exist to ensure new password is applied
    await prisma.user.deleteMany({
      where: { email: adminEmail },
    });

    await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: "Admin",
      },
      headers: await headers(),
    });

    return NextResponse.json({
      message: "Admin user created/reset successfully",
      email: adminEmail,
    });
  } catch (error: unknown) {
    console.error("GET /api/setup-admin failed:", error);
    return NextResponse.json({ error: "Failed to setup admin" }, { status: 500 });
  }
}
