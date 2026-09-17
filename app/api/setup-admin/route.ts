import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const secret = searchParams.get("secret")
  const expectedSecret =
    process.env.ADMIN_SETUP_SECRET || process.env.BETTER_AUTH_SECRET

  const adminEmail = process.env.ADMIN_EMAIL || "admin@nu.edu.eg"
  const adminPassword = process.env.ADMIN_PASSWORD || "***REMOVED***"

  // In production, prevent random external users from wiping the existing admin account
  if (process.env.NODE_ENV === "production" && secret !== expectedSecret) {
    const existing = await prisma.user.findUnique({
      where: { email: adminEmail },
    })
    if (existing) {
      return NextResponse.json(
        {
          error:
            "Admin is already initialized. Provide ?secret=<BETTER_AUTH_SECRET> to reset in production.",
        },
        { status: 403 }
      )
    }
  }

  try {
    // Force reset: delete existing user if they exist to ensure new password is applied
    await prisma.user.deleteMany({
      where: { email: adminEmail },
    })

    await auth.api.signUpEmail({
      body: {
        email: adminEmail,
        password: adminPassword,
        name: "Admin",
      },
      headers: await headers(),
    })

    return NextResponse.json({
      message: "Admin user created/reset successfully",
      email: adminEmail,
    })
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to setup admin" },
      { status: 500 }
    )
  }
}
