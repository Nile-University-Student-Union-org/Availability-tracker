"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  RefreshIcon,
  Tick01Icon,
  Clock01Icon,
  UserGroupIcon,
  Target02Icon,
  Calendar03Icon,
} from "@hugeicons/core-free-icons";
import { COMMITTEES } from "@/lib/constants";
import { DAY_OF_WEEK_MAP, formatTimeSlot } from "@/lib/schedule";
import type {
  SemesterAnalyticsData,
  RecurringSlotUser,
} from "@/lib/semester-analytics";
import { cn } from "@/lib/utils";

interface SemesterAnalyticsPanelProps {
  initialData: SemesterAnalyticsData;
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? "NU";
}

function getEndTime(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number);
  const endH = (h + 1) % 24;
  const suffix = endH >= 12 ? "PM" : "AM";
  const hour = endH % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function cellStyle(count: number, max: number): string {
  if (count === 0)
    return "bg-muted/40 text-muted-foreground/30 hover:bg-muted/60";
  const ratio = count / Math.max(max, 1);
  if (ratio <= 0.25)
    return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 hover:bg-emerald-500/30";
  if (ratio <= 0.5)
    return "bg-emerald-500/40 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-500/50";
  if (ratio <= 0.75)
    return "bg-emerald-500/65 text-emerald-950 dark:text-white hover:bg-emerald-500/75";
  return "bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs";
}

