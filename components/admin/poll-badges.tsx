"use client";

import * as React from "react";
import type { PollType } from "@/lib/poll-display";
import { cn } from "@/lib/utils";

export type AdminPoll = {
  id: string;
  name: string;
  type: PollType;
  active: boolean;
  allCommittees: boolean;
  committees: string[];
  requestedCommittees: string[];
  requestStatus: "pending" | "rejected" | null;
  rejectionReason: string | null;
  createdById: string | null;
  createdAt: string;
  startDate: string | null;
  endDate: string | null;
  weeklyDays: number[];
  createdBy: { name: string; email: string; committee?: string | null } | null;
  /** Members who answered, when the list API includes it */
  respondents?: number;
  /** Members the poll is open to */
  audience?: number;
};

export type PollViewer = {
  id: string;
  committee: string | null;
  isSuperAdmin: boolean;
};

type Status = "live" | "pending" | "rejected" | "closed";

function statusOf(poll: AdminPoll): Status {
  if (poll.requestStatus === "pending") return "pending";
  if (poll.requestStatus === "rejected") return "rejected";
  return poll.active ? "live" : "closed";
}

const STATUS_STYLE: Record<Status, { label: string; className: string; dot: string }> = {
  live: {
    label: "Live",
    className: "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 ring-emerald-500/25",
    dot: "bg-emerald-500",
  },
  pending: {
    label: "Waiting for approval",
    className: "text-amber-700 dark:text-amber-300 bg-amber-500/10 ring-amber-500/25",
    dot: "bg-amber-500",
  },
  rejected: {
    label: "Rejected",
    className: "text-destructive bg-destructive/10 ring-destructive/25",
    dot: "bg-destructive",
  },
  closed: {
    label: "Closed",
    className: "text-muted-foreground bg-muted ring-border",
    dot: "bg-muted-foreground/60",
  },
};

export function StatusPill({ poll }: { poll: AdminPoll }) {
  const status = statusOf(poll);
  // A live poll can still have extra committees waiting
  const style =
    status === "live" && poll.requestedCommittees.length && poll.requestStatus
      ? STATUS_STYLE.pending
      : STATUS_STYLE[status];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ring-1 ring-inset",
        style.className,
      )}
    >
      <span className={cn("size-1.5 rounded-full", style.dot)} />
      {style.label}
    </span>
  );
}

/** Committee chips: live ones solid, waiting ones dashed */
export function CommitteeChips({ poll }: { poll: AdminPoll }) {
  if (poll.allCommittees) {
    return (
      <span className="rounded-lg bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground">
        All committees
      </span>
    );
  }
  return (
    <>
      {poll.committees.map((c) => (
        <span
          key={c}
          className="rounded-lg bg-emerald-500/10 px-2 py-1 text-[11px] font-medium text-emerald-800 dark:text-emerald-200"
        >
          {c}
        </span>
      ))}
      {poll.requestedCommittees.map((c) => (
        <span
          key={`req-${c}`}
          title={poll.requestStatus === "rejected" ? "Rejected" : "Waiting for approval"}
          className="rounded-lg border border-dashed border-amber-500/50 px-2 py-0.5 text-[11px] font-medium text-amber-800 dark:text-amber-200"
        >
          {c}
        </span>
      ))}
    </>
  );
}


/** "12 of 40 answered" with a thin progress bar */
export function ResponseMeter({ poll, className }: { poll: AdminPoll; className?: string }) {
  if (poll.audience === undefined || poll.respondents === undefined) return null;
  const pct = poll.audience ? Math.min(100, Math.round((poll.respondents / poll.audience) * 100)) : 0;
  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-baseline justify-between gap-3 text-xs">
        <span className="text-muted-foreground">
          <span className="font-semibold text-foreground tabular-nums">{poll.respondents}</span> of{" "}
          <span className="tabular-nums">{poll.audience}</span> members answered
        </span>
        <span className="font-semibold tabular-nums text-muted-foreground">{pct}%</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={pct}
        aria-label="Members who answered"
        className="h-1.5 overflow-hidden rounded-full bg-foreground/[0.07]"
      >
        <div
          className="h-full origin-left rounded-full bg-emerald-500 transition-transform duration-500 ease-out motion-reduce:transition-none"
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
    </div>
  );
}
