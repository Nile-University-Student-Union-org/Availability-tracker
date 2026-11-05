import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";
import { encryptRefreshToken, mailerConfig, mailerRedirectUri, matchesMailerAccount, verifyOAuthFlow } from "@/lib/mailer-oauth";
import { prisma } from "@/lib/prisma";

function finish(request: NextRequest, flag: string) {
  const response = NextResponse.redirect(new URL(`/admin?tab=requests&mailer=${flag}`, request.url));
  response.cookies.set("mailer_oauth", "", { path: "/api/admin/mailer/microsoft/callback", maxAge: 0 });
  return response;
}

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isSuperAdmin(session.user.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const params = request.nextUrl.searchParams;
  const verifier = verifyOAuthFlow(request.cookies.get("mailer_oauth")?.value, params.get("state") ?? "", process.env.BETTER_AUTH_SECRET!);
  if (!verifier) return finish(request, "state");
  if (params.get("error"))
    return finish(request, /AADSTS65001|admin approval/i.test(params.get("error_description") ?? "") ? "consent" : "authorization");

  const code = params.get("code");
  const config = mailerConfig();
  const redirectUri = mailerRedirectUri();
  if (!code) return finish(request, "authorization");
  if (!config || !redirectUri) return finish(request, "configuration");

  const tokenResponse = await fetch(`${config.oauthBase}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "authorization_code",
      code,
      code_verifier: verifier,
      redirect_uri: redirectUri,
    }),
  });
  if (!tokenResponse.ok) return finish(request, "token");
  const token = await tokenResponse.json();
  if (!token.access_token || !token.refresh_token) return finish(request, "token");

  // Only the configured mailbox may become the sender, not whoever happened to sign in
  const profileResponse = await fetch("https://graph.microsoft.com/v1.0/me", {
    headers: { Authorization: `Bearer ${token.access_token}` },
  });
  if (!profileResponse.ok || !matchesMailerAccount(await profileResponse.json(), config.sender))
    return finish(request, "account");

  const data = {
    accountEmail: config.sender,
    encryptedRefreshToken: encryptRefreshToken(token.refresh_token, config.key),
    status: "connected",
    lastError: null,
    connectedAt: new Date(),
  };
  await prisma.mailerCredential.upsert({ where: { id: "graph" }, create: { id: "graph", ...data }, update: data });
  return finish(request, "connected");
}
