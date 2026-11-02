"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { InboxIcon, Tick01Icon, Cancel01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/lib/notify";
import type { AdminPoll } from "@/components/admin/polls-panel";
import { POLL_TYPE_LABEL, pollSummary } from "@/lib/poll-display";

const MAX_REASON = 500;

function timeAgo(iso: string) {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} ${days === 1 ? "day" : "days"} ago`;
}

interface PollRequestsPanelProps {
  /** Called with the new pending count after every load */
  onCountChange?: (count: number) => void;
}

export function PollRequestsPanel({ onCountChange }: PollRequestsPanelProps) {
  const router = useRouter();
  const isMobile = useIsMobile();
  const [requests, setRequests] = React.useState<(AdminPoll & { updatedAt: string })[] | null>(null);
  const [busyId, setBusyId] = React.useState<string | null>(null);
  const [rejecting, setRejecting] = React.useState<AdminPoll | null>(null);
  const [reason, setReason] = React.useState("");

  const load = React.useCallback(async () => {
    const res = await fetch("/api/admin/poll-requests", { cache: "no-store" });
    if (!res.ok) return;
    const data = await res.json();
    setRequests(data.polls);
    onCountChange?.(data.count);
  }, [onCountChange]);

  React.useEffect(() => {
    void load();
  }, [load]);

  async function review(poll: AdminPoll, body: { action: "approve" } | { action: "reject"; reason: string }) {
    setBusyId(poll.id);
    try {
      const res = await fetch(`/api/admin/poll-requests/${poll.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Could not update the request");
      }
      toast.success(body.action === "approve" ? `${poll.name} is live` : "Request rejected");
      setRejecting(null);
      setReason("");
      await load();
      router.refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not update the request");
    } finally {
      setBusyId(null);
    }
  }

  if (!requests) {
    return (
      <div className="flex flex-col gap-3" aria-hidden>
        {[0, 1].map((i) => (
          <div key={i} className="h-40 animate-pulse rounded-3xl border border-border/60 bg-card/60" />
        ))}
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border px-6 py-14 text-center">
        <HugeiconsIcon icon={InboxIcon} size={26} className="text-muted-foreground" />
        <p className="font-heading text-base font-semibold">No requests waiting</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          When a head creates a poll for other committees, it shows up here for
          you to approve.
        </p>
      </div>
    );
  }

  const reasonForm = (
    <div className="space-y-1.5">
      <Label htmlFor="reject-reason" className="text-xs font-semibold text-foreground/80">
        Reason
      </Label>
      <Textarea
        id="reject-reason"
        value={reason}
        maxLength={MAX_REASON}
        onChange={(e) => setReason(e.target.value)}
        placeholder="Tell the head what to change"
        className="min-h-28 rounded-xl"
      />
      <p className="text-right text-[11px] tabular-nums text-muted-foreground">
        {reason.length}/{MAX_REASON}
      </p>
    </div>
  );
  const rejectDisabled = !reason.trim() || busyId === rejecting?.id;
  const confirmReject = () => rejecting && review(rejecting, { action: "reject", reason: reason.trim() });
  const closeReject = (open: boolean) => {
    if (!open) {
      setRejecting(null);
      setReason("");
    }
  };

  return (
    <>
      <ul className="flex flex-col gap-3">
        {requests.map((poll) => {
          const busy = busyId === poll.id;
          return (
            <li key={poll.id} className="rounded-3xl border border-border/70 bg-card/60 p-4 shadow-xs sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
                <h3 className="min-w-0 font-heading text-base font-semibold tracking-tight">{poll.name}</h3>
                <span className="text-xs tabular-nums text-muted-foreground">{timeAgo(poll.updatedAt)}</span>
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {poll.createdBy?.name ?? "Unknown head"}
                {poll.createdBy?.committee ? ` · ${poll.createdBy.committee}` : ""}
              </p>

              <dl className="mt-4 grid gap-3 text-xs sm:grid-cols-2">
                <div>
                  <dt className="font-semibold text-foreground/80">Wants access for</dt>
                  <dd className="mt-1.5 flex flex-wrap gap-1.5">
                    {poll.requestedCommittees.map((c) => (
                      <span key={c} className="rounded-lg bg-amber-500/10 px-2 py-1 font-medium text-amber-800 dark:text-amber-200">
                        {c}
                      </span>
                    ))}
                  </dd>
                </div>
                {poll.committees.length > 0 && (
                  <div>
                    <dt className="font-semibold text-foreground/80">Already live for</dt>
                    <dd className="mt-1.5 flex flex-wrap gap-1.5">
                      {poll.committees.map((c) => (
                        <span key={c} className="rounded-lg bg-emerald-500/10 px-2 py-1 font-medium text-emerald-800 dark:text-emerald-200">
                          {c}
                        </span>
                      ))}
                    </dd>
                  </div>
                )}
                <div>
                  <dt className="font-semibold text-foreground/80">{POLL_TYPE_LABEL[poll.type]}</dt>
                  <dd className="mt-1 tabular-nums text-muted-foreground">{pollSummary(poll)}</dd>
                </div>
              </dl>

              <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border/60 pt-3 sm:flex sm:justify-end">
                <Button
                  variant="outline"
                  disabled={busy}
                  onClick={() => setRejecting(poll)}
                  className="min-h-[44px] cursor-pointer gap-1.5 rounded-xl px-4 text-sm font-semibold touch-manipulation active:scale-[0.97] md:min-h-9"
                >
                  <HugeiconsIcon icon={Cancel01Icon} size={15} />
                  Reject
                </Button>
                <Button
                  disabled={busy}
                  onClick={() => review(poll, { action: "approve" })}
                  className="min-h-[44px] cursor-pointer gap-1.5 rounded-xl bg-emerald-600 px-4 text-sm font-semibold text-white hover:bg-emerald-600/90 touch-manipulation active:scale-[0.97] md:min-h-9"
                >
                  <HugeiconsIcon icon={Tick01Icon} size={15} strokeWidth={2.4} />
                  {busy ? "Approving..." : "Approve"}
                </Button>
              </div>
            </li>
          );
        })}
      </ul>

      {isMobile ? (
        <Drawer open={Boolean(rejecting)} onOpenChange={closeReject}>
          <DrawerContent className="px-4 pb-6">
            <DrawerHeader className="px-0 text-left md:text-left">
              <DrawerTitle className="text-left font-heading text-lg font-bold">Reject {rejecting?.name}?</DrawerTitle>
              <DrawerDescription className="text-left text-xs">The head sees your reason and can edit and resubmit.</DrawerDescription>
            </DrawerHeader>
            {reasonForm}
            <DrawerFooter className="sticky bottom-0 mt-2 px-0">
              <Button
                variant="destructive"
                disabled={rejectDisabled}
                onClick={confirmReject}
                className="h-12 min-h-[48px] w-full rounded-2xl bg-destructive text-sm font-semibold text-white hover:bg-destructive/90 touch-manipulation active:scale-[0.98]"
              >
                Reject request
              </Button>
            </DrawerFooter>
          </DrawerContent>
        </Drawer>
      ) : (
        <Dialog open={Boolean(rejecting)} onOpenChange={closeReject}>
          <DialogContent className="max-w-md rounded-2xl">
            <DialogHeader>
              <DialogTitle>Reject {rejecting?.name}?</DialogTitle>
              <DialogDescription className="text-xs">The head sees your reason and can edit and resubmit.</DialogDescription>
            </DialogHeader>
            {reasonForm}
            <DialogFooter>
              <Button variant="ghost" onClick={() => closeReject(false)} className="cursor-pointer rounded-xl">
                Cancel
              </Button>
              <Button disabled={rejectDisabled} onClick={confirmReject} className="cursor-pointer rounded-xl bg-destructive text-white hover:bg-destructive/90">
                Reject request
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
