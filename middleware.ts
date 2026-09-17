import { betterFetch } from "@better-fetch/fetch"
import type { Session } from "better-auth/types"
import { NextRequest, NextResponse } from "next/server"

export async function middleware(request: NextRequest) {
  // Allow public check endpoint to resolve session internally and return { isAdmin: boolean }
  if (request.nextUrl.pathname === "/api/admin/check") {
    return NextResponse.next()
  }

  const { data: session } = await betterFetch<Session>(
    "/api/auth/get-session",
    {
      baseURL: request.nextUrl.origin,
      headers: {
        ...Object.fromEntries(request.headers.entries()),
      },
    }
  )

  if (!session) {
    if (request.nextUrl.pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    const url = new URL("/auth", request.url)
    url.searchParams.set("callbackUrl", request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/api/admin/:path*"],
}
