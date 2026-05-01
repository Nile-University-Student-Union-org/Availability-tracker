import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";
import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        // Forward the browser's cookies so better-auth can read the session token
        cookie: request.headers.get("cookie") ?? "",
      },
    },
  );

  // Unauthenticated — send to sign-in page
  if (!session) {
    return NextResponse.redirect(new URL("/auth", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Public member flow no longer requires login.
  // Keep protection only for admin pages and admin APIs.
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
