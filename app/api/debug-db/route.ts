import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const dbInfo = await prisma.$queryRaw`SELECT current_database(), current_schema();`;
    const tables = await prisma.$queryRaw`SELECT tablename FROM pg_catalog.pg_tables WHERE schemaname = 'public';`;
    
    return NextResponse.json({
      success: true,
      info: dbInfo,
      tables: tables
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const stack = error instanceof Error ? error.stack : undefined;

    return NextResponse.json({
      success: false,
      error: message,
      stack,
    }, { status: 500 });
  }
}
