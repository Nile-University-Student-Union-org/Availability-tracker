import { escapeHtml as esc } from "@/lib/mail";
import { POLL_TYPE_LABEL, pollSummary, type PollType } from "@/lib/poll-display";
import { NUSU_EMBLEM } from "@/lib/emails/nusu-emblem";

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

// Liquid glass, faked for email: clients ignore backdrop-filter, so glass is a translucent fill
// over a lit navy ground with light caught on the top edge. Every translucent value is preceded
// by a solid one for clients that drop it. Always dark, so Outlook's dark mode has nothing to invert.
const GROUND = "#071426";
const INK = "#FFFFFF";
const BODY = "#D5E0EE";
const MUTED = "#A9BBD3";
const NILE = "#7DD3FC";
const EMERALD = "#6EE7B7";
const GLASS_EDGE = "box-shadow:inset 0 1px 1px rgba(255,255,255,0.28),inset 0 -1px 1px rgba(255,255,255,0.08),0 24px 60px -24px rgba(0,0,0,0.7);";

const INTRO: Record<PollRequestEmail["kind"], string> = {
  new: "wants to open a new poll for other committees.",
  added: "wants to add committees to a poll that's already live.",
  resubmitted: "edited a rejected poll and sent it again.",
};

function chips(names: string[], color: string) {
  return names
    .map(
      (n) =>
        `<span style="display:inline-block;margin:2px 6px 2px 0;padding:5px 12px;border-radius:999px;background-color:#1D3454;background-color:rgba(255,255,255,0.1);border:1px solid #33496A;border-color:rgba(255,255,255,0.18);color:${color};font-size:14px;font-weight:600;line-height:20px">${esc(n)}</span>`,
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
<body style="margin:0;padding:0;background-color:${GROUND};font-family:Poppins,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif;color-scheme:dark">
  <div style="display:none;max-height:0;overflow:hidden">${esc(p.creatorName)} needs your approval for ${esc(p.requested.join(", "))}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${GROUND}" style="background-color:${GROUND};background-image:radial-gradient(520px 340px at 18% 0%,rgba(1,139,206,0.55),transparent 70%),radial-gradient(460px 360px at 88% 62%,rgba(16,120,190,0.38),transparent 72%)">
    <tr><td align="center" style="padding:32px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#13263F" style="max-width:560px;background-color:#13263F;background-color:rgba(255,255,255,0.08);border:1px solid #33496A;border-color:rgba(255,255,255,0.18);border-radius:28px;-webkit-backdrop-filter:blur(24px) saturate(180%);backdrop-filter:blur(24px) saturate(180%);${GLASS_EDGE}">
        <tr><td style="padding:28px 28px 0">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;padding-right:12px">
              <img src="cid:${NUSU_EMBLEM.cid}" width="28" height="33" alt="NUSU" style="display:block;border:0;outline:none">
            </td>
            <td style="vertical-align:middle;font-size:15px;line-height:20px;font-weight:600;color:${INK}">NUSU Availability Tracker</td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 28px 0">
          <h1 style="margin:0 0 10px;font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.5px;color:${INK};word-break:break-word">${esc(p.pollName)}</h1>
          <p style="margin:0;font-size:16px;line-height:24px;color:${BODY}">${who} ${INTRO[p.kind]} It's waiting for your approval.</p>
        </td></tr>
        <tr><td style="padding:22px 16px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#0D1E36" style="background-color:#0D1E36;background-color:rgba(4,14,30,0.42);border-radius:20px;box-shadow:inset 0 1px 2px rgba(0,0,0,0.35)">
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
            <td bgcolor="#1C5A8A" style="background-color:#1C5A8A;background-color:rgba(56,180,242,0.28);border:1px solid #4A8FC0;border-color:rgba(125,211,252,0.55);border-radius:999px;box-shadow:inset 0 1px 1px rgba(255,255,255,0.45),inset 0 0 18px rgba(56,180,242,0.3)">
              <a href="${esc(p.reviewUrl)}" style="display:inline-block;padding:13px 28px;color:${INK};text-decoration:none;font-size:15px;line-height:20px;font-weight:600">Review request</a>
            </td>
          </tr></table>
          <p style="margin:16px 0 0;font-size:14px;line-height:21px;color:${MUTED}">Approve to make it live for these committees, or reject it with a reason. The head can edit and send it again.</p>
        </td></tr>
      </table>
      <p style="margin:18px 0 0;font-size:13px;line-height:18px;color:${MUTED}">You get this because you're a HARAM admin of <span style="color:${NILE}">NUSU Availability Tracker</span>.</p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, inlineImages: [NUSU_EMBLEM] };
}
