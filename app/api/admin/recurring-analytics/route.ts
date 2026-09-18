import { headers } from "next/headers"
import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { isAdminEmail } from "@/lib/admin"
import { getSemesterAnalytics } from "@/lib/semester-analytics"

export const dynamic = "force-dynamic"
export const revalidate = 0

export async function GET(request: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: await headers() })
    if (!session || !(await isAdminEmail(session.user.email))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    const committee = request.nextUrl.searchParams.get("committee") ?? null
    const analytics = await getSemesterAnalytics(committee)

    return NextResponse.json(analytics, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    })
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/recurring-analytics:", error)
    return NextResponse.json(
      { error: "Failed to load semester analytics" },
      { status: 500 }
    )
  }
}
