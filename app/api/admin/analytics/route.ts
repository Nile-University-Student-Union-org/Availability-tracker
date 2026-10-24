import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminEmail } from "@/lib/admin";
import { getDateAnalytics } from "@/lib/date-analytics";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session || !(await isAdminEmail(session.user.email))) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const analytics = await getDateAnalytics();

    return NextResponse.json(analytics, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/admin/analytics:", error);
    return NextResponse.json(
      { error: "Failed to load date analytics" },
      { status: 500 },
    );
  }
}
