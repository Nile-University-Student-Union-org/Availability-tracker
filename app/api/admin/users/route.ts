import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import {
  isAdminEmail,
  getAllAdminUsers,
  grantAdminAccess,
  revokeAdminAccess,
} from "@/lib/admin"

export async function GET() {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const admins = await getAllAdminUsers()
    return NextResponse.json({ admins })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to load admins" },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase()

    if (!email || !email.endsWith("@nu.edu.eg")) {
      return NextResponse.json(
        { error: "A valid @nu.edu.eg email is required" },
        { status: 400 }
      )
    }

    const result = await grantAdminAccess(email, session.user.email)
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ message: result.message, email })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to grant admin access" },
      { status: 500 }
    )
  }
}

export async function DELETE(req: Request) {
  const session = await auth.api.getSession({ headers: await headers() })
  if (!session?.user?.email || !(await isAdminEmail(session.user.email))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const email = String(body.email ?? "")
      .trim()
      .toLowerCase()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    if (email === session.user.email.toLowerCase()) {
      return NextResponse.json(
        { error: "You cannot revoke your own admin access" },
        { status: 400 }
      )
    }

    const result = await revokeAdminAccess(email)
    if (!result.success) {
      return NextResponse.json({ error: result.message }, { status: 400 })
    }

    return NextResponse.json({ message: result.message, email })
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Failed to revoke admin access" },
      { status: 500 }
    )
  }
}
