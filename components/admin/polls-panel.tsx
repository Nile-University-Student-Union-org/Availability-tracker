"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  AlertCircleIcon,
  Analytics01Icon,
  ArrowLeft01Icon,
  Calendar03Icon,
  Clock01Icon,
  Delete02Icon,
  MailSend01Icon,
  PencilEdit02Icon,
  PlusSignIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
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
  ScheduleConfigPanel,
  validateScheduleConfig,
  type ScheduleConfigData,
} from "@/components/admin/schedule-config-panel";
import { PollDetail, type PollDetailTab } from "@/components/admin/poll-detail";
import { createAudience, editAudience } from "@/lib/poll-access";
import { legacyWeeklySchedule } from "@/lib/weekly-slots";
import {
  POLL_TYPE_LABEL,
  pollSummary,
  type PollType,
} from "@/lib/poll-display";
import { toast } from "@/lib/notify";
import { cn } from "@/lib/utils";

export {
  CommitteeChips,
  ResponseMeter,
  StatusPill,
  type AdminPoll,
  type PollViewer,
} from "@/components/admin/poll-badges";
import {
  CommitteeChips,
  ResponseMeter,
  StatusPill,
  type AdminPoll,
  type PollViewer,
} from "@/components/admin/poll-badges";

interface PollsPanelProps {
  viewer: PollViewer;
  committees: string[];
}

