import { headers } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isSuperAdmin } from "@/lib/admin";
import { codeChallenge, createOAuthFlow, MAILER_SCOPE, mailerConfig, mailerRedirectUri } from "@/lib/mailer-oauth";

export async function GET(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !isSuperAdmin(session.user.email))
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const config = mailerConfig();
  const redirectUri = mailerRedirectUri();
  if (!config || !redirectUri)
    return NextResponse.redirect(new URL("/admin?tab=requests&mailer=configuration", request.url));

  const flow = createOAuthFlow(process.env.BETTER_AUTH_SECRET!);
  const authorize = new URL(`${config.oauthBase}/authorize`);
  authorize.search = new URLSearchParams({
    client_id: config.clientId,
    response_type: "code",
    redirect_uri: redirectUri,
    response_mode: "query",
    scope: MAILER_SCOPE,
    login_hint: config.sender,
    prompt: "select_account",
    state: flow.state,
    code_challenge: codeChallenge(flow.verifier),
    code_challenge_method: "S256",
  }).toString();

  const response = NextResponse.redirect(authorize);
  response.cookies.set("mailer_oauth", flow.cookie, {
    httpOnly: true,
    secure: redirectUri.startsWith("https:"),
    sameSite: "lax",
    maxAge: 600,
    path: "/api/admin/mailer/microsoft/callback",
  });
  return response;
}
