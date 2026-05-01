import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { NextResponse } from "next/server";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not allowed in production" }, { status: 403 });
  }

  try {
    const existing = await auth.api.getSession({ headers: await headers() });
    
    await auth.api.signUpEmail({
      body: {
        email: "admin@nu.edu.eg",
        password: "NU#SU#Tracker#2026!",
        name: "Admin",
      },
      headers: await headers(),
    });

    return NextResponse.json({ message: "Admin user created successfully", email: "admin@nu.edu.eg" });
  } catch (error: any) {
    if (error.message?.includes("already exists")) {
      return NextResponse.json({ message: "Admin user already exists" });
    }
    return NextResponse.json({ error: error.message || "Failed to create admin" }, { status: 500 });
  }
}
