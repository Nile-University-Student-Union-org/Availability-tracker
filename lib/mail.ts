import { prisma } from "@/lib/prisma";
import { decryptRefreshToken, encryptRefreshToken, MAILER_SCOPE, mailerConfig } from "@/lib/mailer-oauth";

type InlineImage = { cid: string; contentType: string; base64: string };
type Mail = {
  to: string[];
  subject: string;
  html: string;
  /** Images the HTML references as cid:<cid>, sent as inline attachments */
  inlineImages?: InlineImage[];
};
let warned = false;

type MailerConfig = NonNullable<ReturnType<typeof mailerConfig>>;

/** Fresh Graph token for the connected mailbox, or null when nobody has connected it. */
async function graphAccessToken(config: MailerConfig): Promise<string | null> {
  const credential = await prisma.mailerCredential.findUnique({ where: { id: "graph" } });
  if (credential?.status !== "connected" || !credential.encryptedRefreshToken) return null;

  const refreshToken = decryptRefreshToken(credential.encryptedRefreshToken, config.key);
  const response = await fetch(`${config.oauthBase}/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      scope: MAILER_SCOPE,
    }),
  });
  if (!response.ok) {
    const failure = await response.json().catch(() => null);
    if (failure?.error === "invalid_grant") {
      await prisma.mailerCredential.update({
        where: { id: "graph" },
        data: {
          status: "disconnected",
          encryptedRefreshToken: null,
          lastError: "Microsoft sign-in expired. Connect the mailbox again.",
        },
      });
      return null;
    }
    throw new Error(`Graph token failed (${response.status})`);
  }
  const token = await response.json();
  // shortcut: no row lock, so concurrent sends can store either new token. Microsoft keeps older refresh tokens valid; lock if that changes.
  await prisma.mailerCredential.update({
    where: { id: "graph" },
    data: {
      encryptedRefreshToken: encryptRefreshToken(token.refresh_token ?? refreshToken, config.key),
      lastError: null,
    },
  });
  return token.access_token;
}

export async function sendMail({ to, subject, html, inlineImages = [] }: Mail) {
  const config = mailerConfig();
  if (!config) {
    if (!warned) {
      console.warn("Mail is disabled: Microsoft Graph environment is incomplete");
      warned = true;
    }
    return;
  }
  if (!to.length) return;

  try {
    const accessToken = await graphAccessToken(config);
    if (!accessToken) {
      console.warn("Mail skipped: no mailbox is connected");
      return;
    }

    const response = await fetch("https://graph.microsoft.com/v1.0/me/sendMail", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject,
          body: { contentType: "HTML", content: html },
          toRecipients: to.map((address) => ({ emailAddress: { address } })),
          attachments: inlineImages.map((img) => ({
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: `${img.cid}.png`,
            contentType: img.contentType,
            contentBytes: img.base64,
            contentId: img.cid,
            isInline: true,
          })),
        },
        saveToSentItems: false,
      }),
    });
    if (!response.ok) throw new Error(`Graph sendMail failed (${response.status})`);
  } catch (error) {
    console.error("Mail send failed:", error);
    // Sends run in the background, so this is the only place a super admin can see a failure
    await prisma.mailerCredential
      .updateMany({ where: { id: "graph" }, data: { lastError: error instanceof Error ? error.message : "Mail send failed" } })
      .catch(() => {});
  }
}

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
