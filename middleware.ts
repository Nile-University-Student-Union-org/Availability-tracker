import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
      },
    },
  );

  if (!session) {
    const url = new URL("/auth", request.url);
    url.searchParams.set("callbackUrl", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/api/admin/:path*"],
};
