import { NextResponse } from "next/server";
import { getCommittees } from "@/lib/committees";

/**
 * GET /api/committees
 * Public endpoint returning the active list of committees.
 */
export async function GET() {
  try {
    const committees = await getCommittees();
    return NextResponse.json({ committees });
  } catch (error: unknown) {
    console.error("Failed to load committees:", error);
    return NextResponse.json({ committees: [] }, { status: 500 });
  }
}
