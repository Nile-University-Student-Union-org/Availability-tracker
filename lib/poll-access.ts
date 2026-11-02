export type PollAudience = {
  committees: string[];
  requestedCommittees?: string[];
  allCommittees: boolean;
  createdById?: string | null;
};

export function canCreatePoll(isAdmin: boolean, isSuperAdmin: boolean, committee: string | null) {
  return {
    allowed: isAdmin || isSuperAdmin,
    error: (isAdmin || isSuperAdmin) && !isSuperAdmin && !committee ? "Set your committee in your profile first" : null,
  };
}

export function createAudience(creatorCommittee: string | null, chosen: string[], isSuperAdmin: boolean) {
  const live = isSuperAdmin || (chosen.length === 1 && chosen[0] === creatorCommittee);
  return {
    committees: live ? chosen : [],
    requestedCommittees: live ? [] : chosen,
    requestStatus: live ? null : ("pending" as const),
  };
}

export function editAudience(current: string[], chosen: string[], editorCommittee: string | null, isSuperAdmin: boolean) {
  if (isSuperAdmin) return { committees: chosen, requestedCommittees: [], requestStatus: null };
  // Never approved yet: the whole poll keeps waiting, same rule as create
  if (!current.length) return createAudience(editorCommittee, chosen, false);
  const additions = chosen.filter((c) => !current.includes(c));
  const requested = additions.filter((c) => c !== editorCommittee);
  return {
    committees: chosen.filter((c) => current.includes(c) || c === editorCommittee),
    requestedCommittees: requested,
    requestStatus: requested.length ? ("pending" as const) : null,
  };
}

export function approveAudience(committees: string[], requestedCommittees: string[]) {
  return {
    committees: [...new Set([...committees, ...requestedCommittees])],
    requestedCommittees: [],
    requestStatus: null,
  };
}

export function rejectAudience(requestedCommittees: string[], reason: string) {
  const trimmed = reason.trim();
  if (!trimmed || trimmed.length > 500) {
    throw new Error("Rejection reason is required and must be at most 500 characters");
  }
  return {
    requestStatus: "rejected" as const,
    rejectionReason: trimmed,
    requestedCommittees,
  };
}

export function canSeePoll(
  poll: PollAudience & { active?: boolean },
  user: { id?: string; committee: string | null },
) {
  return Boolean(
    poll.active &&
      (poll.allCommittees || Boolean(user.committee && poll.committees.includes(user.committee))),
  );
}

export function canSeeResults(
  poll: PollAudience,
  userId: string,
  committee: string | null,
  isAdmin: boolean,
  isSuperAdmin: boolean,
) {
  return (
    isSuperAdmin ||
    poll.createdById === userId ||
    (isAdmin && (poll.allCommittees || Boolean(committee && poll.committees.includes(committee))))
  );
}

export function canEditOrDeletePoll(
  poll: { createdById?: string | null },
  userId: string,
  isSuperAdmin: boolean,
) {
  return isSuperAdmin || Boolean(poll.createdById && poll.createdById === userId);
}
