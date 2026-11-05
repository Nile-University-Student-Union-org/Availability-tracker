import { escapeHtml as esc } from "@/lib/mail";
import { POLL_TYPE_LABEL, pollSummary, type PollType } from "@/lib/poll-display";
import { NUSU_HERO } from "@/lib/emails/nusu-emblem";

export type PollRequestEmail = {
  pollName: string;
  type: PollType;
  creatorName: string;
  creatorCommittee: string | null;
  /** Committees waiting for approval */
  requested: string[];
  /** Committees that can already fill the poll */
  live: string[];
  startDate: string | null;
  endDate: string | null;
  weeklyDays: number[];
  slotCount: number;
  slotMode?: "fixed" | "free";
  /** new poll, more committees on a live poll, or a rejected poll sent again */
  kind: "new" | "added" | "resubmitted";
  reviewUrl: string;
};

// Liquid glass for email, built on what Outlook's dark mode was measured to do: it keeps #000000
// and <img> exact, lifts dark navy to washed slate, and strips gradients and background images.
// So: a black ground, a blue card that is meant to get lifted, a black inset panel for depth, and
// the real glow in an image. Glass comes from the rims and inner light, which all survive.
const BLACK = "#000000";
const CARD = "#1C3A5E";
const BUTTON = "#0E4C86";
const INK = "#FFFFFF";
const BODY = "#E2EAF4";
const MUTED = "#B4C4D9";
const NILE = "#7DD3FC";
const EMERALD = "#6EE7B7";

const INTRO: Record<PollRequestEmail["kind"], string> = {
  new: "wants to open a new poll for other committees.",
  added: "wants to add committees to a poll that's already live.",
  resubmitted: "edited a rejected poll and sent it again.",
};

function chips(names: string[], color: string) {
  return names
    .map(
      (n) =>
        `<span style="display:inline-block;margin:2px 6px 2px 0;padding:5px 12px;border-radius:999px;background-color:${CARD};border:1px solid #4A6A92;color:${color};font-size:14px;font-weight:600;line-height:20px">${esc(n)}</span>`,
    )
    .join("");
}

function row(label: string, valueHtml: string) {
  return `<tr>
    <td style="padding:9px 12px 9px 0;width:112px;vertical-align:top;color:${MUTED};font-size:14px;line-height:22px">${label}</td>
    <td style="padding:9px 0;vertical-align:top;color:${INK};font-size:15px;line-height:22px;font-weight:500">${valueHtml}</td>
  </tr>`;
}

/**
 * Approval-request email for superadmins. Table layout with inline styles, so it
 * holds up in Outlook, Gmail and Apple Mail. Every piece of user text is escaped.
 */
export function pollRequestEmail(p: PollRequestEmail) {
  const subject =
    p.kind === "resubmitted"
      ? `Resubmitted for approval: ${p.pollName}`
      : `Approval needed: ${p.pollName}`;
  const who = p.creatorCommittee
    ? `<strong style="color:${INK};font-weight:600">${esc(p.creatorName)}</strong> (${esc(p.creatorCommittee)})`
    : `<strong style="color:${INK};font-weight:600">${esc(p.creatorName)}</strong>`;
  const when = pollSummary({
    type: p.type,
    startDate: p.startDate,
    endDate: p.endDate,
    weeklyDays: p.weeklyDays,
  });
  const slots =
    p.type === "date" && p.slotMode === "free"
      ? "Members pick their own times"
      : `${p.slotCount} ${p.slotCount === 1 ? "time slot" : "time slots"}`;

  const html = `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background-color:${BLACK};font-family:Poppins,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color-scheme:dark">
  <div style="display:none;max-height:0;overflow:hidden">${esc(p.creatorName)} needs your approval for ${esc(p.requested.join(", "))}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BLACK}" style="background-color:${BLACK}">
    <tr><td align="center" style="padding:0 12px 32px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <tr><td style="padding:0;font-size:0;line-height:0">
          <img src="cid:${NUSU_HERO.cid}" width="560" alt="NUSU Availability Tracker" style="display:block;width:100%;max-width:560px;height:auto;border:0;outline:none">
        </td></tr>
      </table>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${CARD}" style="max-width:560px;background-color:${CARD};border:1px solid #6F8DB3;border-color:rgba(255,255,255,0.32);border-radius:28px;box-shadow:inset 0 1px 1px rgba(255,255,255,0.4),inset 0 0 28px rgba(125,211,252,0.12),0 0 48px rgba(14,111,181,0.35)">
        <tr><td style="padding:28px 28px 0">
          <h1 style="margin:0 0 10px;font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.5px;color:${INK};word-break:break-word">${esc(p.pollName)}</h1>
          <p style="margin:0;font-size:16px;line-height:24px;color:${BODY}">${who} ${INTRO[p.kind]} It's waiting for your approval.</p>
        </td></tr>
        <tr><td style="padding:22px 16px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${BLACK}" style="background-color:${BLACK};border-radius:20px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.6),0 1px 0 rgba(255,255,255,0.14)">
            <tr><td style="padding:10px 16px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${row("Wants access", chips(p.requested, INK))}
                ${p.live.length ? row("Already live", chips(p.live, EMERALD)) : ""}
                ${row("Type", esc(POLL_TYPE_LABEL[p.type]))}
                ${row(p.type === "date" ? "Dates" : "Days", esc(when))}
                ${row("Slots", esc(slots))}
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 28px 28px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td bgcolor="${BUTTON}" style="background-color:${BUTTON};border:1px solid ${NILE};border-radius:999px;box-shadow:inset 0 1px 1px rgba(255,255,255,0.55),inset 0 0 18px rgba(125,211,252,0.35),0 0 22px rgba(56,180,242,0.35)">
              <a href="${esc(p.reviewUrl)}" style="display:inline-block;padding:13px 28px;color:${INK};text-decoration:none;font-size:15px;line-height:20px;font-weight:600">Review request</a>
            </td>
          </tr></table>
          <p style="margin:16px 0 0;font-size:14px;line-height:21px;color:${BODY}">Approve to make it live for these committees, or reject it with a reason. The head can edit and send it again.</p>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:13px;line-height:18px;color:${MUTED}">You get this because you're a HARAM admin of <span style="color:${NILE}">NUSU Availability Tracker</span>.</p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, inlineImages: [NUSU_HERO] };
}
