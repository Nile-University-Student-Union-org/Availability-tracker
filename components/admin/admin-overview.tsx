"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  ArrowRight01Icon,
  Calendar03Icon,
  Clock01Icon,
  InboxIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import {
  ResponseMeter,
  StatusPill,
  type AdminPoll,
  type PollViewer,
} from "@/components/admin/poll-badges";
import { POLL_TYPE_LABEL, pollSummary } from "@/lib/poll-display";
import { cn } from "@/lib/utils";

interface AdminOverviewProps {
  viewer: PollViewer;
  polls: AdminPoll[];
  pendingCount: number;
  onOpenPoll: (id: string, view?: "results" | "settings") => void;
  onOpenRequests: () => void;
  onNewPoll: () => void;
}

function SectionTitle({ children, count }: { children: React.ReactNode; count?: number }) {
  return (
    <h2 className="flex items-baseline gap-2 text-sm font-semibold text-foreground">
      {children}
      {count !== undefined && (
        <span className="text-xs font-medium tabular-nums text-muted-foreground">{count}</span>
      )}
    </h2>
  );
}

function PollRow({ poll, onOpen }: { poll: AdminPoll; onOpen: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="group flex w-full min-h-[56px] cursor-pointer items-center gap-4 rounded-2xl border border-border/70 bg-card/60 p-4 text-left shadow-xs transition-[background-color,transform] duration-150 touch-manipulation hover:bg-card active:scale-[0.99] sm:p-5"
      >
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-xl",
            poll.type === "date"
              ? "bg-sky-500/10 text-sky-700 dark:text-sky-300"
              : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
          )}
        >
          <HugeiconsIcon icon={poll.type === "date" ? Calendar03Icon : Clock01Icon} size={18} />
        </span>
        <span className="min-w-0 flex-1 space-y-2.5">
          <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="truncate font-heading text-sm font-semibold tracking-tight">{poll.name}</span>
            <span className="text-xs text-muted-foreground">
              {POLL_TYPE_LABEL[poll.type]} · <span className="tabular-nums">{pollSummary(poll)}</span>
            </span>
          </span>
          <ResponseMeter poll={poll} />
        </span>
        <HugeiconsIcon
          icon={ArrowRight01Icon}
          size={18}
          className="shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5"
        />
      </button>
    </li>
  );
}

/**
 * Admin home: what needs a decision first, then how live polls are filling in,
 * then closed polls. Every row opens the poll's results.
 */
export function AdminOverview({
  viewer,
  polls,
  pendingCount,
  onOpenPoll,
  onOpenRequests,
  onNewPoll,
}: AdminOverviewProps) {
  const mine = (p: AdminPoll) => p.createdById === viewer.id;
  const rejected = polls.filter((p) => p.requestStatus === "rejected" && mine(p));
  const waiting = polls.filter((p) => p.requestStatus === "pending" && mine(p));
  const live = polls.filter((p) => p.active && !p.requestStatus);
  const closed = polls.filter((p) => !p.active && !p.requestStatus);
  const canCreate = viewer.isSuperAdmin || Boolean(viewer.committee);
  const attention = (viewer.isSuperAdmin && pendingCount > 0) || rejected.length > 0 || waiting.length > 0;

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      {attention && (
        <section className="space-y-3">
          <SectionTitle>Needs your attention</SectionTitle>
          <ul className="flex flex-col gap-2">
            {viewer.isSuperAdmin && pendingCount > 0 && (
              <li>
                <button
                  type="button"
                  onClick={onOpenRequests}
                  className="flex w-full min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl border border-amber-500/30 bg-amber-500/[0.08] p-4 text-left transition-transform duration-150 touch-manipulation active:scale-[0.99]"
                >
                  <HugeiconsIcon icon={InboxIcon} size={18} className="shrink-0 text-amber-700 dark:text-amber-300" />
                  <span className="flex-1 text-sm">
                    <span className="font-semibold tabular-nums">{pendingCount}</span>{" "}
                    {pendingCount === 1 ? "poll is" : "polls are"} waiting for your approval
                  </span>
                  <HugeiconsIcon icon={ArrowRight01Icon} size={18} className="shrink-0 text-muted-foreground" />
                </button>
              </li>
            )}
            {rejected.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => onOpenPoll(p.id, "settings")}
                  className="flex w-full min-h-[56px] cursor-pointer items-start gap-3 rounded-2xl border border-destructive/25 bg-destructive/[0.05] p-4 text-left transition-transform duration-150 touch-manipulation active:scale-[0.99]"
                >
                  <HugeiconsIcon icon={AlertCircleIcon} size={18} className="mt-0.5 shrink-0 text-destructive" />
                  <span className="min-w-0 flex-1 text-sm">
                    <span className="font-semibold">{p.name}</span> was rejected
                    {p.rejectionReason && (
                      <span className="mt-0.5 block text-xs text-muted-foreground text-pretty">“{p.rejectionReason}”</span>
                    )}
                  </span>
                  <span className="shrink-0 self-center text-xs font-semibold text-foreground">Edit</span>
                </button>
              </li>
            ))}
            {waiting.map((p) => (
              <li
                key={p.id}
                className="flex items-center gap-3 rounded-2xl border border-border/70 bg-card/60 p-4 text-sm"
              >
                <StatusPill poll={p} />
                <span className="min-w-0 truncate">
                  <span className="font-semibold">{p.name}</span>
                  <span className="text-muted-foreground"> · {p.requestedCommittees.join(", ")}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <SectionTitle count={live.length}>Live polls</SectionTitle>
          {canCreate && (
            <Button
              onClick={onNewPoll}
              className="min-h-[44px] cursor-pointer gap-2 rounded-xl px-4 text-sm font-semibold touch-manipulation active:scale-[0.97] md:min-h-9"
            >
              <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={2.2} />
              New poll
            </Button>
          )}
        </div>
        {live.length === 0 ? (
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
            <p className="text-sm font-semibold">Nothing is open right now</p>
            <p className="max-w-sm text-sm text-muted-foreground">
              {canCreate ? "Create a poll to start collecting availability." : "Polls your committee can see will appear here."}
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-2">
            {live.map((p) => (
              <PollRow key={p.id} poll={p} onOpen={() => onOpenPoll(p.id)} />
            ))}
          </ul>
        )}
      </section>

      {closed.length > 0 && (
        <section className="space-y-3">
          <SectionTitle count={closed.length}>Closed</SectionTitle>
          <ul className="flex flex-col gap-2 opacity-90">
            {closed.map((p) => (
              <PollRow key={p.id} poll={p} onOpen={() => onOpenPoll(p.id)} />
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
