import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  /*
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }
  */

  try {
    // Force reset: delete existing user if they exist to ensure new password is applied
    await prisma.user.deleteMany({
      where: { email: "admin@nu.edu.eg" }
    });

    await auth.api.signUpEmail({
      body: {
        email: "admin@nu.edu.eg",
        password: "NU#SU#Tracker#2026!",
        name: "Admin",
      },
      headers: await headers(),
    });

    return NextResponse.json({ message: "Admin user created/reset successfully", email: "admin@nu.edu.eg" });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || "Failed to setup admin" }, { status: 500 });
  }
}
