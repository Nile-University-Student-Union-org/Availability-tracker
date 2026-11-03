import assert from "node:assert/strict";
import { pollRequestEmail } from "./poll-request";

const base = {
  kind: "new" as const,
  pollName: "Tech x PR weekly sync",
  type: "weekly" as const,
  creatorName: "Ahmed Khaled",
  creatorCommittee: "Technical",
  requested: ["Technical", "PR"],
  live: [],
  startDate: null,
  endDate: null,
  weeklyDays: [0, 1, 2, 3, 4],
  slotCount: 14,
  reviewUrl: "https://example.test/admin?tab=requests",
};

const email = pollRequestEmail(base);
assert.equal(email.subject, "Approval needed: Tech x PR weekly sync");
assert.match(email.html, /Semester timetable/);
assert.match(email.html, /14 time slots/);

// User text never reaches the HTML unescaped
const evil = pollRequestEmail({ ...base, pollName: "<script>x</script>", creatorName: "<b>a</b>" });
assert.doesNotMatch(evil.html, /<script>x<\/script>|<b>a<\/b>/);

assert.equal(
  pollRequestEmail({ ...base, kind: "resubmitted" }).subject,
  "Resubmitted for approval: Tech x PR weekly sync",
);

console.log("poll-request email checks passed");
