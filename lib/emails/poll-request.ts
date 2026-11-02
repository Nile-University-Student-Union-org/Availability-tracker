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

// NUSU brand: navy and cyan from components/nusu-logo.tsx
const NAVY = "#143459";
const CYAN = "#068DCE";
const EMERALD = "#047857";
const AMBER_BG = "#FEF3C7";
const AMBER_TEXT = "#92400E";
const MUTED = "#64748B";
const BORDER = "#E2E8F0";

const INTRO: Record<PollRequestEmail["kind"], string> = {
  new: "wants to open a new poll for other committees.",
  added: "wants to add committees to a poll that's already live.",
  resubmitted: "edited a rejected poll and sent it again.",
};

function chips(names: string[], bg: string, color: string) {
  return names
    .map(
      (n) =>
        `<span style="display:inline-block;margin:0 6px 6px 0;padding:4px 10px;border-radius:999px;background:${bg};color:${color};font-size:13px;font-weight:600;line-height:18px">${esc(n)}</span>`,
    )
    .join("");
}

function row(label: string, valueHtml: string) {
  return `<tr>
    <td style="padding:10px 0;border-top:1px solid ${BORDER};width:130px;vertical-align:top;color:${MUTED};font-size:13px">${label}</td>
    <td style="padding:10px 0;border-top:1px solid ${BORDER};vertical-align:top;color:#0F172A;font-size:14px">${valueHtml}</td>
  </tr>`;
}

/**
 * Approval-request email for superadmins. Table layout with inline styles and
 * no images, so it renders the same in Outlook, Gmail and Apple Mail.
 * Every piece of user text is escaped.
 */
export function pollRequestEmail(p: PollRequestEmail) {
  const subject =
    p.kind === "resubmitted"
      ? `Resubmitted for approval: ${p.pollName}`
      : `Approval needed: ${p.pollName}`;
  const who = p.creatorCommittee
    ? `${esc(p.creatorName)} <span style="color:${MUTED}">(${esc(p.creatorCommittee)})</span>`
    : esc(p.creatorName);
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
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#F1F5F9;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">${esc(p.creatorName)} needs your approval for ${esc(p.requested.join(", "))}.</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F1F5F9;padding:24px 12px">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#FFFFFF;border-radius:16px;border:1px solid ${BORDER};overflow:hidden">
        <tr><td style="height:4px;background:${CYAN};font-size:0;line-height:0">&nbsp;</td></tr>
        <tr><td style="padding:20px 28px;border-bottom:1px solid ${BORDER}">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;padding-right:12px">
              <img src="cid:${NUSU_EMBLEM.cid}" width="40" height="47" alt="NUSU" style="display:block;border:0;outline:none">
            </td>
            <td style="vertical-align:middle;padding-right:16px">
              <div style="font-size:22px;line-height:22px;font-weight:900;color:${NAVY};letter-spacing:-0.5px">NUSU</div>
              <div style="margin-top:3px;font-size:10px;line-height:12px;font-weight:700;color:${CYAN};letter-spacing:1.5px">STUDENT UNION</div>
            </td>
            <td style="vertical-align:middle;padding-left:16px;border-left:1px solid ${BORDER}">
              <div style="margin-left:16px;font-size:12px;line-height:16px;color:${MUTED}">Availability<br>Tracker</div>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:28px 28px 8px">
          <span style="display:inline-block;padding:4px 10px;border-radius:999px;background:${AMBER_BG};color:${AMBER_TEXT};font-size:12px;font-weight:700">Waiting for your approval</span>
          <h1 style="margin:14px 0 6px;font-size:22px;line-height:28px;color:#0F172A">${esc(p.pollName)}</h1>
          <p style="margin:0;font-size:15px;line-height:22px;color:#334155">${who} ${INTRO[p.kind]}</p>
        </td></tr>
        <tr><td style="padding:16px 28px 4px">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
            ${row("Wants access for", chips(p.requested, AMBER_BG, AMBER_TEXT))}
            ${p.live.length ? row("Already live for", chips(p.live, "#D1FAE5", EMERALD)) : ""}
            ${row("Type", esc(POLL_TYPE_LABEL[p.type]))}
            ${row(p.type === "date" ? "Dates" : "Days", esc(when))}
            ${row("Slots", esc(slots))}
          </table>
        </td></tr>
        <tr><td style="padding:20px 28px 28px">
          <a href="${esc(p.reviewUrl)}" style="display:inline-block;background:${NAVY};color:#FFFFFF;text-decoration:none;font-size:15px;font-weight:600;padding:12px 22px;border-radius:12px">Review request</a>
          <p style="margin:14px 0 0;font-size:13px;line-height:19px;color:${MUTED}">Approve to make it live for these committees, or reject it with a reason. The head can edit and send it again.</p>
        </td></tr>
      </table>
      <p style="margin:16px 0 0;font-size:12px;color:#94A3B8">You get this because you're a HARAM admin of NUSU Availability Tracker.</p>
    </td></tr>
  </table>
</body>
</html>`;

  return { subject, html, inlineImages: [NUSU_EMBLEM] };
}
