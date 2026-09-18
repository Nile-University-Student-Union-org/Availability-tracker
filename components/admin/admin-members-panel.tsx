"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  Search01Icon,
  Delete02Icon,
  LockPasswordIcon,
  RefreshIcon,
  Copy01Icon,
  Shield01Icon,
  AlertCircleIcon,
  CheckmarkCircle02Icon,
  FilterIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { COMMITTEES } from "@/lib/constants";

export interface MemberData {
  id: string;
  name: string;
  email: string;
  nuId?: string | null;
  committee?: string | null;
  role: string;
  mustResetPassword: boolean;
  createdAt: string;
  image?: string | null;
  _count?: {
    availabilities: number;
    recurringAvailabilities: number;
  };
}

interface AdminMembersPanelProps {
  currentUserId?: string;
  currentUserEmail?: string;
}

export function AdminMembersPanel({
  currentUserId,
  currentUserEmail,
}: AdminMembersPanelProps) {
  const [members, setMembers] = React.useState<MemberData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");
  const [committeeFilter, setCommitteeFilter] = React.useState("all");
  const [roleFilter, setRoleFilter] = React.useState("all");

  // Deletion Dialog State
  const [memberToDelete, setMemberToDelete] = React.useState<MemberData | null>(
    null,
  );
  const [deleting, setDeleting] = React.useState(false);

  // Reset Password Dialog State
  const [memberToReset, setMemberToReset] = React.useState<MemberData | null>(
    null,
  );
  const [resetting, setResetting] = React.useState(false);

  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  const fetchMembers = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/members");
      if (!res.ok) {
        throw new Error("Failed to load members directory");
      }
      const data = await res.json();
      setMembers(data.members ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not fetch members";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchMembers();
  }, [fetchMembers]);

  const handleCopyId = (nuId: string, memberId: string) => {
    navigator.clipboard.writeText(nuId);
    setCopiedId(memberId);
    toast.success(`Copied Student ID: ${nuId}`);
    setTimeout(() => setCopiedId(null), 2000);
  };

  async function confirmDeleteMember() {
    if (!memberToDelete) return;

    try {
      setDeleting(true);
      const res = await fetch("/api/admin/members", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: memberToDelete.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete member");
      }

      toast.success(data.message || `Member ${memberToDelete.name} deleted.`);
      setMemberToDelete(null);
      await fetchMembers();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete member";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  async function confirmResetPassword() {
    if (!memberToReset) return;

    try {
      setResetting(true);
      const res = await fetch("/api/admin/members", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: memberToReset.id,
          action: "reset-password",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to reset password");
      }

      toast.success(
        data.message || `Password reset triggered for ${memberToReset.name}.`,
      );
      setMemberToReset(null);
      await fetchMembers();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to reset password";
      toast.error(message);
    } finally {
      setResetting(false);
    }
  }

  // Filtered members list
  const filteredMembers = React.useMemo(() => {
    return members.filter((member) => {
      const q = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !q ||
        member.name.toLowerCase().includes(q) ||
        member.email.toLowerCase().includes(q) ||
        (member.nuId && member.nuId.toLowerCase().includes(q));

      const matchesCommittee =
        committeeFilter === "all" || member.committee === committeeFilter;

      const matchesRole =
        roleFilter === "all" ||
        (roleFilter === "admin" &&
          (member.role === "admin" || member.role === "super-admin")) ||
        (roleFilter === "user" && member.role === "user");

      return matchesSearch && matchesCommittee && matchesRole;
    });
  }, [members, searchQuery, committeeFilter, roleFilter]);

  const totalSlotsCount = React.useMemo(() => {
    return members.reduce(
      (sum, m) =>
        sum +
        (m._count?.availabilities ?? 0) +
        (m._count?.recurringAvailabilities ?? 0),
      0,
    );
  }, [members]);

  const pendingResetCount = React.useMemo(() => {
    return members.filter((m) => m.mustResetPassword).length;
  }, [members]);

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-xs backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Total Members
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <HugeiconsIcon icon={UserGroupIcon} size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {loading ? <Skeleton className="h-8 w-16" /> : members.length}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Registered Union accounts
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-xs backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Availability Entries
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {loading ? <Skeleton className="h-8 w-16" /> : totalSlotsCount}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Specific & recurring marked slots
          </p>
        </div>

        <div className="rounded-2xl border border-border/80 bg-card/60 p-5 shadow-xs backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Password Reset Pending
            </span>
            <div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <HugeiconsIcon icon={LockPasswordIcon} size={18} />
            </div>
          </div>
          <div className="mt-2 text-2xl font-bold tracking-tight">
            {loading ? <Skeleton className="h-8 w-16" /> : pendingResetCount}
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            Must set new password on next login
          </p>
        </div>
      </div>

      {/* Control Bar: Search & Filters */}
      <div className="flex flex-col gap-3 rounded-2xl border border-border/80 bg-card/60 p-4 shadow-xs backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1">
          <HugeiconsIcon
            icon={Search01Icon}
            className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            type="text"
            placeholder="Search by name, email, or 9-digit Student ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 pl-9.5 pr-4 text-sm"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Committee Filter */}
          <Select
            value={committeeFilter}
            onValueChange={(val) => setCommitteeFilter(val ?? "all")}
          >
            <SelectTrigger className="h-10 w-[160px] text-xs sm:text-sm">
              <div className="flex items-center gap-1.5 truncate">
                <HugeiconsIcon icon={FilterIcon} className="size-3.5" />
                <SelectValue placeholder="Committee" />
              </div>
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Committees</SelectItem>
              {COMMITTEES.map((comm) => (
                <SelectItem key={comm} value={comm}>
                  {comm}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Role Filter */}
          <Select
            value={roleFilter}
            onValueChange={(val) => setRoleFilter(val ?? "all")}
          >
            <SelectTrigger className="h-10 w-[130px] text-xs sm:text-sm">
              <SelectValue placeholder="Role" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="user">Members</SelectItem>
              <SelectItem value="admin">Admins</SelectItem>
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            onClick={fetchMembers}
            disabled={loading}
            className="h-10 w-10 shrink-0 cursor-pointer rounded-xl"
            title="Refresh members directory"
          >
            <HugeiconsIcon
              icon={RefreshIcon}
              className={cn("size-4", loading && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* Members Directory List */}
      <div className="overflow-hidden rounded-2xl border border-border/80 bg-card/60 shadow-xs backdrop-blur-sm">
        <div className="border-b border-border/60 px-5 py-4">
          <div className="flex items-center justify-between">
            <h3 className="font-heading text-base font-semibold">
              Registered Members Directory
            </h3>
            <span className="text-xs text-muted-foreground">
              Showing {filteredMembers.length} of {members.length} members
            </span>
          </div>
        </div>

        {loading ? (
          <div className="divide-y divide-border/40 p-4 space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-4 pt-4 first:pt-0">
                <Skeleton className="size-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-40" />
                  <Skeleton className="h-3 w-56" />
                </div>
                <Skeleton className="h-8 w-24 rounded-lg" />
              </div>
            ))}
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
              <HugeiconsIcon icon={UserGroupIcon} size={24} />
            </div>
            <h4 className="mt-4 text-sm font-semibold">No members found</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {searchQuery || committeeFilter !== "all" || roleFilter !== "all"
                ? "Try adjusting your search query or filters."
                : "No registered members yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filteredMembers.map((member) => {
              const isSelf =
                member.id === currentUserId ||
                member.email.toLowerCase() === currentUserEmail?.toLowerCase();
              const isRootAdmin =
                member.email.toLowerCase() === "admin@nu.edu.eg";

              const initials = member.name
                ? member.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                    .slice(0, 2)
                : "U";

              return (
                <div
                  key={member.id}
                  className="flex flex-col gap-4 p-4 transition-colors hover:bg-muted/30 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                >
                  {/* Left: Avatar & Info */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    <Avatar className="size-10 ring-1 ring-border/50">
                      {member.image && (
                        <AvatarImage
                          src={member.image}
                          alt={member.name}
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback className="bg-primary/10 font-heading text-xs font-bold text-primary">
                        {initials}
                      </AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-heading text-sm font-semibold leading-none truncate">
                          {member.name}
                        </span>

                        {member.role === "admin" ||
                        member.role === "super-admin" ? (
                          <Badge
                            variant="secondary"
                            className="bg-primary/15 text-primary border-primary/20 text-[10px] py-0 px-1.5 font-medium"
                          >
                            <HugeiconsIcon
                              icon={Shield01Icon}
                              className="mr-1 size-3"
                            />
                            Admin
                          </Badge>
                        ) : null}

                        {member.mustResetPassword && (
                          <Badge
                            variant="outline"
                            className="border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-[10px] py-0 px-1.5"
                          >
                            Reset Pending
                          </Badge>
                        )}
                      </div>

                      <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate">{member.email}</span>

                        {member.nuId && (
                          <>
                            <span>•</span>
                            <button
                              type="button"
                              onClick={() =>
                                handleCopyId(member.nuId!, member.id)
                              }
                              className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-mono text-[11px] font-medium transition-colors hover:bg-muted"
                              title="Click to copy student ID"
                            >
                              ID: {member.nuId}
                              <HugeiconsIcon
                                icon={
                                  copiedId === member.id
                                    ? CheckmarkCircle02Icon
                                    : Copy01Icon
                                }
                                className={cn(
                                  "size-3",
                                  copiedId === member.id &&
                                    "text-emerald-500 font-bold",
                                )}
                              />
                            </button>
                          </>
                        )}

                        {member.committee && (
                          <>
                            <span>•</span>
                            <span className="rounded-md bg-muted/80 px-1.5 py-0.5 text-[11px] font-medium text-foreground/80">
                              {member.committee}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right: Actions */}
                  <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                    {/* Change / Reset Password button */}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setMemberToReset(member)}
                      className="h-8 gap-1.5 text-xs font-medium cursor-pointer rounded-xl border-border/80 hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 touch-manipulation active:scale-[0.98]"
                      title="Reset member password and force new password on next login"
                    >
                      <HugeiconsIcon
                        icon={LockPasswordIcon}
                        className="size-3.5"
                      />
                      Reset Password
                    </Button>

                    {/* Delete Member button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setMemberToDelete(member)}
                      disabled={isSelf || isRootAdmin}
                      className={cn(
                        "size-8 rounded-xl cursor-pointer text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive touch-manipulation active:scale-[0.96]",
                        (isSelf || isRootAdmin) &&
                          "opacity-40 cursor-not-allowed hover:bg-transparent hover:text-muted-foreground",
                      )}
                      title={
                        isSelf
                          ? "You cannot delete your own account"
                          : isRootAdmin
                            ? "Primary administrator cannot be deleted"
                            : `Delete ${member.name}`
                      }
                    >
                      <HugeiconsIcon icon={Delete02Icon} className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Member Confirmation Dialog */}
      <AlertDialog
        open={Boolean(memberToDelete)}
        onOpenChange={(open) => !open && setMemberToDelete(null)}
      >
        <AlertDialogContent className="rounded-2xl border-border/80 bg-card sm:max-w-[440px]">
          <AlertDialogHeader>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-destructive/10 text-destructive mb-2">
              <HugeiconsIcon icon={AlertCircleIcon} size={24} />
            </div>
            <AlertDialogTitle className="text-lg font-heading">
              Permanently Delete Member?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-foreground font-semibold">
                {memberToDelete?.name}
              </strong>{" "}
              ({memberToDelete?.email})?
              <br />
              <br />
              This will irreversibly delete their account, student ID records,
              active login sessions, weekly timetable availability, and specific
              date slots. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              disabled={deleting}
              className="rounded-xl cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmDeleteMember();
              }}
              disabled={deleting}
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 cursor-pointer"
            >
              {deleting ? "Deleting..." : "Yes, Delete Member"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Confirmation Dialog */}
      <AlertDialog
        open={Boolean(memberToReset)}
        onOpenChange={(open) => !open && setMemberToReset(null)}
      >
        <AlertDialogContent className="rounded-2xl border-border/80 bg-card sm:max-w-[440px]">
          <AlertDialogHeader>
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-600 dark:text-amber-400 mb-2">
              <HugeiconsIcon icon={LockPasswordIcon} size={24} />
            </div>
            <AlertDialogTitle className="text-lg font-heading">
              Trigger Password Reset?
            </AlertDialogTitle>
            <AlertDialogDescription className="text-xs text-muted-foreground leading-relaxed">
              You are initiating a password reset for{" "}
              <strong className="text-foreground font-semibold">
                {memberToReset?.name}
              </strong>{" "}
              ({memberToReset?.email}).
              <br />
              <br />
              All of their active login sessions will be immediately terminated.
              The next time they attempt to log in, they will be required to
              enter and confirm a brand new password before gaining access to
              the platform.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-4 gap-2">
            <AlertDialogCancel
              disabled={resetting}
              className="rounded-xl cursor-pointer"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                void confirmResetPassword();
              }}
              disabled={resetting}
              className="rounded-xl bg-amber-600 text-white hover:bg-amber-700 cursor-pointer"
            >
              {resetting ? "Resetting..." : "Reset Password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
