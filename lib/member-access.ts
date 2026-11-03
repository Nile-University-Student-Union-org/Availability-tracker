export type MemberActor = {
  id?: string | null;
  email?: string | null;
  committee?: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

export type TargetMember = {
  id: string;
  email: string;
  committee?: string | null;
  isAdmin: boolean;
  isSuperAdmin: boolean;
};

export type MemberAction = "delete" | "reset-password" | "edit";

/**
 * Pure access control function for managing members in the admin panel.
 *
 * Rules:
 * - Superadmins can act on anyone except:
 *   - Nobody may delete or force-reset a superadmin
 *   - Nobody may delete their own account
 * - A non-superadmin admin may act only on non-admin members of THEIR OWN committee.
 * - Non-admins cannot manage any member.
 */
export function canManageMember(
  actor: MemberActor,
  target: TargetMember,
  action: MemberAction,
): boolean {
  if (!actor.isAdmin && !actor.isSuperAdmin) {
    return false;
  }

  const actorEmail = actor.email?.trim().toLowerCase();
  const targetEmail = target.email.trim().toLowerCase();

  // Nobody may delete themselves
  if (action === "delete") {
    if (actor.id && target.id && actor.id === target.id) {
      return false;
    }
    if (actorEmail && targetEmail && actorEmail === targetEmail) {
      return false;
    }
  }

  // Nobody may delete or force-reset a superadmin
  if (target.isSuperAdmin && (action === "delete" || action === "reset-password")) {
    return false;
  }

  // Superadmins can act on anyone (except delete/reset superadmin, handled above)
  if (actor.isSuperAdmin) {
    return true;
  }

  // Non-superadmin admins may NOT act on superadmins or other admins
  if (target.isSuperAdmin || target.isAdmin) {
    return false;
  }

  // Non-superadmin admins must have a committee and target must be in that same committee
  const actorCommittee = actor.committee?.trim().toLowerCase();
  const targetCommittee = target.committee?.trim().toLowerCase();

  if (!actorCommittee || !targetCommittee) {
    return false;
  }

  return actorCommittee === targetCommittee;
}
