import { betterFetch } from "@better-fetch/fetch";
import type { Session } from "better-auth/types";
import { NextRequest, NextResponse } from "next/server";

const ALLOWED_ORIGINS = [
  "https://nusu-availability-tracker.vercel.app",
  "https://availability-tracker.vercel.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
];

function getCorsHeaders(origin: string | null, requestOrigin: string) {
  const isAllowed =
    origin &&
    (ALLOWED_ORIGINS.includes(origin) ||
      origin.endsWith(".vercel.app") ||
      origin === requestOrigin);

  const allowedOrigin = isAllowed
    ? origin
    : "https://nusu-availability-tracker.vercel.app";

  return {
    "Access-Control-Allow-Origin": allowedOrigin,
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
    "Access-Control-Allow-Headers":
      "Content-Type, Authorization, X-Requested-With, Accept, X-CSRF-Token",
    "Access-Control-Allow-Credentials": "true",
    "Access-Control-Max-Age": "86400",
  };
}

export async function middleware(request: NextRequest) {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin, request.nextUrl.origin);

  // Handle preflight OPTIONS requests immediately
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Admin route protection (except public check)
  if (
    request.nextUrl.pathname.startsWith("/api/admin") &&
    request.nextUrl.pathname !== "/api/admin/check"
  ) {
    try {
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
        return NextResponse.json(
          { error: "Unauthorized" },
          {
            status: 401,
            headers: corsHeaders,
          },
        );
      }
    } catch (err) {
      console.error("Middleware session verification error:", err);
      // Allow request to proceed to the route handler which validates session server-side with direct DB access
    }
  }

  const response = NextResponse.next();
  for (const [key, value] of Object.entries(corsHeaders)) {
    response.headers.set(key, value);
  }

  return response;
}

export const config = {
  matcher: ["/api/:path*"],
};
