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

// Liquid glass for email, built on what Outlook's dark mode was measured to do: it recolours dark
// fills and strips gradients and background images. So the email has no ground of its own: one blue
// card sits on the client's surface in light and dark mode, and glass comes from rims and capsules.
const CARD = "#1C3A5E";
const BUTTON = "#0E4C86";
const INK = "#FFFFFF";
const BODY = "#E2EAF4";
const MUTED = "#B4C4D9";
const NILE = "#7DD3FC";
const RIM = "rgba(255,255,255,0.32)";
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
        `<span style="display:inline-block;margin:2px 6px 2px 0;padding:5px 12px;border-radius:999px;background-color:#2A4A70;border:1px solid #5B7BA3;border-color:${RIM};color:${color};font-size:14px;font-weight:600;line-height:20px">${esc(n)}</span>`,
    )
    .join("");
}

function row(label: string, valueHtml: string) {
  return `<tr>
    <td style="padding:9px 12px 9px 0;width:112px;vertical-align:top;color:${MUTED};font-size:14px;line-height:22px">${label}</td>
    <td style="padding:9px 0;vertical-align:top;color:${INK};font-size:15px;line-height:22px;font-weight:500">${valueHtml}</td>
  </tr>`;
}

/** The one blue card every email uses. `intro` and `rows` are HTML, so callers escape user text. */
function emailLayout(e: {
  subject: string;
  preheader: string;
  /** A big filled capsule above the title, for the one thing the email is about */
  status?: { label: string; fill: string; rim: string };
  title: string;
  intro: string;
  rows: string;
  action: { label: string; href: string };
  note: string;
  footer: string;
}) {
  return `<!doctype html>
<html lang="en">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(e.subject)}</title></head>
<body style="margin:0;padding:0;font-family:Poppins,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Arial,sans-serif">
  <div style="display:none;max-height:0;overflow:hidden">${esc(e.preheader)}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    <tr><td align="center" style="padding:24px 12px">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="${CARD}" style="max-width:560px;background-color:${CARD};border:1px solid #6F8DB3;border-color:${RIM};border-radius:28px;box-shadow:inset 0 1px 1px rgba(255,255,255,0.4)">
        <tr><td style="padding:24px 28px 0">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td style="vertical-align:middle;padding-right:12px">
              <img src="cid:${NUSU_EMBLEM.cid}" width="32" height="37" alt="NUSU" style="display:block;border:0;outline:none">
            </td>
            <td style="vertical-align:middle;font-size:16px;line-height:20px;font-weight:600;color:${INK}">NUSU Availability Tracker</td>
          </tr></table>
        </td></tr>
        ${
          e.status
            ? `<tr><td style="padding:22px 28px 0">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td bgcolor="${e.status.fill}" style="padding:10px 22px;background-color:${e.status.fill};border:2px solid ${e.status.rim};border-radius:999px;color:${INK};font-size:24px;line-height:30px;font-weight:800;letter-spacing:-0.3px">${esc(e.status.label)}</td>
          </tr></table>
        </td></tr>`
            : ""
        }
        <tr><td style="padding:${e.status ? "16px" : "24px"} 28px 0">
          <h1 style="margin:0 0 10px;font-size:28px;line-height:34px;font-weight:700;letter-spacing:-0.5px;color:${INK};word-break:break-word">${esc(e.title)}</h1>
          <p style="margin:0;font-size:16px;line-height:24px;color:${BODY}">${e.intro}</p>
        </td></tr>
        <tr><td style="padding:22px 16px 0">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #5B7BA3;border-color:${RIM};border-radius:20px;box-shadow:inset 0 1px 1px rgba(255,255,255,0.25)">
            <tr><td style="padding:10px 16px">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                ${e.rows}
              </table>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding:24px 28px 24px">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td bgcolor="${BUTTON}" style="background-color:${BUTTON};border:1px solid ${NILE};border-radius:999px;box-shadow:inset 0 1px 1px rgba(255,255,255,0.55)">
              <a href="${esc(e.action.href)}" style="display:inline-block;padding:13px 28px;color:${INK};text-decoration:none;font-size:15px;line-height:20px;font-weight:600">${esc(e.action.label)}</a>
            </td>
          </tr></table>
          <p style="margin:16px 0 0;font-size:14px;line-height:21px;color:${BODY}">${esc(e.note)}</p>
          <p style="margin:14px 0 0;font-size:13px;line-height:18px;color:${MUTED}">${esc(e.footer)}</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
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

  const html = emailLayout({
    subject,
    preheader: `${p.creatorName} needs your approval for ${p.requested.join(", ")}.`,
    title: p.pollName,
    intro: `${who} ${INTRO[p.kind]} It's waiting for your approval.`,
    rows: `${row("Wants access", chips(p.requested, INK))}
                ${p.live.length ? row("Already live", chips(p.live, EMERALD)) : ""}
                ${row("Type", esc(POLL_TYPE_LABEL[p.type]))}
                ${row(p.type === "date" ? "Dates" : "Days", esc(when))}
                ${row("Slots", esc(slots))}`,
    action: { label: "Review request", href: p.reviewUrl },
    note: "Approve to make it live for these committees, or reject it with a reason. The head can edit and send it again.",
    footer: "You get this because you're a HARAM admin of NUSU Availability Tracker.",
  });

  return { subject, html, inlineImages: [NUSU_EMBLEM] };
}

export type PollDecisionEmail = {
  decision: "approved" | "rejected";
  pollName: string;
  type: PollType;
  reviewerName: string;
  /** Committees the head asked for */
  requested: string[];
  rejectionReason?: string | null;
  startDate: string | null;
  endDate: string | null;
  weeklyDays: number[];
  pollUrl: string;
};

/** Tells the head who asked for a poll what the superadmins decided. */
export function pollDecisionEmail(p: PollDecisionEmail) {
  const approved = p.decision === "approved";
  const subject = `${approved ? "Approved" : "Rejected"}: ${p.pollName}`;
  const when = pollSummary({
    type: p.type,
    startDate: p.startDate,
    endDate: p.endDate,
    weeklyDays: p.weeklyDays,
  });
  const reviewer = `<strong style="color:${INK};font-weight:600">${esc(p.reviewerName)}</strong>`;
  const html = emailLayout({
    subject,
    preheader: approved
      ? `Your poll is now open for ${p.requested.join(", ")}.`
      : "Your poll request was rejected.",
    status: approved
      ? { label: "\u2713 Approved", fill: "#047857", rim: "#6EE7B7" }
      : { label: "\u2715 Rejected", fill: "#B91C1C", rim: "#FCA5A5" },
    title: p.pollName,
    intro: approved
      ? `${reviewer} approved your request. The poll is now open for these committees.`
      : `${reviewer} rejected your request. The poll isn't open for these committees.`,
    rows: `${row(approved ? "Now open for" : "You asked for", chips(p.requested, approved ? EMERALD : INK))}
                ${!approved && p.rejectionReason ? row("Reason", `<span style="white-space:pre-wrap">${esc(p.rejectionReason)}</span>`) : ""}
                ${row("Type", esc(POLL_TYPE_LABEL[p.type]))}
                ${row(p.type === "date" ? "Dates" : "Days", esc(when))}`,
    action: approved
      ? { label: "View poll", href: p.pollUrl }
      : { label: "Edit and send again", href: p.pollUrl },
    note: approved
      ? "Members of these committees can answer it now."
      : "You can change the poll and send it for approval again.",
    footer: "You get this because you asked for this poll on NUSU Availability Tracker.",
  });

  return { subject, html, inlineImages: [NUSU_EMBLEM] };
}
