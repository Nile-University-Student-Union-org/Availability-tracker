import { NextResponse } from "next/server";
import { getScheduleConfig } from "@/lib/schedule";

export async function GET() {
  const config = await getScheduleConfig();

  if (!config) {
    return NextResponse.json(
      { error: "No schedule configured yet" },
      { status: 404 },
    );
  }

  return NextResponse.json(config);
}
