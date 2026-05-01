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
  // Run on every route EXCEPT:
  //   /auth               – the sign-in page itself
  //   /open-in-safari     – helper page for iOS in-app browser handoff
  //   /api/auth/**        – better-auth API handlers
  //   /_next/**           – Next.js internal assets
  //   /favicon.ico        – browser favicon request
  //   any path with a file extension (e.g. /logo.svg, /image.png)
  //     → public folder static files must never be gated
  matcher: [
    "/((?!auth|open-in-safari|api/auth|_next/static|_next/image|favicon\\.ico|.*\\.(?:svg|png|jpg|jpeg|gif|ico|webp|woff2?|ttf|eot|css|js)$).*)",
  ],
};
