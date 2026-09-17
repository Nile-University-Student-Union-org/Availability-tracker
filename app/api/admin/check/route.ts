import { headers } from "next/headers"
import { NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session?.user?.email) {
      return NextResponse.json({ isAdmin: false })
    }

    const isAdmin = await isAdminEmail(session.user.email)
    return NextResponse.json({ isAdmin })
  } catch (error) {
    return NextResponse.json({ isAdmin: false })
  }
}
