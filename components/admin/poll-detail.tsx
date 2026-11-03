"use client";

import * as React from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { ArrowLeft01Icon } from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  AnalyticsDashboard,
  type AnalyticsData,
} from "@/components/admin/analytics-dashboard";
import { SemesterAnalyticsPanel } from "@/components/admin/semester-analytics-panel";
import type { SemesterAnalyticsData } from "@/lib/semester-analytics";
import { POLL_TYPE_LABEL, pollSummary } from "@/lib/poll-display";
import {
  CommitteeChips,
  ResponseMeter,
  StatusPill,
  type AdminPoll,
} from "@/components/admin/poll-badges";

export type PollDetailTab = "results" | "settings";

/** Loads one poll's results from the matching analytics API */
function PollResults({ poll }: { poll: AdminPoll }) {
  const [data, setData] = React.useState<
    AnalyticsData | SemesterAnalyticsData | null
  >(null);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    const url =
      poll.type === "date"
        ? `/api/admin/analytics?pollId=${encodeURIComponent(poll.id)}`
        : `/api/admin/recurring-analytics?pollId=${encodeURIComponent(poll.id)}`;
    fetch(url, { cache: "no-store" })
      .then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(new Error("Could not load results")),
      )
      .then((json) => !cancelled && setData(json))
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [poll.id, poll.type]);

  if (error) {
    return (
      <div
        role="alert"
        className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
      >
        {error}
      </div>
    );
  }
  if (!data) {
    return (
      <div className="flex flex-col gap-3" aria-hidden>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-2xl border border-border/60 bg-card/60"
            />
          ))}
        </div>
        <div className="h-72 animate-pulse rounded-3xl border border-border/60 bg-card/60" />
      </div>
    );
  }
  return poll.type === "date" ? (
    <AnalyticsDashboard
      data={data as AnalyticsData}
      pollId={poll.id}
      pollCommittees={poll.allCommittees ? undefined : poll.committees}
    />
  ) : (
    <SemesterAnalyticsPanel
      initialData={data as SemesterAnalyticsData}
      pollId={poll.id}
      pollCommittees={poll.allCommittees ? undefined : poll.committees}
    />
  );
}

interface PollDetailProps {
  poll: AdminPoll;
  tab: PollDetailTab;
  canEdit: boolean;
  onTabChange: (tab: PollDetailTab) => void;
  onBack: () => void;
  /** The poll editor, shown on the Settings tab */
  settings: React.ReactNode;
}

/** One poll: its results first, its settings one tap away */
export function PollDetail({
  poll,
  tab,
  canEdit,
  onTabChange,
  onBack,
  settings,
}: PollDetailProps) {
  const shownTab = canEdit ? tab : "results";
  return (
    <div className="flex flex-col gap-5">
      <div>
        <Button
          variant="ghost"
          onClick={onBack}
          className="-ml-2 min-h-[44px] cursor-pointer gap-1.5 px-2.5 text-sm font-semibold touch-manipulation md:min-h-9"
        >
          <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
          All polls
        </Button>
      </div>

      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-heading text-xl font-bold tracking-tight text-balance">
              {poll.name}
            </h2>
            <StatusPill poll={poll} />
          </div>
          <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
            <span>{POLL_TYPE_LABEL[poll.type]}</span>
            <span className="whitespace-nowrap tabular-nums">
              · {pollSummary(poll)}
            </span>
          </p>
          <div className="flex flex-wrap gap-1.5">
            <CommitteeChips poll={poll} />
          </div>
          <ResponseMeter poll={poll} className="max-w-xs" />
        </div>
        {canEdit && (
          <SegmentedControl
            variant="tabs"
            aria-label="Poll view"
            value={shownTab}
            onChange={onTabChange}
            options={[
              { value: "results", label: "Results" },
              { value: "settings", label: "Settings" },
            ]}
            className="w-full sm:w-56"
          />
        )}
      </div>

      {shownTab === "results" ? (
        <div key="results" className="motion-enter">
          <PollResults poll={poll} />
        </div>
      ) : (
        <div key="settings" className="motion-enter max-w-2xl">
          {settings}
        </div>
      )}
    </div>
  );
}
