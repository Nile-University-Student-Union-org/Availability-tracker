import { auth } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { headers } from "next/headers"
import { NextResponse } from "next/server"

export async function GET() {
  /*
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }
  */

  try {
    const adminEmail = process.env.ADMIN_EMAIL || "admin@nu.edu.eg"
    const adminPassword = process.env.ADMIN_PASSWORD || "***REMOVED***"

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
