"use client";

import * as React from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tick01Icon,
  Delete02Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";
import { AlertCircle } from "lucide-react";
import { COMMITTEES } from "@/lib/constants";
import {
  DAY_OF_WEEK_MAP,
  formatDuration,
  formatTimeSlot,
  toMinutes,
  type WeeklySlot,
} from "@/lib/weekly-slots";
import { cn } from "@/lib/utils";

export interface WeeklyTimetableProps {
  user: {
    id: string;
    name: string | null;
    email: string;
    nuId?: string | null;
    image?: string | null;
    committee?: string | null;
  };
  weeklyDays: number[];
  weeklySlots: WeeklySlot[];
  initialSlots?: { dayOfWeek: number; startTime: string }[];
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? "NU";
}

export function WeeklyTimetable({
  user,
  weeklyDays,
  weeklySlots,
  initialSlots = [],
}: WeeklyTimetableProps) {
  const { data: session } = authClient.useSession();
  const activeUser = session?.user ?? user;

  const activeDays = weeklyDays;

  const [selectedDay, setSelectedDay] = React.useState<number>(
    weeklyDays[0] ?? 0,
  );
  const selectedDaySlots = weeklySlots.filter(
    (s) => s.dayOfWeek === selectedDay,
  );
  const [isSaving, setIsSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Profile states
  const [memberName, setMemberName] = React.useState(
    activeUser?.name ?? user?.name ?? "",
  );
  const [memberEmail, setMemberEmail] = React.useState(
    activeUser?.email ?? user?.email ?? "",
  );
  const [memberId, setMemberId] = React.useState(
    ((activeUser as Record<string, unknown>)?.nuId as string) ??
      user?.nuId ??
      "",
  );
  const [memberCommittee, setMemberCommittee] = React.useState(
    ((activeUser as Record<string, unknown>)?.committee as string) ??
      user?.committee ??
      "",
  );
  const [availableCommittees, setAvailableCommittees] =
    React.useState<string[]>(COMMITTEES);

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

  React.useEffect(() => {
    const savedName = localStorage.getItem("memberName");
    const savedEmail = localStorage.getItem("memberEmail");
    const savedId = localStorage.getItem("memberId");
    const savedCommittee = localStorage.getItem("memberCommittee");

    if (savedName && !memberName) setMemberName(savedName);
    if (savedEmail && !memberEmail) setMemberEmail(savedEmail);
    if (savedId && !memberId) setMemberId(savedId);
    if (savedCommittee && !memberCommittee) setMemberCommittee(savedCommittee);
  }, [memberName, memberEmail, memberId, memberCommittee]);

  // Slot states: Map from dayOfWeek -> Set of startTimes
  const [slotMap, setSlotMap] = React.useState<Map<number, Set<string>>>(() => {
    const map = new Map<number, Set<string>>();
    for (const d of activeDays) {
      map.set(d, new Set<string>());
    }
    for (const slot of initialSlots) {
      if (map.has(slot.dayOfWeek)) {
        map.get(slot.dayOfWeek)?.add(slot.startTime);
      }
    }
    return map;
  });

  // Total marked slots across all days
  const totalSlotsCount = React.useMemo(() => {
    let count = 0;
    slotMap.forEach((slots) => {
      count += slots.size;
    });
    return count;
  }, [slotMap]);

  // Toggle a single time slot for the active day
  const toggleSlot = (startTime: string) => {
    setSlotMap((prev) => {
      const next = new Map(prev);
      const currentDaySlots = new Set(next.get(selectedDay) ?? []);
      if (currentDaySlots.has(startTime)) {
        currentDaySlots.delete(startTime);
      } else {
        currentDaySlots.add(startTime);
      }
      next.set(selectedDay, currentDaySlots);
      return next;
    });
    setHasChanges(true);
  };

  // Select all available time slots for the active day
  const selectAllDay = () => {
    setSlotMap((prev) => {
      const next = new Map(prev);
      next.set(selectedDay, new Set(selectedDaySlots.map((s) => s.startTime)));
      return next;
    });
    setHasChanges(true);
  };

  // Clear all time slots for the active day
  const clearDay = () => {
    setSlotMap((prev) => {
      const next = new Map(prev);
      next.set(selectedDay, new Set());
      return next;
    });
    setHasChanges(true);
  };

  // Clear entire week
  const clearAllWeek = () => {
    setSlotMap(() => {
      const next = new Map();
      for (const d of activeDays) {
        next.set(d, new Set());
      }
      return next;
    });
    setHasChanges(true);
  };

  // Save changes to the server
  const handleSave = async () => {
    // Validate profile
    if (!memberName.trim()) {
      toast.error("Please enter your name");
      return;
    }
    if (!memberId || !/^\d{9}$/.test(memberId.trim())) {
      toast.error("Please enter your 9-digit Student ID");
      return;
    }
    if (!memberCommittee) {
      toast.error("Please select your committee");
      return;
    }

    setIsSaving(true);

    // Build slots array
    const slotsPayload: { dayOfWeek: number; startTime: string }[] = [];
    slotMap.forEach((slots, day) => {
      slots.forEach((startTime) => {
        slotsPayload.push({ dayOfWeek: day, startTime });
      });
    });

    try {
      const res = await fetch("/api/recurring-availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: memberName.trim(),
          nuId: memberId.trim() || undefined,
          committee: memberCommittee,
          slots: slotsPayload,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to save your semester availability",
        );
      }

      setHasChanges(false);
      toast.success("Saved semester availability", {
        id: "weekly-availability-save",
        duration: 2000,
      });
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save schedule";
      toast.error(msg);
    } finally {
      setIsSaving(false);
    }
  };

  const activeDaySlots = slotMap.get(selectedDay) ?? new Set();
  const activeDayMeta = DAY_OF_WEEK_MAP.find((d) => d.day === selectedDay);

  return (
    <div className="w-full flex flex-col items-center gap-6">
      {/* ─── Authenticated Member Summary Card (Matches /specific) ─────────────── */}
      <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-colors">
        <div className="flex items-center gap-3.5">
          <Avatar className="size-11 shrink-0 rounded-full ring-2 ring-emerald-500/20 ring-offset-2 ring-offset-background">
            <AvatarImage
              src={activeUser?.image ?? user?.image ?? undefined}
              alt={memberName || "Member avatar"}
            />
            <AvatarFallback className="bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
              {getInitials(memberName, memberEmail)}
            </AvatarFallback>
          </Avatar>

          <div className="min-w-0 flex-1">
            <p className="truncate font-heading text-sm font-bold tracking-tight text-foreground">
              {memberName || "Union Member"}
            </p>
            <p
              className="truncate text-xs text-muted-foreground"
              title={memberEmail}
            >
              {memberEmail}
            </p>
          </div>
        </div>

        {(memberCommittee || memberId) && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5">
            {memberCommittee && (
              <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                {memberCommittee}
              </span>
            )}
            {memberId && (
              <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/60 px-2.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                ID: {memberId}
              </span>
            )}
          </div>
        )}

        {(!memberCommittee || !memberId) && (
          <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-1.5 font-semibold">
              <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
              <span>Complete Your Profile</span>
            </div>
            <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
              Please enter your 9-digit NU ID and select your committee to
              submit availability.
            </p>
            <div className="mt-2 space-y-2">
              {!memberId && (
                <Input
                  placeholder="9-digit NU ID (e.g. 211100000)"
                  maxLength={9}
                  value={memberId}
                  onChange={(e) => {
                    const val = e.target.value.replace(/\D/g, "");
                    setMemberId(val);
                    localStorage.setItem("memberId", val);
                  }}
                  className="h-8 text-xs bg-background/80"
                />
              )}
              {!memberCommittee && (
                <Select
                  value={memberCommittee}
                  onValueChange={(val) => {
                    if (val) {
                      setMemberCommittee(val);
                      localStorage.setItem("memberCommittee", val);
                    }
                  }}
                >
                  <SelectTrigger className="h-8.5 text-xs bg-background/80">
                    <SelectValue placeholder="Select Committee" />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCommittees.map((c) => (
                      <SelectItem key={c} value={c} className="text-xs">
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
          </div>
        )}
      </div>

      {/* ─── Day selector ─────────────────────────────────────────────────── */}
      <section className="w-full space-y-4" aria-label="Weekly availability">
        <div className="flex items-baseline justify-between px-1">
          <h2 className="text-sm font-semibold text-foreground">Pick a day</h2>
          <span
            className={cn(
              "text-xs font-medium tabular-nums",
              totalSlotsCount > 0
                ? "text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground",
            )}
          >
            {totalSlotsCount} {totalSlotsCount === 1 ? "slot" : "slots"} this
            week
          </span>
        </div>

        <div
          role="tablist"
          aria-label="Days"
          className="grid gap-1 rounded-2xl bg-muted/70 p-1 ring-1 ring-border/50"
          style={{
            gridTemplateColumns: `repeat(${activeDays.length}, minmax(0, 1fr))`,
          }}
        >
          {activeDays.map((dayNum) => {
            const meta = DAY_OF_WEEK_MAP.find((d) => d.day === dayNum);
            const isSelected = selectedDay === dayNum;
            const dayCount = slotMap.get(dayNum)?.size ?? 0;

            return (
              <button
                key={dayNum}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={`${meta?.label}, ${dayCount} selected`}
                onClick={() => setSelectedDay(dayNum)}
                className={cn(
                  "relative flex min-h-[48px] min-w-0 cursor-pointer touch-manipulation select-none flex-col items-center justify-center gap-0.5 rounded-xl text-sm font-semibold transition-all duration-200 active:scale-[0.97]",
                  isSelected
                    ? "bg-card text-foreground shadow-sm ring-1 ring-border/60"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {meta?.short}
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full transition-colors",
                    dayCount > 0 ? "bg-emerald-500" : "bg-transparent",
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* ─── Slots for the selected day ─────────────────────────────────── */}
        <div className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-heading text-lg font-bold tracking-tight">
                {activeDayMeta?.label}
              </h3>
              <p className="text-xs text-muted-foreground">
                {activeDaySlots.size} of {selectedDaySlots.length} marked
                &middot; tap the times you&apos;re free
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-1">
              <Button
                variant="ghost"
                size="sm"
                onClick={selectAllDay}
                disabled={activeDaySlots.size === selectedDaySlots.length}
                className="h-9 cursor-pointer gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-500/10 hover:text-emerald-700 dark:text-emerald-400"
              >
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} />
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDay}
                disabled={activeDaySlots.size === 0}
                className="h-9 cursor-pointer gap-1.5 rounded-xl px-2.5 text-xs font-semibold text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <HugeiconsIcon icon={Delete02Icon} size={15} />
                Clear
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2">
            {selectedDaySlots.map(({ startTime, endTime }) => {
              const isMarked = activeDaySlots.has(startTime);

              return (
                <button
                  key={startTime}
                  type="button"
                  aria-pressed={isMarked}
                  onClick={() => toggleSlot(startTime)}
                  className={cn(
                    "group flex min-h-[60px] cursor-pointer touch-manipulation select-none items-center gap-3 rounded-2xl border px-4 text-left transition-all duration-150 active:scale-[0.98]",
                    isMarked
                      ? "border-emerald-500/60 bg-emerald-500/[0.08] shadow-xs"
                      : "border-border/80 bg-background hover:border-foreground/20 hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-lg border transition-all",
                      isMarked
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-border bg-card text-transparent group-hover:border-foreground/30",
                    )}
                  >
                    <HugeiconsIcon
                      icon={Tick01Icon}
                      size={14}
                      strokeWidth={3}
                    />
                  </span>

                  <span className="min-w-0 flex-1 whitespace-nowrap text-sm font-semibold tracking-tight tabular-nums text-foreground">
                    {formatTimeSlot(startTime)} → {formatTimeSlot(endTime)}
                  </span>

                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums",
                      isMarked
                        ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                        : "bg-muted text-muted-foreground",
                    )}
                  >
                    {formatDuration(toMinutes(endTime) - toMinutes(startTime))}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── Floating Dynamic Save Island (Visible only on unsaved changes) ────── */}
      <div
        className={cn(
          "fixed bottom-6 inset-x-0 mx-auto z-40 w-[calc(100%-2rem)] max-w-md transition-all duration-300 ease-[cubic-bezier(0.25,1,0.35,1)]",
          hasChanges
            ? "translate-y-0 opacity-100 scale-100 pointer-events-auto"
            : "translate-y-10 opacity-0 scale-95 pointer-events-none",
        )}
      >
        <div className="flex items-center justify-between gap-3 px-4 py-2.5 rounded-full bg-card/90 dark:bg-card/85 backdrop-blur-2xl border border-white/20 dark:border-white/15 shadow-[0_12px_36px_-6px_rgba(0,0,0,0.3)]">
          <div className="flex items-center gap-2 min-w-0 pl-1">
            <span className="text-xs font-semibold tracking-tight truncate text-foreground">
              Unsaved changes ({totalSlotsCount}{" "}
              {totalSlotsCount === 1 ? "slot" : "slots"})
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {totalSlotsCount > 0 && (
              <Button
                variant="ghost"
                size="sm"
                onClick={clearAllWeek}
                className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-full cursor-pointer"
              >
                Reset
              </Button>
            )}

            <Button
              size="sm"
              onClick={handleSave}
              disabled={isSaving}
              className="h-8 px-4 gap-1.5 rounded-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-xs cursor-pointer active:scale-95 transition-transform"
            >
              {isSaving ? (
                <>
                  <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
                  <span>Saving...</span>
                </>
              ) : (
                <>
                  <HugeiconsIcon
                    icon={Tick01Icon}
                    size={14}
                    strokeWidth={2.5}
                  />
                  <span>Save</span>
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