export function SemesterAnalyticsPanel({
  initialData,
}: SemesterAnalyticsPanelProps) {
  const [data, setData] = React.useState<SemesterAnalyticsData>(initialData);
  const [committee, setCommittee] = React.useState<string>("all");
  const [availableCommittees, setAvailableCommittees] =
    React.useState<string[]>(COMMITTEES);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    fetch("/api/committees")
      .then((res) => res.json())
      .then((d) => {
        if (Array.isArray(d?.committees) && d.committees.length > 0) {
          setAvailableCommittees(d.committees);
        }
      })
      .catch(() => {});
  }, []);

  // Dialog inspection state
  const [selectedSlot, setSelectedSlot] = React.useState<{
    dayOfWeek: number;
    startTime: string;
    count: number;
    users: RecurringSlotUser[];
  } | null>(null);
  const [dialogTab, setDialogTab] = React.useState<"available" | "missing">(
    "available",
  );

  // Fetch updated analytics when committee filter changes
  const fetchAnalytics = React.useCallback(async (comm: string) => {
    setIsLoading(true);
    try {
      const url =
        comm === "all"
          ? "/api/admin/recurring-analytics"
          : `/api/admin/recurring-analytics?committee=${encodeURIComponent(comm)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Failed to load semester analytics");
      const result = (await res.json()) as SemesterAnalyticsData;
      setData(result);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to load analytics";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleCommitteeChange = (newComm: string | null) => {
    const val = newComm ?? "all";
    setCommittee(val);
    void fetchAnalytics(val);
  };

  // Calculate missing members for the currently selected inspected slot
  const missingMembersForSlot = React.useMemo(() => {
    if (!selectedSlot) return [];
    const availableIds = new Set(selectedSlot.users.map((u) => u.id));
    return data.users.filter((u) => !availableIds.has(u.id));
  }, [selectedSlot, data.users]);

  const peakConsensusPercentage = React.useMemo(() => {
    if (data.totalUsers === 0 || data.maxCount === 0) return 0;
    return Math.round((data.maxCount / data.totalUsers) * 100);
  }, [data.maxCount, data.totalUsers]);

  return (
    <div className="flex flex-col gap-8 pb-16">
      {/* ─── Header & Controls ────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold tracking-tight sm:text-3xl flex items-center gap-2.5">
            <HugeiconsIcon
              icon={Clock01Icon}
              size={28}
              className="text-emerald-500"
            />
            <span>Semester Availability Analytics</span>
          </h1>
          <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
            Permanent weekly recurring schedule intelligence across academic
            days.
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 w-full sm:w-auto">
          <Select value={committee} onValueChange={handleCommitteeChange}>
            <SelectTrigger className="h-9 w-full sm:w-[200px] text-xs font-semibold bg-background/60">
              <SelectValue placeholder="All Committees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">
                All Committees
              </SelectItem>
              {availableCommittees.map((c) => (
                <SelectItem key={c} value={c} className="text-xs">
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Button
            variant="outline"
            size="icon"
            className="size-9 shrink-0 cursor-pointer"
            onClick={() => fetchAnalytics(committee)}
            disabled={isLoading}
            title="Refresh analytics"
          >
            <HugeiconsIcon
              icon={RefreshIcon}
              size={15}
              className={cn(isLoading && "animate-spin")}
            />
          </Button>
        </div>
      </div>

      {/* ─── Metric Stat Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-border/70 bg-card/60 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20">
              <HugeiconsIcon icon={UserGroupIcon} size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Participating Members
              </p>
              <p className="text-xl font-bold tracking-tight mt-0.5">
                {data.totalUsers}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20">
              <HugeiconsIcon icon={Clock01Icon} size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Total Weekly Hours Marked
              </p>
              <p className="text-xl font-bold tracking-tight mt-0.5">
                {data.totalSlots} hrs
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 bg-card/60 backdrop-blur-xl">
          <CardContent className="p-4 flex items-center gap-4">
            <div className="flex size-11 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
              <HugeiconsIcon icon={Target02Icon} size={20} />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground">
                Peak Slot Consensus
              </p>
              <p className="text-xl font-bold tracking-tight mt-0.5">
                {data.maxCount} members ({peakConsensusPercentage}%)
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ─── Top Recommended Standing Meeting Times Card ─────────────────────── */}
      {data.recommendations && data.recommendations.length > 0 && (
        <Card className="border-border/70 bg-card/60 backdrop-blur-xl shadow-sm">
          <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/60 pb-3">
              <div className="flex items-center gap-3">
                <div className="flex size-9 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20 shrink-0">
                  <HugeiconsIcon icon={Calendar03Icon} size={18} />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold tracking-tight">
                      Top Recommended Standing Meeting Times
                    </h2>
                    <Badge
                      variant="outline"
                      className="border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 text-[11px] font-semibold py-0 h-5"
                    >
                      {committee === "all" ? "Whole Union" : committee}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Algorithmic optimal recurring meeting times ranking based on
                    member availability.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-1">
              {data.recommendations.slice(0, 3).map((rec, index) => {
                const isBest = index === 0;
                return (
                  <div
                    key={`${rec.dayOfWeek}_${rec.startTime}`}
                    className={cn(
                      "flex flex-col justify-between p-4 rounded-2xl border transition-all duration-200",
                      isBest
                        ? "border-emerald-500/40 bg-emerald-500/[0.06] shadow-xs ring-1 ring-emerald-500/20"
                        : "border-border/70 bg-background/50 hover:bg-background/80",
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                          Rank #{index + 1}
                        </span>
                        <h3 className="text-base font-bold tracking-tight text-foreground mt-0.5">
                          {rec.dayLabel}s
                        </h3>
                        <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 mt-0.5">
                          {formatTimeSlot(rec.startTime)} → {rec.endTime}
                        </p>
                      </div>

                      <Badge
                        className={cn(
                          "font-bold text-xs shrink-0",
                          isBest
                            ? "bg-emerald-600 text-white"
                            : "bg-muted text-foreground",
                        )}
                      >
                        {rec.percentage}%
                      </Badge>
                    </div>

                    <div className="mt-4 pt-3 border-t border-border/50 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        <strong className="text-foreground font-semibold">
                          {rec.count}
                        </strong>{" "}
                        / {rec.totalEligible} members
                      </span>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setSelectedSlot({
                            dayOfWeek: rec.dayOfWeek,
                            startTime: rec.startTime,
                            count: rec.count,
                            users: rec.availableUsers,
                          })
                        }
                        className="h-7 px-3 text-xs font-semibold cursor-pointer"
                      >
                        Inspect
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* ─── Day-of-Week Recurring Heatmap Matrix ──────────────────────────────── */}
      <Card className="border-border/70 bg-card/60 backdrop-blur-xl shadow-sm">
        <CardContent className="p-4 sm:p-6 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Day-of-Week Density Heatmap
              </h2>
              <p className="text-xs text-muted-foreground">
                Click any slot cell to inspect available vs conflicting members.
              </p>
            </div>

            {/* Color Legend */}
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <span>Less</span>
              <span className="size-3.5 rounded bg-muted/40 border border-border" />
              <span className="size-3.5 rounded bg-emerald-500/20" />
              <span className="size-3.5 rounded bg-emerald-500/50" />
              <span className="size-3.5 rounded bg-emerald-600" />
              <span>More</span>
            </div>
          </div>

          {/* Matrix Grid */}
          <div className="overflow-x-auto">
            <div className="min-w-[640px]">
              {/* Table Header: Days */}
              <div
                className="grid gap-2 mb-2 text-center"
                style={{
                  gridTemplateColumns: `100px repeat(${data.days.length}, 1fr)`,
                }}
              >
                <div className="text-xs font-bold text-muted-foreground self-center">
                  Time Slot
                </div>
                {data.days.map((dayNum) => {
                  const meta = DAY_OF_WEEK_MAP.find((d) => d.day === dayNum);
                  return (
                    <div
                      key={dayNum}
                      className="p-2.5 rounded-xl bg-muted/50 border border-border/60"
                    >
                      <p className="text-xs sm:text-sm font-bold tracking-tight">
                        {meta?.label}
                      </p>
                    </div>
                  );
                })}
              </div>

              {/* Table Rows: Time Slots */}
              <div className="flex flex-col gap-1.5">
                {data.timeSlots.map((time) => {
                  const formattedStart = formatTimeSlot(time);
                  const formattedEnd = getEndTime(time);

                  return (
                    <div
                      key={time}
                      className="grid gap-2 items-center"
                      style={{
                        gridTemplateColumns: `100px repeat(${data.days.length}, 1fr)`,
                      }}
                    >
                      <div className="text-right pr-2 text-xs font-semibold text-muted-foreground leading-tight">
                        <div>{formattedStart}</div>
                        <div className="text-[10px] opacity-70">
                          to {formattedEnd}
                        </div>
                      </div>

                      {data.days.map((dayNum) => {
                        const cell = data.slotMatrix.find(
                          (s) => s.dayOfWeek === dayNum && s.startTime === time,
                        );
                        const count = cell?.count ?? 0;

                        return (
                          <button
                            key={`${dayNum}_${time}`}
                            type="button"
                            onClick={() =>
                              setSelectedSlot({
                                dayOfWeek: dayNum,
                                startTime: time,
                                count,
                                users: cell?.users ?? [],
                              })
                            }
                            className={cn(
                              "h-12 rounded-xl flex items-center justify-center font-bold text-xs transition-all duration-150 cursor-pointer select-none active:scale-[0.97]",
                              cellStyle(count, data.maxCount),
                            )}
                          >
                            {count > 0 ? count : "—"}
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ─── Member Responses Summary Table ───────────────────────────────────── */}
      <Card className="border-border/70 bg-card/60 backdrop-blur-xl shadow-sm">
        <CardContent className="p-4 sm:p-6 flex flex-col gap-3">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div>
              <h2 className="text-base sm:text-lg font-bold tracking-tight">
                Member Recurring Timetables ({data.users.length})
              </h2>
              <p className="text-xs text-muted-foreground">
                Individual weekly availability totals for registered union
                members.
              </p>
            </div>
          </div>

          {data.users.length === 0 ? (
            <div className="py-8 text-center text-xs text-muted-foreground">
              No members have submitted their semester availability yet.
            </div>
          ) : (
            <div className="divide-y divide-border/60">
              {data.users.map((u) => (
                <div
                  key={u.id}
                  className="flex items-center justify-between py-3 gap-3"
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="size-9 rounded-lg">
                      <AvatarImage src={u.image ?? undefined} />
                      <AvatarFallback className="rounded-lg bg-[#0F3056] text-white text-xs font-bold">
                        {getInitials(u.name, u.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold tracking-tight">
                        {u.name || "Unnamed Member"}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {u.email} {u.committee ? `• ${u.committee}` : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-xs font-bold border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                    >
                      {u.totalSlots} hrs / wk
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* ─── Slot Inspection Dialog ───────────────────────────────────────────── */}
      <Dialog
        open={Boolean(selectedSlot)}
        onOpenChange={(open) => !open && setSelectedSlot(null)}
      >
        <DialogContent className="max-w-md rounded-3xl border-border/80 bg-background/95 backdrop-blur-2xl">
          {selectedSlot && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-2">
                  <Badge
                    variant="outline"
                    className="border-emerald-500/40 bg-emerald-500/10 text-emerald-600 text-xs font-bold"
                  >
                    {
                      DAY_OF_WEEK_MAP.find(
                        (d) => d.day === selectedSlot.dayOfWeek,
                      )?.label
                    }
                  </Badge>
                  <span className="text-xs font-semibold text-muted-foreground">
                    {formatTimeSlot(selectedSlot.startTime)} →{" "}
                    {getEndTime(selectedSlot.startTime)}
                  </span>
                </div>
                <DialogTitle className="text-xl font-bold tracking-tight mt-1">
                  Slot Inspection
                </DialogTitle>
                <DialogDescription className="text-xs">
                  Review which members are free and who has academic lectures.
                </DialogDescription>
              </DialogHeader>

              {/* Toggle available vs missing */}
              <div className="flex p-1 rounded-xl bg-muted/60 border border-border/60 mt-2">
                <button
                  type="button"
                  onClick={() => setDialogTab("available")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    dialogTab === "available"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Available ({selectedSlot.users.length})
                </button>
                <button
                  type="button"
                  onClick={() => setDialogTab("missing")}
                  className={cn(
                    "flex-1 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer",
                    dialogTab === "missing"
                      ? "bg-background text-foreground shadow-xs font-bold"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  Conflicting / Missing ({missingMembersForSlot.length})
                </button>
              </div>

              <ScrollArea className="max-h-[300px] mt-2 pr-2">
                {dialogTab === "available" ? (
                  selectedSlot.users.length === 0 ? (
                    <div className="py-8 text-center text-xs text-muted-foreground">
                      No members are marked available for this standing hour.
                    </div>
                  ) : (
                    <div className="divide-y divide-border/60">
                      {selectedSlot.users.map((u) => (
                        <div
                          key={u.id}
                          className="flex items-center gap-3 py-2.5"
                        >
                          <Avatar className="size-8 rounded-lg">
                            <AvatarImage src={u.image ?? undefined} />
                            <AvatarFallback className="rounded-lg bg-emerald-600 text-white text-[11px] font-bold">
                              {getInitials(u.name, u.email)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold truncate">
                              {u.name || "Unnamed"}
                            </p>
                            <p className="text-[10px] text-muted-foreground truncate">
                              {u.email} {u.committee ? `• ${u.committee}` : ""}
                            </p>
                          </div>
                          <div className="size-5 rounded-full bg-emerald-500/20 text-emerald-600 flex items-center justify-center">
                            <HugeiconsIcon
                              icon={Tick01Icon}
                              size={12}
                              strokeWidth={3}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )
                ) : missingMembersForSlot.length === 0 ? (
                  <div className="py-8 text-center text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
                    100% Attendance! All registered members are free for this
                    slot.
                  </div>
                ) : (
                  <div className="divide-y divide-border/60">
                    {missingMembersForSlot.map((u) => (
                      <div
                        key={u.id}
                        className="flex items-center gap-3 py-2.5 opacity-80"
                      >
                        <Avatar className="size-8 rounded-lg">
                          <AvatarImage src={u.image ?? undefined} />
                          <AvatarFallback className="rounded-lg bg-muted text-muted-foreground text-[11px]">
                            {getInitials(u.name, u.email)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-medium truncate">
                            {u.name || "Unnamed"}
                          </p>
                          <p className="text-[10px] text-muted-foreground truncate">
                            {u.email} {u.committee ? `• ${u.committee}` : ""}
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-[10px] py-0 border-amber-500/30 text-amber-600"
                        >
                          Lecture Conflict
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
