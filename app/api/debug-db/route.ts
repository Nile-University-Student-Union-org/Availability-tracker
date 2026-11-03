import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "Debug endpoint disabled in production" },
      { status: 404 },
    );
  }
  try {
    const dbInfo =
      await prisma.$queryRaw`SELECT current_database(), current_schema();`;
    const tables =
      await prisma.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';`;

    return NextResponse.json({
      success: true,
      info: dbInfo,
      tables: tables,
    });
  } catch (error: unknown) {
    console.error("GET /api/debug-db failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Database check failed",
      },
      { status: 500 },
    );
  }
}
