import { NextResponse } from "next/server"
import { getScheduleConfig } from "@/lib/schedule"

export async function GET() {
  try {
    const config = await getScheduleConfig()

    if (!config) {
      return NextResponse.json(
        { error: "No schedule configured yet" },
        { status: 404 }
      )
    }

    return NextResponse.json(config, {
      headers: {
        "Cache-Control": "s-maxage=60, stale-while-revalidate=300",
      },
    })
  } catch (error: unknown) {
    console.error("Error in GET /api/schedule-config:", error)
    return NextResponse.json(
      { error: "Failed to load schedule configuration" },
      { status: 500 }
    )
  }
}
