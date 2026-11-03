"use client";

import * as React from "react";
import { toast } from "@/lib/notify";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Tick01Icon,
  Tick02Icon,
  Delete02Icon,
  CheckmarkCircle02Icon,
  AlertCircleIcon,
} from "@hugeicons/core-free-icons";
import {
  DAY_OF_WEEK_MAP,
  formatDuration,
  formatTimeSlot,
  toMinutes,
  type WeeklySlot,
} from "@/lib/weekly-slots";
import { cn } from "@/lib/utils";

export interface WeeklyTimetableProps {
  pollId?: string;
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
  pollId = "legacy-weekly",
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
  const dayButtonRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [dayThumb, setDayThumb] = React.useState<{
    left: number;
    width: number;
  } | null>(null);
  const [dayMounted, setDayMounted] = React.useState(false);

  const selectedDayIndex = Math.max(0, activeDays.indexOf(selectedDay));

  const updateDayThumb = React.useCallback(() => {
    const el = dayButtonRefs.current[selectedDayIndex];
    if (el) {
      setDayThumb({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [selectedDayIndex]);

  React.useLayoutEffect(() => {
    updateDayThumb();
  }, [updateDayThumb, activeDays, selectedDay]);

  React.useEffect(() => {
    setDayMounted(true);
    const handleResize = () => updateDayThumb();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateDayThumb]);
  const selectedDaySlots = weeklySlots.filter(
    (s) => s.dayOfWeek === selectedDay,
  );
  type SaveState = "idle" | "saving" | "saved" | "error";
  const [saveState, setSaveState] = React.useState<SaveState>("idle");
  const [isShaking, setIsShaking] = React.useState(false);

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

  const [savedSlots, setSavedSlots] = React.useState<Map<number, Set<string>>>(
    () => {
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
    },
  );

  const changeCount = React.useMemo(() => {
    let count = 0;
    for (const d of activeDays) {
      const saved = savedSlots.get(d) ?? new Set();
      const curr = slotMap.get(d) ?? new Set();
      for (const s of curr) {
        if (!saved.has(s)) count++;
      }
      for (const s of saved) {
        if (!curr.has(s)) count++;
      }
    }
    return count;
  }, [activeDays, savedSlots, slotMap]);

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
    if (saveState === "error" || saveState === "saved") {
      setSaveState("idle");
    }
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
  };

  // Select all available time slots for the active day
  const selectAllDay = () => {
    if (saveState === "error" || saveState === "saved") {
      setSaveState("idle");
    }
    setSlotMap((prev) => {
      const next = new Map(prev);
      next.set(selectedDay, new Set(selectedDaySlots.map((s) => s.startTime)));
      return next;
    });
  };

  // Clear all time slots for the active day
  const clearDay = () => {
    if (saveState === "error" || saveState === "saved") {
      setSaveState("idle");
    }
    setSlotMap((prev) => {
      const next = new Map(prev);
      next.set(selectedDay, new Set());
      return next;
    });
  };

  // Reset availability to saved state
  const handleReset = () => {
    setSlotMap(
      new Map(
        Array.from(savedSlots.entries()).map(([k, v]) => [k, new Set(v)]),
      ),
    );
    setSaveState("idle");
  };

  // Save changes to the server
  const handleSave = async () => {
    if (changeCount === 0 || saveState === "saving") return;

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

    setSaveState("saving");
    setIsShaking(false);

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
          pollId,
          slots: slotsPayload,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(
          errorData.error || "Failed to save your semester availability",
        );
      }

      setSavedSlots(
        new Map(Array.from(slotMap.entries()).map(([k, v]) => [k, new Set(v)])),
      );
      setSaveState("saved");
      toast.success("Saved semester availability", {
        id: "weekly-availability-save",
        duration: 2000,
      });

      setTimeout(() => {
        setSaveState((prev) => (prev === "saved" ? "idle" : prev));
      }, 1300);
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to save schedule";
      toast.error(msg);
      setSaveState("error");
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 360);
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
          className="relative inline-flex w-full max-w-full items-center overflow-x-auto glass rounded-full p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          {/* Sliding lens capsule */}
          <span
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute top-1 bottom-1 left-0 z-[2] rounded-full glass-lens will-change-[transform,width]",
              dayMounted
                ? "transition-[transform,width] duration-[560ms] ease-[var(--ease-spring)] motion-reduce:transition-none"
                : "transition-none",
            )}
            style={
              dayThumb
                ? {
                    transform: `translateX(${dayThumb.left}px)`,
                    width: `${dayThumb.width}px`,
                  }
                : {
                    transform: `translateX(calc(${selectedDayIndex} * 100%))`,
                    width: `calc(100% / ${Math.max(1, activeDays.length)})`,
                  }
            }
          />
          {activeDays.map((dayNum, index) => {
            const meta = DAY_OF_WEEK_MAP.find((d) => d.day === dayNum);
            const isSelected = selectedDay === dayNum;
            const dayCount = slotMap.get(dayNum)?.size ?? 0;

            return (
              <button
                key={dayNum}
                ref={(el) => {
                  dayButtonRefs.current[index] = el;
                }}
                id={`day-tab-${dayNum}`}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-controls="weekly-slots-panel"
                aria-label={`${meta?.label}, ${dayCount} selected`}
                onClick={() => setSelectedDay(dayNum)}
                className={cn(
                  "relative z-[3] flex flex-1 min-h-[48px] min-w-0 cursor-pointer touch-manipulation select-none flex-col items-center justify-center gap-0.5 rounded-full text-sm font-semibold transition-colors active:scale-[0.97]",
                  isSelected
                    ? "text-(--glass-nile-fg)"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {meta?.short}
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full bg-emerald-500 transition-[scale,opacity] duration-200 ease-[var(--ease-out)]",
                    dayCount > 0
                      ? "scale-100 opacity-100"
                      : "scale-50 opacity-0",
                  )}
                />
              </button>
            );
          })}
        </div>

