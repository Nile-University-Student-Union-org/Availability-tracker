import { NextResponse } from "next/server";
import { getScheduleConfig } from "@/lib/schedule";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const config = await getScheduleConfig();

    if (!config) {
      return NextResponse.json(
        { error: "No schedule configured yet" },
        { status: 404 },
      );
    }

    return NextResponse.json(config, {
      headers: {
        "Cache-Control":
          "no-store, no-cache, must-revalidate, proxy-revalidate, max-age=0",
        "CDN-Cache-Control": "no-store",
        "Vercel-CDN-Cache-Control": "no-store",
      },
    });
  } catch (error: unknown) {
    console.error("Error in GET /api/schedule-config:", error);
    return NextResponse.json(
      { error: "Failed to load schedule configuration" },
      { status: 500 },
    );
  }
}
