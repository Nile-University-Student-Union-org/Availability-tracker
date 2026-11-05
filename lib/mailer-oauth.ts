import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";

export function mailerTokenKey(): Buffer | null {
  const key = Buffer.from(process.env.MAILER_TOKEN_KEY ?? "", "base64");
  return key.length === 32 ? key : null;
}

/** Everything needed to connect and send. Null means mail is not set up on this server. */
export function mailerConfig() {
  const { MS_GRAPH_TENANT_ID: tenant, MICROSOFT_CLIENT_ID: clientId, MICROSOFT_CLIENT_SECRET: clientSecret, MAIL_SENDER: sender } = process.env;
  const key = mailerTokenKey();
  if (!tenant || !clientId || !clientSecret || !sender || !key) return null;
  return { oauthBase: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0`, clientId, clientSecret, sender, key };
}

export const MAILER_SCOPE = "offline_access Mail.Send User.Read";

// From BETTER_AUTH_URL, not the request, so a spoofed Host header can't steer the redirect
export function mailerRedirectUri(): string | null {
  try {
    return `${new URL(process.env.BETTER_AUTH_URL ?? "").origin}/api/admin/mailer/microsoft/callback`;
  } catch {
    return null;
  }
}

export function encryptRefreshToken(token: string, key: Buffer): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), ciphertext]).toString("base64");
}

export function decryptRefreshToken(encoded: string, key: Buffer): string {
  const payload = Buffer.from(encoded, "base64");
  if (payload.length < 29) throw new Error("Invalid encrypted refresh token");
  const decipher = createDecipheriv("aes-256-gcm", key, payload.subarray(0, 12));
  decipher.setAuthTag(payload.subarray(12, 28));
  return Buffer.concat([decipher.update(payload.subarray(28)), decipher.final()]).toString("utf8");
}

export function createOAuthFlow(secret: string) {
  const state = randomBytes(32).toString("base64url");
  const verifier = randomBytes(32).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ state, verifier, expires: Date.now() + 10 * 60_000 })).toString("base64url");
  const signature = createHmac("sha256", secret).update(payload).digest("base64url");
  return { state, verifier, cookie: `${payload}.${signature}` };
}

/** Returns the PKCE verifier when the signed cookie matches the returned state and hasn't expired. */
export function verifyOAuthFlow(cookie: string | undefined, state: string, secret: string): string | null {
  const [payload, signature] = (cookie ?? "").split(".");
  if (!payload || !signature) return null;
  const expected = createHmac("sha256", secret).update(payload).digest();
  const actual = Buffer.from(signature, "base64url");
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) return null;
  const flow = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { state: string; verifier: string; expires: number };
  return flow.state === state && flow.expires > Date.now() ? flow.verifier : null;
}

export const codeChallenge = (verifier: string) => createHash("sha256").update(verifier).digest("base64url");

export function matchesMailerAccount(profile: { mail?: string | null; userPrincipalName?: string | null }, sender: string) {
  return [profile.mail, profile.userPrincipalName].some((email) => email?.toLowerCase() === sender.toLowerCase());
}