export function PollsPanel({ viewer, committees }: PollsPanelProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  // useSearchParams lags a render behind history.replaceState, so on the
  // client read the live URL; the server render uses the request params
  const params =
    typeof window === "undefined"
      ? searchParams
      : new URLSearchParams(window.location.search);
  const [polls, setPolls] = React.useState<AdminPoll[] | null>(null);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [creating, setCreating] = React.useState(params.get("new") === "1");
  // An open poll lives in the URL (?poll=<id>&view=settings), so links land on it
  const [openId, setOpenId] = React.useState<string | null>(params.get("poll"));
  const [detailTab, setDetailTab] = React.useState<PollDetailTab>(
    params.get("view") === "settings" ? "settings" : "results",
  );

  function openPoll(id: string | null, tab: PollDetailTab = "results") {
    setOpenId(id);
    setDetailTab(tab);
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("poll", id);
    else url.searchParams.delete("poll");
    if (id && tab === "settings") url.searchParams.set("view", "settings");
    else url.searchParams.delete("view");
    window.history.replaceState({}, "", url.toString());
  }
  const [toDelete, setToDelete] = React.useState<AdminPoll | null>(null);
  const [deleting, setDeleting] = React.useState(false);

  const load = React.useCallback(async () => {
    try {
      const res = await fetch("/api/admin/polls", { cache: "no-store" });
      if (!res.ok) throw new Error("Could not load polls");
      const data = await res.json();
      setPolls(data.polls);
      setLoadError(null);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : "Could not load polls");
    }
  }, []);

  React.useEffect(() => {
    void load();
  }, [load]);

  // Switching between the list, a poll and the editor starts at the top
  React.useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [creating, openId]);

  const canEdit = (poll: AdminPoll) =>
    viewer.isSuperAdmin || poll.createdById === viewer.id;
  const canCreate = viewer.isSuperAdmin || Boolean(viewer.committee);

  async function confirmDelete() {
    if (!toDelete) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/polls/${toDelete.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Could not delete the poll");
      }
      toast.success("Poll deleted");
      setToDelete(null);
      await load();
      router.refresh();
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : "Could not delete the poll",
      );
    } finally {
      setDeleting(false);
    }
  }

  if (creating) {
    return (
      <div>
        <PollEditor
          poll={null}
          viewer={viewer}
          committees={committees}
          onDone={async () => {
            setCreating(false);
            await load();
            router.refresh();
          }}
          onCancel={() => setCreating(false)}
        />
      </div>
    );
  }

  const opened = openId ? polls?.find((p) => p.id === openId) : undefined;
  if (openId && polls && !opened) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-border px-6 py-14 text-center">
        <p className="font-heading text-base font-semibold">
          This poll isn&apos;t available
        </p>
        <p className="max-w-sm text-sm text-muted-foreground">
          It may have been deleted, or it isn&apos;t shared with your committee.
        </p>
        <Button
          variant="outline"
          onClick={() => openPoll(null)}
          className="min-h-[44px] cursor-pointer md:min-h-9"
        >
          All polls
        </Button>
      </div>
    );
  }
  if (opened) {
    return (
      <PollDetail
        poll={opened}
        tab={detailTab}
        canEdit={canEdit(opened)}
        onTabChange={(tab) => openPoll(opened.id, tab)}
        onBack={() => openPoll(null)}
        settings={
          <PollEditor
            key={opened.id}
            embedded
            poll={opened}
            viewer={viewer}
            committees={committees}
            onDone={async () => {
              await load();
              openPoll(opened.id, "results");
              router.refresh();
            }}
            onCancel={() => openPoll(opened.id, "results")}
          />
        }
      />
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          {polls
            ? `${polls.length} ${polls.length === 1 ? "poll" : "polls"}`
            : "Loading polls"}
        </p>
        {canCreate && (
          <Button
            onClick={() => setCreating(true)}
            className="min-h-[44px] cursor-pointer gap-2 px-4 text-sm font-semibold touch-manipulation active:scale-[0.97] md:min-h-10"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={16} strokeWidth={2.2} />
            New poll
          </Button>
        )}
      </div>

      {!canCreate && (
        <div className="flex items-start gap-3 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-200">
          <HugeiconsIcon
            icon={AlertCircleIcon}
            size={18}
            className="mt-0.5 shrink-0"
          />
          <p>
            Set your committee in your profile before creating polls. Your
            committee decides which polls go live without approval.
          </p>
        </div>
      )}

      {loadError && (
        <div
          role="alert"
          className="rounded-2xl border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive"
        >
          {loadError}{" "}
          <button
            type="button"
            onClick={() => void load()}
            className="cursor-pointer font-semibold underline underline-offset-4"
          >
            Try again
          </button>
        </div>
      )}

      {!polls && !loadError && (
        <div
          className="flex flex-col gap-3"
          aria-busy="true"
          aria-label="Loading polls"
        >
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              className="flex min-h-[76px] items-center gap-4 rounded-3xl border border-border/60 bg-card/60 p-4"
            >
              <Skeleton className="size-11 rounded-2xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-3 w-32" />
              </div>
            </div>
          ))}
        </div>
      )}

      {polls && polls.length === 0 && (
        <div className="flex flex-col items-center gap-2 rounded-3xl border border-dashed border-border px-6 py-14 text-center">
          <HugeiconsIcon
            icon={Calendar03Icon}
            size={26}
            className="text-muted-foreground"
          />
          <p className="font-heading text-base font-semibold">No polls yet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Create a poll, pick the committees that should fill it, and the
            members will see it on their polls page.
          </p>
        </div>
      )}

      <ul className="flex flex-col gap-3">
        {polls?.map((poll) => (
          <li
            key={poll.id}
            className="rounded-3xl border border-border/70 bg-card/60 p-4 shadow-xs sm:p-5"
          >
            <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={() => openPoll(poll.id)}
                className="min-w-0 cursor-pointer text-left outline-none focus-visible:underline"
              >
                <h3 className="truncate font-heading text-base font-semibold tracking-tight hover:underline hover:underline-offset-4">
                  {poll.name}
                </h3>
                {/* Each separator travels with the item after it, so wraps never start with a dot */}
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-xs text-muted-foreground">
                  <span>{POLL_TYPE_LABEL[poll.type]}</span>
                  <span className="whitespace-nowrap tabular-nums">
                    · {pollSummary(poll)}
                  </span>
                  {viewer.isSuperAdmin && poll.createdBy && (
                    <span className="whitespace-nowrap">
                      · by {poll.createdBy.name}
                    </span>
                  )}
                </p>
              </button>
              <StatusPill poll={poll} />
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              <CommitteeChips poll={poll} />
            </div>

            {!poll.requestStatus && (
              <ResponseMeter poll={poll} className="mt-4" />
            )}

            {poll.requestStatus === "rejected" && poll.rejectionReason && (
              <div className="mt-3 rounded-2xl bg-destructive/5 px-3.5 py-2.5 text-xs text-foreground/90">
                <span className="font-semibold text-destructive">Reason: </span>
                {poll.rejectionReason}
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
              <Button
                variant="ghost"
                onClick={() => openPoll(poll.id)}
                className="min-h-[44px] cursor-pointer gap-1.5 px-3 text-xs font-semibold touch-manipulation md:min-h-9"
              >
                <HugeiconsIcon icon={Analytics01Icon} size={15} />
                Results
              </Button>
              {canEdit(poll) && (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => openPoll(poll.id, "settings")}
                    className="min-h-[44px] cursor-pointer gap-1.5 px-3 text-xs font-semibold touch-manipulation md:min-h-9"
                  >
                    <HugeiconsIcon icon={PencilEdit02Icon} size={15} />
                    {poll.requestStatus === "rejected"
                      ? "Edit and resubmit"
                      : "Edit"}
                  </Button>
                  {!poll.allCommittees && (
                    <Button
                      variant="destructive"
                      onClick={() => setToDelete(poll)}
                      className="ml-auto min-h-[44px] cursor-pointer gap-1.5 px-3 text-xs font-semibold touch-manipulation md:min-h-9"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={15} />
                      Delete
                    </Button>
                  )}
                </>
              )}
            </div>
          </li>
        ))}
      </ul>

      <AlertDialog
        open={Boolean(toDelete)}
        onOpenChange={(open) => {
          if (!open) setToDelete(null);
        }}
      >
        <AlertDialogContent className="max-w-md rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this poll?</AlertDialogTitle>
            <AlertDialogDescription className="text-xs">
              <strong className="text-foreground">{toDelete?.name}</strong> and
              every answer members gave to it will be removed. This cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-2">
            <AlertDialogCancel disabled={deleting} className="cursor-pointer">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={confirmDelete}
              disabled={deleting}
              aria-busy={deleting}
              className="cursor-pointer"
            >
              {deleting ? (
                <>
                  <Spinner className="size-4" label="Deleting" />
                  <span>Deleting...</span>
                </>
              ) : (
                "Delete poll"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Editor ──────────────────────────────────────────────────────────────────

type PollConfigResponse = {
  startDate: string | null;
  endDate: string | null;
  slotMode: "fixed" | "free";
  timeSlots: string[];
  slotEnds: Record<string, string>;
  weeklyDays: number[];
  weeklySlots: ScheduleConfigData["weeklySlots"];
};

interface PollEditorProps {
  /** Inside a poll page, which already shows the back link and title */
  embedded?: boolean;
  poll: AdminPoll | null;
  viewer: PollViewer;
  committees: string[];
  onDone: () => void | Promise<void>;
  onCancel: () => void;
}

function PollEditor({
  embedded = false,
  poll,
  viewer,
  committees,
  onDone,
  onCancel,
}: PollEditorProps) {
  const isNew = !poll;
  const [chosen, setChosen] = React.useState<string[]>(() =>
    poll
      ? [...poll.committees, ...poll.requestedCommittees]
      : viewer.committee
        ? [viewer.committee]
        : [],
  );
  // All-committee polls keep that audience until someone picks committees
  const [touchedCommittees, setTouchedCommittees] = React.useState(false);
  const [name, setName] = React.useState(poll?.name ?? "");
  const [type, setType] = React.useState<PollType>(poll?.type ?? "date");
  const [active, setActive] = React.useState(poll?.active ?? true);
  const [initialConfig, setInitialConfig] =
    React.useState<ScheduleConfigData | null>(null);
  const configRef = React.useRef<ScheduleConfigData | null>(null);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!poll) {
      const weekly = legacyWeeklySchedule();
      setInitialConfig({
        startDate: "",
        endDate: "",
        slotMode: "fixed",
        timeSlots: [],
        weeklyDays: weekly.weeklyDays,
        weeklySlots: weekly.weeklySlots,
      });
      return;
    }
    let cancelled = false;
    fetch(`/api/admin/polls/${poll.id}`, { cache: "no-store" })
      .then((res) =>
        res.ok
          ? res.json()
          : Promise.reject(new Error("Could not load this poll")),
      )
      .then(({ config }: { config: PollConfigResponse }) => {
        if (cancelled) return;
        setInitialConfig({
          startDate: config.startDate ?? "",
          endDate: config.endDate ?? "",
          slotMode: config.slotMode,
          timeSlots: config.timeSlots,
          slotEnds: config.slotEnds,
          weeklyDays: config.weeklyDays,
          weeklySlots: config.weeklySlots,
        });
      })
      .catch((err: Error) => !cancelled && setError(err.message));
    return () => {
      cancelled = true;
    };
  }, [poll]);

  const onConfigChange = React.useCallback((config: ScheduleConfigData) => {
    configRef.current = config;
  }, []);

  const keepsAllCommittees = Boolean(poll?.allCommittees && !touchedCommittees);
  const audience = keepsAllCommittees
    ? null
    : poll
      ? editAudience(
          poll.committees,
          chosen,
          viewer.committee,
          viewer.isSuperAdmin,
        )
      : createAudience(viewer.committee, chosen, viewer.isSuperAdmin);
  const needsApproval = audience?.requestStatus === "pending";
  const showDetails = !isNew || chosen.length > 0;

  function toggleCommittee(committee: string) {
    setTouchedCommittees(true);
    setChosen((prev) =>
      prev.includes(committee)
        ? prev.filter((c) => c !== committee)
        : [...prev, committee],
    );
  }

  async function submit() {
    setError(null);
    const config = configRef.current;
    if (!keepsAllCommittees && chosen.length === 0)
      return setError("Pick at least one committee.");
    if (!name.trim()) return setError("Give the poll a name.");
    if (!config) return setError("The schedule is still loading.");
    const problem = validateScheduleConfig(config, type);
    if (problem) return setError(problem);

    const weeklyDays = config.weeklyDays ?? [];
    const schedule =
      type === "date"
        ? {
            startDate: config.startDate,
            endDate: config.endDate,
            slotMode: config.slotMode,
            timeSlots: config.timeSlots,
            slotEnds: config.slotEnds,
          }
        : {
            weeklyDays,
            weeklySlots: (config.weeklySlots ?? []).filter((s) =>
              weeklyDays.includes(s.dayOfWeek),
            ),
          };

    setSaving(true);
    try {
      const res = await fetch(
        poll ? `/api/admin/polls/${poll.id}` : "/api/admin/polls",
        {
          method: poll ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: name.trim(),
            ...(poll ? { active } : { type }),
            ...(keepsAllCommittees ? {} : { committees: chosen }),
            ...schedule,
          }),
        },
      );
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error || "Could not save the poll");
      }
      toast.success(
        needsApproval ? "Request sent to the superadmins" : "Poll saved",
      );
      await onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the poll");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      {!embedded && (
        <>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              onClick={onCancel}
              className="-ml-2 min-h-[44px] cursor-pointer gap-1.5 px-2.5 text-sm font-semibold touch-manipulation md:min-h-9"
            >
              <HugeiconsIcon icon={ArrowLeft01Icon} size={16} />
              All polls
            </Button>
          </div>

          <h2 className="font-heading text-xl font-bold tracking-tight">
            {poll ? poll.name : "New poll"}
          </h2>
        </>
      )}

      {/* Who can fill it: asked first */}
      <section className="rounded-3xl border border-border/70 bg-card/60 p-5 shadow-xs">
        <h3 className="text-sm font-semibold">
          Which committees should fill this poll?
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {viewer.isSuperAdmin
            ? "Your polls go live for any committee right away."
            : viewer.committee
              ? `Polls for ${viewer.committee} only go live right away. Other committees need superadmin approval.`
              : "Every committee you pick needs superadmin approval."}
        </p>
        {keepsAllCommittees && (
          <p className="mt-3 rounded-xl bg-muted px-3 py-2 text-xs text-muted-foreground">
            Open to every committee. Pick committees to limit it.
          </p>
        )}
        <div
          role="group"
          aria-label="Committees"
          className="mt-4 flex flex-wrap gap-2"
        >
          {committees.map((committee) => {
            const selected = !keepsAllCommittees && chosen.includes(committee);
            const own = committee === viewer.committee;
            return (
              <button
                key={committee}
                type="button"
                aria-pressed={selected}
                onClick={() => toggleCommittee(committee)}
                className={cn(
                  "inline-flex min-h-[44px] cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 text-sm font-medium transition-press touch-manipulation active:scale-[0.97] md:min-h-9",
                  selected
                    ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                    : "border-border/70 bg-background/40 text-muted-foreground hover:bg-accent/40 hover:text-foreground",
                )}
              >
                {/* Tick grows in instead of popping, so neighbours slide rather than jump */}
                <span
                  aria-hidden
                  className={cn(
                    "-mr-1.5 inline-flex overflow-hidden transition-[width,opacity,margin] duration-200 ease-out motion-reduce:transition-none",
                    selected ? "mr-0 w-3.5 opacity-100" : "w-0 opacity-0",
                  )}
                >
                  <HugeiconsIcon
                    icon={Tick01Icon}
                    size={14}
                    strokeWidth={2.5}
                    className="shrink-0"
                  />
                </span>

                {committee}
                {own && (
                  <span className="text-[11px] font-normal opacity-70">
                    (yours)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      {showDetails && (
        <>
          <section className="motion-enter rounded-3xl border border-border/70 bg-card/60 p-5 shadow-xs">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label
                  htmlFor="poll-name"
                  className="text-xs font-semibold text-foreground/80"
                >
                  Poll name
                </Label>
                <Input
                  id="poll-name"
                  value={name}
                  maxLength={100}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Orientation week meetings"
                  className="h-11 rounded-xl bg-background/60"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <span className="text-xs font-semibold text-foreground/80">
                  Type
                </span>
                <div
                  role="radiogroup"
                  aria-label="Poll type"
                  className="grid grid-cols-1 gap-2 sm:grid-cols-2"
                >
                  {(["date", "weekly"] as const).map((t) => {
                    const checked = type === t;
                    return (
                      <button
                        key={t}
                        type="button"
                        role="radio"
                        aria-checked={checked}
                        disabled={!isNew && !checked}
                        onClick={() => setType(t)}
                        className={cn(
                          "flex min-h-[56px] cursor-pointer items-center gap-3 rounded-2xl border px-3.5 text-left transition-press touch-manipulation active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-40",
                          checked
                            ? "border-primary/60 bg-primary/10 text-primary ring-1 ring-primary/20 dark:text-foreground"
                            : "border-border/70 bg-background/40 text-muted-foreground hover:bg-accent/40",
                        )}
                      >
                        <HugeiconsIcon
                          icon={t === "date" ? Calendar03Icon : Clock01Icon}
                          size={18}
                          className="shrink-0"
                        />
                        <span className="text-sm font-medium">
                          {POLL_TYPE_LABEL[t]}
                        </span>
                      </button>
                    );
                  })}
                </div>
                {!isNew && (
                  <p className="text-[11px] text-muted-foreground">
                    The type can&apos;t change after a poll is created.
                  </p>
                )}
              </div>

              {!isNew && (
                <label className="flex min-h-[44px] cursor-pointer items-center justify-between gap-3 rounded-2xl border border-border/70 bg-background/40 px-3.5 sm:col-span-2">
                  <span className="text-sm font-medium">Open for answers</span>
                  <Switch checked={active} onCheckedChange={setActive} />
                </label>
              )}
            </div>
          </section>

          {initialConfig ? (
            <ScheduleConfigPanel
              key={type}
              mode={type}
              initialConfig={initialConfig}
              onConfigChange={onConfigChange}
            />
          ) : (
            !error && (
              <div className="h-40 animate-pulse rounded-3xl border border-border/60 bg-card/60" />
            )
          )}
        </>
      )}

      {/* Sticky action bar, same shape as the schedule save bar */}
      <div className="sticky bottom-3 z-30 space-y-2">
        {error && (
          <div
            role="alert"
            className="rounded-2xl border border-destructive/30 bg-card px-4 py-2.5 text-xs font-medium text-destructive shadow-sm"
          >
            {error}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/95 p-2 pl-4 shadow-[0_8px_30px_-12px_rgb(15_23_42/0.25)] backdrop-blur-xl">
          <p
            aria-live="polite"
            className={cn(
              "min-w-0 text-xs leading-tight font-medium text-muted-foreground",
              !needsApproval && "hidden sm:block",
            )}
          >
            {needsApproval ? (
              <span className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                <span className="size-2 shrink-0 rounded-full bg-amber-500" />
                Needs approval
              </span>
            ) : chosen.length || keepsAllCommittees ? (
              "Goes live on save"
            ) : (
              "Pick a committee"
            )}
          </p>
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              onClick={onCancel}
              disabled={saving}
              className="min-h-[44px] md:min-h-[42px] cursor-pointer px-3 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              onClick={submit}
              disabled={saving || (!keepsAllCommittees && chosen.length === 0)}
              aria-busy={saving}
              className="min-h-[44px] md:min-h-[42px] cursor-pointer gap-2 px-5 text-xs font-semibold sm:text-sm"
            >
              {saving ? (
                <>
                  <Spinner
                    className="size-3.5"
                    label={needsApproval ? "Sending" : "Saving"}
                  />
                  <span>{needsApproval ? "Sending..." : "Saving..."}</span>
                </>
              ) : (
                <>
                  <HugeiconsIcon
                    icon={needsApproval ? MailSend01Icon : Tick01Icon}
                    size={15}
                    strokeWidth={2.2}
                  />
                  <span>{needsApproval ? "Send request" : "Save"}</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