        {/* ─── Slots for the selected day ─────────────────────────────────── */}
        <div
          role="tabpanel"
          id="weekly-slots-panel"
          aria-labelledby={`day-tab-${selectedDay}`}
          className="rounded-3xl border border-border/70 bg-card p-4 shadow-xs sm:p-5"
        >
          <div className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="min-w-[12rem] flex-1">
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
                className="h-9 min-h-[44px] sm:min-h-9 cursor-pointer gap-1.5 px-2.5 text-xs font-semibold"
              >
                <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} />
                All
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={clearDay}
                disabled={activeDaySlots.size === 0}
                className="h-9 min-h-[44px] sm:min-h-9 cursor-pointer gap-1.5 px-2.5 text-xs font-semibold"
              >
                <HugeiconsIcon icon={Delete02Icon} size={15} />
                Clear
              </Button>
            </div>
          </div>

          <div key={selectedDay} className="motion-stagger flex flex-col gap-2">
            {selectedDaySlots.map(({ startTime, endTime }, index) => {
              const isMarked = activeDaySlots.has(startTime);

              return (
                <button
                  key={startTime}
                  type="button"
                  aria-pressed={isMarked}
                  onClick={() => toggleSlot(startTime)}
                  style={{ "--i": index } as React.CSSProperties}
                  className={cn(
                    "group flex min-h-[60px] cursor-pointer touch-manipulation select-none items-center gap-3 rounded-2xl border px-4 text-left transition-press active:scale-[0.98]",
                    isMarked
                      ? "border-transparent bg-emerald-500/[0.08] dark:bg-emerald-500/15 [box-shadow:var(--edge-slot-on)]"
                      : "border-border/80 bg-background hover:border-foreground/20 hover:bg-muted/40",
                  )}
                >
                  <span
                    className={cn(
                      "flex size-6 shrink-0 items-center justify-center rounded-lg border transition-press",
                      isMarked
                        ? "border-emerald-600 bg-emerald-600 text-white"
                        : "border-border bg-card text-transparent group-hover:border-foreground/30",
                    )}
                  >
                    <HugeiconsIcon
                      icon={Tick01Icon}
                      size={14}
                      strokeWidth={3}
                      className={cn(
                        "transition-[scale,opacity] duration-200 ease-[var(--ease-out)]",
                        isMarked
                          ? "scale-100 opacity-100"
                          : "scale-50 opacity-0",
                      )}
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

      {/* ─── Floating Save Bar ────── */}
      <div className="fixed bottom-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+1rem))] inset-x-0 mx-auto z-40 w-[calc(100%-2rem)] max-w-md">
        <div className="flex items-center justify-between gap-3 rounded-full glass glass-thick py-[7px] pr-[7px] pl-4 sm:pl-5">
          <div className="min-w-0 flex-1 pr-1 text-left" aria-live="polite">
            {saveState === "saving" ? (
              <span className="truncate text-[13px] font-medium text-muted-foreground">
                Saving your availability…
              </span>
            ) : saveState === "saved" ? (
              <span className="truncate text-[13px] font-medium text-emerald-600 dark:text-emerald-400">
                Saved
              </span>
            ) : saveState === "error" ? (
              <span className="inline-flex items-center gap-1.5 truncate text-[13px] font-medium text-(--tint-red-fg) dark:text-red-400">
                <HugeiconsIcon
                  icon={AlertCircleIcon}
                  className="size-4 shrink-0"
                />
                <span className="truncate">
                  Couldn&apos;t save. Check your connection and retry.
                </span>
              </span>
            ) : changeCount > 0 ? (
              <span className="truncate text-[13px] font-medium text-muted-foreground">
                {changeCount} unsaved{" "}
                <span className="hidden sm:inline">
                  {changeCount === 1 ? "change" : "changes"}
                </span>
              </span>
            ) : (
              <span className="truncate text-[13px] font-medium text-muted-foreground">
                All changes saved
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={handleReset}
              className={cn(
                "h-11 px-3 text-sm font-semibold transition-[opacity,transform,visibility] duration-200 ease-[var(--ease-smooth)] motion-reduce:transition-none motion-reduce:transform-none",
                changeCount > 0
                  ? "opacity-100 scale-100 pointer-events-auto visible"
                  : "opacity-0 scale-95 pointer-events-none invisible",
              )}
            >
              Reset
            </Button>

            <Button
              type="button"
              variant="success"
              size="lg"
              onClick={handleSave}
              disabled={changeCount === 0 || saveState === "saving"}
              aria-busy={saveState === "saving"}
              className={cn(
                "h-11 min-w-[116px] px-4 font-semibold text-sm",
                isShaking && "animate-shake",
              )}
            >
              {saveState === "saving" ? (
                <>
                  <Spinner className="size-4" label="Saving availability" />
                  <span>Saving…</span>
                </>
              ) : saveState === "saved" ? (
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    size={16}
                    strokeWidth={2.5}
                  />
                  <span>Saved</span>
                </span>
              ) : (
                <span className="flex items-center gap-1.5">
                  <HugeiconsIcon
                    icon={Tick02Icon}
                    size={16}
                    strokeWidth={2.5}
                  />
                  <span>Save</span>
                  {changeCount > 0 && (
                    <span className="inline-grid place-items-center rounded-full bg-white/25 px-1.5 text-xs tabular-nums text-white">
                      {changeCount}
                    </span>
                  )}
                </span>
              )}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
