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
  const adminPassword = process.env.ADMIN_PASSWORD

  if (!adminPassword) {
    return NextResponse.json(
      { error: "ADMIN_PASSWORD environment variable is not configured" },
      { status: 500 }
    )
  }

  // In production, require an explicit, matching secret before allowing admin setup/reset
  if (process.env.NODE_ENV === "production") {
    if (!expectedSecret || secret !== expectedSecret) {
      return NextResponse.json(
        {
          error:
            "Unauthorized. Provide ?secret=<ADMIN_SETUP_SECRET> to manage admin in production.",
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
