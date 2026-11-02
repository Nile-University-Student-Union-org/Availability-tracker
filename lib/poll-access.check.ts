import assert from "node:assert/strict";
import {
  approveAudience,
  canCreatePoll,
  canEditOrDeletePoll,
  canSeePoll,
  canSeeResults,
  createAudience,
  editAudience,
  rejectAudience,
} from "./poll-access";

// 1. Own-committee create is live
assert.equal(canCreatePoll(true, false, "Design").allowed, true);
assert.equal(canCreatePoll(true, false, null).allowed, true);
assert.equal(canCreatePoll(true, false, null).error, "Set your committee in your profile first");
assert.deepEqual(createAudience("Design", ["Design"], false), {
  committees: ["Design"],
  requestedCommittees: [],
  requestStatus: null,
});

// 2. Cross-committee create is pending with empty live set
assert.deepEqual(createAudience("Design", ["Media"], false), {
  committees: [],
  requestedCommittees: ["Media"],
  requestStatus: "pending",
});
assert.deepEqual(createAudience("Design", ["Design", "Media"], false), {
  committees: [],
  requestedCommittees: ["Design", "Media"],
  requestStatus: "pending",
});

// 3. Superadmin create is live
assert.deepEqual(createAudience(null, ["Media"], true), {
  committees: ["Media"],
  requestedCommittees: [],
  requestStatus: null,
});

// 4. Edit adding a committee keeps old live + pends the new one
assert.deepEqual(editAudience(["Design"], ["Design", "Media"], "Design", false), {
  committees: ["Design"],
  requestedCommittees: ["Media"],
  requestStatus: "pending",
});
assert.deepEqual(editAudience(["Design"], ["Design"], "Design", false), {
  committees: ["Design"],
  requestedCommittees: [],
  requestStatus: null,
});
// Superadmin edit is direct
assert.deepEqual(editAudience(["Design"], ["Design", "Media"], null, true), {
  committees: ["Design", "Media"],
  requestedCommittees: [],
  requestStatus: null,
});

// 5. Approve merges
assert.deepEqual(approveAudience(["Design"], ["Media"]), {
  committees: ["Design", "Media"],
  requestedCommittees: [],
  requestStatus: null,
});

// 6. Reject keeps requested
assert.deepEqual(rejectAudience(["Media"], "Not appropriate at this time"), {
  requestStatus: "rejected",
  rejectionReason: "Not appropriate at this time",
  requestedCommittees: ["Media"],
});
assert.throws(() => rejectAudience(["Media"], ""), /Rejection reason is required/);

// 7. Visibility for member/creator/head/superadmin/allCommittees
const poll = {
  committees: ["Design"],
  requestedCommittees: ["Media"],
  allCommittees: false,
  createdById: "creator",
  active: true,
};

// Member visibility
assert.equal(canSeePoll(poll, { committee: "Design" }), true);
assert.equal(canSeePoll(poll, { committee: "Media" }), false);
assert.equal(canSeePoll(poll, { committee: null }), false);
// Admin/superadmin filling as member follows the same rule
assert.equal(canSeePoll(poll, { committee: null }), false);
// Inactive poll is hidden from members
assert.equal(canSeePoll({ ...poll, active: false }, { committee: "Design" }), false);
// allCommittees poll is visible to all active members
assert.equal(canSeePoll({ ...poll, allCommittees: true }, { committee: null }), true);

// Results visibility (analytics + poll list in admin)
// Creator
assert.equal(canSeeResults(poll, "creator", null, false, false), true);
// Head of committee in live committees
assert.equal(canSeeResults(poll, "head", "Design", true, false), true);
// Head of committee not in live committees
assert.equal(canSeeResults(poll, "head2", "Media", true, false), false);
// Superadmin
assert.equal(canSeeResults(poll, "super", null, false, true), true);
// Every admin when allCommittees
assert.equal(canSeeResults({ ...poll, allCommittees: true }, "admin", "Other", true, false), true);
// Regular member cannot see results
assert.equal(canSeeResults(poll, "member", "Design", false, false), false);

// Edit/delete: creator or superadmin
assert.equal(canEditOrDeletePoll(poll, "creator", false), true);
assert.equal(canEditOrDeletePoll(poll, "someone-else", true), true);
assert.equal(canEditOrDeletePoll(poll, "someone-else", false), false);

// Editing a never-approved poll keeps the whole poll waiting, own committee included
assert.deepEqual(editAudience([], ["Technical", "PR"], "Technical", false), {
  committees: [],
  requestedCommittees: ["Technical", "PR"],
  requestStatus: "pending",
});
// Dropping the other committees from a rejected request makes it own-committee only, so live
assert.deepEqual(editAudience([], ["Technical"], "Technical", false), {
  committees: ["Technical"],
  requestedCommittees: [],
  requestStatus: null,
});

console.log("poll-access checks passed");
