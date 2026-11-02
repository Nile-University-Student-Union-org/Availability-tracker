type InlineImage = { cid: string; contentType: string; base64: string };
type Mail = {
  to: string[];
  subject: string;
  html: string;
  /** Images the HTML references as cid:<cid>, sent as inline attachments */
  inlineImages?: InlineImage[];
};
let warned = false;

export async function sendMail({ to, subject, html, inlineImages = [] }: Mail) {
  const { MS_GRAPH_TENANT_ID, MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, MAIL_SENDER } = process.env;
  if (!MS_GRAPH_TENANT_ID || !MICROSOFT_CLIENT_ID || !MICROSOFT_CLIENT_SECRET || !MAIL_SENDER) {
    if (!warned) {
      console.warn("Mail is disabled: Microsoft Graph environment is incomplete");
      warned = true;
    }
    return;
  }
  if (!to.length) return;

  try {
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${MS_GRAPH_TENANT_ID}/oauth2/v2.0/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: MICROSOFT_CLIENT_ID,
        client_secret: MICROSOFT_CLIENT_SECRET,
        scope: "https://graph.microsoft.com/.default",
        grant_type: "client_credentials",
      }),
    });
    if (!tokenResponse.ok) throw new Error(`Graph token failed (${tokenResponse.status})`);
    const { access_token } = await tokenResponse.json();

    const response = await fetch(`https://graph.microsoft.com/v1.0/users/${encodeURIComponent(MAIL_SENDER)}/sendMail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${access_token}`,
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
  }
}

export const escapeHtml = (value: string) =>
  value.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
