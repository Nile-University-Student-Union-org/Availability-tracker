"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  UserGroupIcon,
  Search01Icon,
  Delete02Icon,
  RefreshIcon,
  Add01Icon,
  AlertCircleIcon,
  Briefcase01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
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
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export interface CommitteeData {
  id: string;
  name: string;
  memberCount: number;
  createdAt: string;
}

export function AdminCommitteesPanel() {
  const [committees, setCommittees] = React.useState<CommitteeData[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [searchQuery, setSearchQuery] = React.useState("");

  // Add Committee State
  const [newCommitteeName, setNewCommitteeName] = React.useState("");
  const [adding, setAdding] = React.useState(false);

  // Delete Committee State
  const [committeeToDelete, setCommitteeToDelete] =
    React.useState<CommitteeData | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const fetchCommittees = React.useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/committees");
      if (!res.ok) {
        throw new Error("Failed to load committees");
      }
      const data = await res.json();
      setCommittees(data.committees ?? []);
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Could not fetch committees";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void fetchCommittees();
  }, [fetchCommittees]);

  // Handle Adding New Committee
  async function handleAddCommittee(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newCommitteeName.trim();
    if (!trimmed) {
      toast.error("Please enter a committee name.");
      return;
    }

    try {
      setAdding(true);
      const res = await fetch("/api/admin/committees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: trimmed }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create committee");
      }

      toast.success(data.message || `Committee "${trimmed}" created!`);
      setNewCommitteeName("");
      await fetchCommittees();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to create committee";
      toast.error(message);
    } finally {
      setAdding(false);
    }
  }

  // Handle Deleting Committee
  async function confirmDeleteCommittee() {
    if (!committeeToDelete) return;

    try {
      setDeleting(true);
      const res = await fetch("/api/admin/committees", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: committeeToDelete.id }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to delete committee");
      }

      toast.success(
        data.message || `Committee "${committeeToDelete.name}" deleted.`,
      );
      setCommitteeToDelete(null);
      await fetchCommittees();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to delete committee";
      toast.error(message);
    } finally {
      setDeleting(false);
    }
  }

  const filteredCommittees = React.useMemo(() => {
    return committees.filter((c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
    );
  }, [committees, searchQuery]);

  const totalMembersAssigned = React.useMemo(() => {
    return committees.reduce((acc, c) => acc + c.memberCount, 0);
  }, [committees]);

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-xs backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Total Committees
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <HugeiconsIcon icon={Briefcase01Icon} className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-foreground font-heading">
              {loading ? <Skeleton className="h-8 w-12" /> : committees.length}
            </span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Active union bodies & teams
            </p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-5 shadow-xs backdrop-blur-sm">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              Assigned Members
            </span>
            <div className="flex size-8 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
              <HugeiconsIcon icon={UserGroupIcon} className="size-4" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-bold tracking-tight text-foreground font-heading">
              {loading ? (
                <Skeleton className="h-8 w-12" />
              ) : (
                totalMembersAssigned
              )}
            </span>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Members affiliated with committees
            </p>
          </div>
        </div>
      </div>

      {/* Add Committee Bar */}
      <div className="rounded-2xl border border-border/60 bg-card/70 p-4 shadow-xs backdrop-blur-sm sm:p-5">
        <h2 className="text-sm font-semibold text-foreground font-heading">
          Create New Committee
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Add a new Nile University Student Union committee or initiative. It
          will immediately appear in member registration and filters.
        </p>

        <form
          onSubmit={handleAddCommittee}
          className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:items-center"
        >
          <div className="relative flex-1">
            <HugeiconsIcon
              icon={Briefcase01Icon}
              className="absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-muted-foreground"
            />
            <Input
              type="text"
              placeholder="e.g. Media & Design, Sponsorship, Events..."
              value={newCommitteeName}
              onChange={(e) => setNewCommitteeName(e.target.value)}
              className="min-h-[44px] rounded-xl pl-10 text-sm"
              disabled={adding}
            />
          </div>

          <Button
            type="submit"
            disabled={adding || !newCommitteeName.trim()}
            className="min-h-[44px] cursor-pointer touch-manipulation rounded-xl px-5 font-semibold active:scale-[0.98]"
          >
            <HugeiconsIcon icon={Add01Icon} className="mr-1.5 size-4" />
            {adding ? "Creating..." : "Add Committee"}
          </Button>
        </form>
      </div>

      {/* Committees Directory Controls */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative flex-1 max-w-sm">
          <HugeiconsIcon
            icon={Search01Icon}
            className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            placeholder="Search committees..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-10 rounded-xl pl-9 text-xs sm:text-sm"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={fetchCommittees}
          disabled={loading}
          className="h-10 cursor-pointer rounded-xl text-xs gap-1.5 self-start sm:self-auto"
        >
          <HugeiconsIcon
            icon={RefreshIcon}
            className={cn("size-3.5", loading && "animate-spin")}
          />
          Refresh List
        </Button>
      </div>

      {/* Committees List Table */}
      <div className="overflow-hidden rounded-2xl border border-border/70 bg-card/60 shadow-xs backdrop-blur-sm">
        {loading ? (
          <div className="divide-y divide-border/40 p-4 space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between py-2">
                <div className="flex items-center gap-3">
                  <Skeleton className="size-9 rounded-xl" />
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-32" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="h-8 w-16" />
              </div>
            ))}
          </div>
        ) : filteredCommittees.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex size-12 items-center justify-center rounded-2xl bg-muted/60 text-muted-foreground mb-3">
              <HugeiconsIcon icon={Briefcase01Icon} className="size-6" />
            </div>
            <p className="text-sm font-semibold text-foreground">
              No committees found
            </p>
            <p className="text-xs text-muted-foreground mt-1 max-w-sm">
              {searchQuery
                ? `No committees match "${searchQuery}".`
                : "No committees have been registered yet."}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-border/40">
            {filteredCommittees.map((committee) => (
              <div
                key={committee.id}
                className="flex items-center justify-between p-4 transition-colors hover:bg-muted/30 sm:px-6"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20">
                    <HugeiconsIcon
                      icon={Briefcase01Icon}
                      className="size-4.5"
                    />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-sm font-semibold text-foreground">
                        {committee.name}
                      </h3>
                      <Badge
                        variant="secondary"
                        className="rounded-lg text-[10px] font-medium px-2 py-0.5 bg-muted/70"
                      >
                        {committee.memberCount}{" "}
                        {committee.memberCount === 1 ? "member" : "members"}
                      </Badge>
                    </div>
                    <p className="text-[11px] text-muted-foreground mt-0.5">
                      Created on{" "}
                      {new Date(committee.createdAt).toLocaleDateString(
                        undefined,
                        {
                          year: "numeric",
                          month: "short",
                          day: "numeric",
                        },
                      )}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCommitteeToDelete(committee)}
                    className="min-h-[38px] cursor-pointer rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive text-xs gap-1.5"
                    title={`Delete committee ${committee.name}`}
                  >
                    <HugeiconsIcon icon={Delete02Icon} className="size-3.5" />
                    <span className="hidden sm:inline">Delete</span>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation Alert Dialog */}
      <AlertDialog
        open={Boolean(committeeToDelete)}
        onOpenChange={(open) => {
          if (!open) setCommitteeToDelete(null);
        }}
      >
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <div className="flex size-10 items-center justify-center rounded-xl bg-destructive/10 text-destructive mb-2">
              <HugeiconsIcon icon={AlertCircleIcon} className="size-5" />
            </div>
            <AlertDialogTitle>Delete Committee</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2 text-xs">
              <p>
                Are you sure you want to delete the committee{" "}
                <strong className="text-foreground">
                  &quot;{committeeToDelete?.name}&quot;
                </strong>
                ?
              </p>
              {committeeToDelete && committeeToDelete.memberCount > 0 && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-amber-700 dark:text-amber-400">
                  <strong>Notice:</strong> There are currently{" "}
                  <strong>{committeeToDelete.memberCount} members</strong>{" "}
                  assigned to this committee. Deleting it will keep their
                  accounts intact, but will set their committee affiliation to
                  unassigned.
                </div>
              )}
              <p className="text-muted-foreground">
                This action cannot be undone.
              </p>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel
              disabled={deleting}
              className="cursor-pointer rounded-xl"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteCommittee}
              disabled={deleting}
              className="bg-destructive hover:bg-destructive/90 text-destructive-foreground cursor-pointer rounded-xl"
            >
              {deleting ? "Deleting..." : "Confirm & Delete Committee"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
