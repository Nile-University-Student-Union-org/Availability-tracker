"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { type DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import {
  DAY_OF_WEEK_MAP,
  fromMinutes,
  toMinutes,
  legacyWeeklySchedule,
  validateWeeklySlots,
  type WeeklySlot,
} from "@/lib/weekly-slots";
import { WeeklySlotsEditor } from "@/components/admin/weekly-slots-editor";
import { DateSlotsEditor } from "@/components/admin/date-slots-editor";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon } from "@hugeicons/core-free-icons";

export type ScheduleConfigData = {
  startDate: string;
  endDate: string;
  slotMode: "fixed" | "free";
  timeSlots: string[];
  /** start → end for custom-length date slots */
  slotEnds?: Record<string, string>;
  dateScheduleActive?: boolean;
  weeklyScheduleActive?: boolean;
  weeklyDays?: number[];
  weeklySlots?: WeeklySlot[];
  dateScheduleTitle?: string;
  weeklyScheduleTitle?: string;
};

function formatDateLabel(iso: string): string {
  if (!iso) return "Pick date";
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function toISO(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function getDaysInRange(startIso?: string, endIso?: string): string[] {
  if (!startIso || !endIso || startIso > endIso) return [];
  const days: string[] = [];
  const current = new Date(startIso + "T00:00:00");
  const end = new Date(endIso + "T00:00:00");
  while (current <= end) {
    days.push(toISO(current));
    current.setDate(current.getDate() + 1);
  }
  return days;
}

interface DatePickerProps {
  label: string;
  value: string;
  startDate?: string;
  endDate?: string;
  isEndDate?: boolean;
  onChange: (iso: string) => void;
}

function DatePicker({
  label,
  value,
  startDate,
  isEndDate = false,
  onChange,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value + "T00:00:00") : undefined;

  const defaultMonth =
    selected ||
    (isEndDate && startDate ? new Date(startDate + "T00:00:00") : undefined);

  return (
    <div className="flex-1 space-y-1">
      <Label className="text-xs font-semibold text-foreground/80">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className={cn(
            "group relative flex min-h-[46px] w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/70 px-3 py-2 text-left text-sm font-medium shadow-2xs transition-press outline-none hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.98] cursor-pointer touch-manipulation",
            open && "border-primary ring-2 ring-primary/20 bg-accent/40",
            !value && "text-muted-foreground",
          )}
        >
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <div
              className={cn(
                "flex size-7.5 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20",
                !value && "bg-muted text-muted-foreground",
              )}
            >
              <HugeiconsIcon
                icon={Calendar03Icon}
                className="size-4"
                strokeWidth={1.75}
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <span
                className={cn(
                  "truncate text-xs font-semibold text-foreground",
                  !value && "font-normal text-muted-foreground",
                )}
              >
                {formatDateLabel(value)}
              </span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground/60">›</span>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          className="w-auto p-0 rounded-3xl overflow-hidden shadow-xl border-border/80"
        >
          <Calendar
            mode="single"
            selected={selected}
            defaultMonth={defaultMonth}
            disabled={
              isEndDate && startDate ? (d) => toISO(d) < startDate : undefined
            }
            onSelect={(day) => {
              if (day) {
                onChange(toISO(day));
                setOpen(false);
              }
            }}
            className="rounded-3xl p-3"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

// Smooth open/close for settings that belong to a toggled form. The negative
// top margin cancels the parent's gap while closed, so nothing jumps.
function Reveal({
  open,
  children,
}: {
  open: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      inert={!open}
      aria-hidden={!open}
      className={cn(
        "-mt-5 grid transition-[grid-template-rows,opacity] duration-300 ease-[var(--ease-out)] motion-reduce:transition-none",
        open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
      )}
    >
      <div className="min-h-0 overflow-hidden">
        <div className="flex flex-col gap-5 pt-5">{children}</div>
      </div>
    </div>
  );
}

/** Returns the first problem with one form's settings, or null when valid */
export function validateScheduleConfig(
  config: ScheduleConfigData,
  mode: "date" | "weekly",
): string | null {
  if (mode === "date") {
    if (!config.startDate || !config.endDate) {
      return "Please set both start and end dates.";
    }
    if (config.startDate > config.endDate) {
      return "Start date must be before or equal to end date.";
    }
    if (config.slotMode === "fixed" && config.timeSlots.length === 0) {
      return "Please add at least one time slot for fixed mode.";
    }
    return null;
  }
  const weeklyDays = config.weeklyDays ?? [];
  const weeklySlots = (config.weeklySlots ?? []).filter((s) =>
    weeklyDays.includes(s.dayOfWeek),
  );
  const weeklyError = validateWeeklySlots(weeklyDays, weeklySlots);
  return weeklyError ? `Semester timetable: ${weeklyError}` : null;
}

interface ScheduleConfigPanelProps {
  initialConfig?: ScheduleConfigData | null;
  /** Edit a single poll's schedule; the caller owns naming, status and saving */
  mode: "date" | "weekly";
  onConfigChange?: (config: ScheduleConfigData) => void;
}

export function ScheduleConfigPanel({
  initialConfig = null,
  mode,
  onConfigChange,
}: ScheduleConfigPanelProps) {
  const [config, setConfig] = useState<ScheduleConfigData>(() => ({
    startDate: initialConfig?.startDate ?? "",
    endDate: initialConfig?.endDate ?? "",
    slotMode: initialConfig?.slotMode ?? "fixed",
    timeSlots: initialConfig?.timeSlots ?? [],
    dateScheduleActive: initialConfig?.dateScheduleActive ?? true,
    weeklyScheduleActive: initialConfig?.weeklyScheduleActive ?? true,
    weeklyDays: initialConfig?.weeklyDays ?? legacyWeeklySchedule().weeklyDays,
    weeklySlots:
      initialConfig?.weeklySlots ?? legacyWeeklySchedule().weeklySlots,
    dateScheduleTitle:
      initialConfig?.dateScheduleTitle ?? "Specific Date Availability",
    weeklyScheduleTitle:
      initialConfig?.weeklyScheduleTitle ?? "Semester Availability",
  }));

  useEffect(() => {
    onConfigChange?.(config);
  }, [config, onConfigChange]);

  function toggleWeeklyDay(day: number) {
    setConfig((prev) => {
      const days = prev.weeklyDays ?? [];
      return {
        ...prev,
        weeklyDays: days.includes(day)
          ? days.filter((d) => d !== day)
          : [...days, day].sort((a, b) => a - b),
      };
    });
  }

  const [selectingStart, setSelectingStart] = useState<string | null>(null);
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  function setPresetRange(daysCount: number) {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + daysCount - 1);
    setSelectingStart(null);
    setHoveredDate(null);
    setConfig((prev) => ({
      ...prev,
      startDate: toISO(start),
      endDate: toISO(end),
    }));
  }

  function clearRange() {
    setSelectingStart(null);
    setHoveredDate(null);
    setConfig((prev) => ({
      ...prev,
      startDate: "",
      endDate: "",
    }));
  }

  function commitRange(a: string, b: string) {
    setConfig((prev) => ({
      ...prev,
      startDate: a < b ? a : b,
      endDate: a < b ? b : a,
    }));
    setSelectingStart(null);
    setHoveredDate(null);
    // A short tick on phones that support it, on the commit itself
    navigator.vibrate?.(8);
  }

  // Drag across days to pick a range. It only starts once the pointer
  // reaches another day, so a plain click keeps the click-click flow.
  const drag = useRef<{ origin: string; moved: boolean } | null>(null);
  const skipClick = useRef(false);
  const dayAt = (x: number, y: number) =>
    document
      .elementFromPoint(x, y)
      ?.closest("td[data-day]")
      ?.getAttribute("data-day") ?? null;

  function handleDayClick(day?: Date) {
    if (!day) return;
    // The click that ends a drag was already handled on pointer up
    if (skipClick.current) return;
    const iso = toISO(day);

    if (!selectingStart) {
      setSelectingStart(iso);
      setHoveredDate(iso);
      setConfig((prev) => ({
        ...prev,
        startDate: iso,
        endDate: iso,
      }));
    } else {
      commitRange(selectingStart, iso);
    }
  }

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && selectingStart) {
        setSelectingStart(null);
        setHoveredDate(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectingStart]);

  function handleDayMouseEnter(day?: Date) {
    if (!selectingStart || !day) return;
    setHoveredDate(toISO(day));
  }

  const activeEffectiveRange = useMemo<DateRange | undefined>(() => {
    if (selectingStart) {
      if (!hoveredDate || hoveredDate === selectingStart) {
        return {
          from: new Date(selectingStart + "T00:00:00"),
          to: new Date(selectingStart + "T00:00:00"),
        };
      }
      const start = selectingStart < hoveredDate ? selectingStart : hoveredDate;
      const end = selectingStart < hoveredDate ? hoveredDate : selectingStart;
      return {
        from: new Date(start + "T00:00:00"),
        to: new Date(end + "T00:00:00"),
      };
    }

    if (!config.startDate) return undefined;
    return {
      from: new Date(config.startDate + "T00:00:00"),
      to: config.endDate ? new Date(config.endDate + "T00:00:00") : undefined,
    };
  }, [selectingStart, hoveredDate, config.startDate, config.endDate]);

  const displayStart = selectingStart
    ? hoveredDate && hoveredDate < selectingStart
      ? hoveredDate
      : selectingStart
    : config.startDate;
  const displayEnd = selectingStart
    ? hoveredDate && hoveredDate > selectingStart
      ? hoveredDate
      : selectingStart
    : config.endDate;

  const activeDays = getDaysInRange(displayStart, displayEnd);
  const dateCount = activeDays.length;

  // Controlled month, so typing a date or using a preset brings that month
  // into view; clicks inside the visible month leave it alone
  const [calendarMonth, setCalendarMonth] = useState(() =>
    config.startDate ? new Date(config.startDate + "T00:00:00") : new Date(),
  );
  const [prevStartDate, setPrevStartDate] = useState(config.startDate);
  if (prevStartDate !== config.startDate) {
    setPrevStartDate(config.startDate);
    if (config.startDate) {
      const start = new Date(config.startDate + "T00:00:00");
      if (
        calendarMonth.getFullYear() !== start.getFullYear() ||
        calendarMonth.getMonth() !== start.getMonth()
      ) {
        setCalendarMonth(start);
      }
    }
  }

  const openDaysPicker = (
    <div className="space-y-1">
      <Label className="text-xs font-semibold text-foreground/80">
        Open Days
      </Label>
      <div
        role="group"
        aria-label="Open days"
        className="grid grid-cols-7 gap-1"
      >
        {DAY_OF_WEEK_MAP.map(({ day, short, label }) => {
          const isOpen = config.weeklyDays?.includes(day) ?? false;
          return (
            <button
              key={day}
              type="button"
              aria-pressed={isOpen}
              aria-label={label}
              onClick={() => toggleWeeklyDay(day)}
              className={cn(
                "min-h-[44px] min-w-0 rounded-xl border text-[11px] font-semibold transition-press cursor-pointer touch-manipulation active:scale-[0.97] md:min-h-9",
                isOpen
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                  : "border-border/60 bg-background/40 text-muted-foreground hover:bg-accent/40 hover:text-foreground",
              )}
            >
              {short}
            </button>
          );
        })}
      </div>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 pb-8">
      <Reveal open={mode === "date"}>
        {/* ─── 2. Apple-Grade Interactive Date Range Studio ────────────────────── */}
        <div className="rounded-3xl border border-border/70 bg-card/60 backdrop-blur-2xl p-3.5 sm:p-6 shadow-sm space-y-4">
          {/* Header with Title and Segmented Presets */}
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 pb-3.5">
            <div className="flex items-center gap-2.5">
              <div className="flex size-8.5 items-center justify-center rounded-xl bg-primary/10 text-primary ring-1 ring-primary/20 shrink-0">
                <HugeiconsIcon icon={Calendar03Icon} size={18} />
              </div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">
                  Specific Date Range
                </h2>
                {dateCount > 0 ? (
                  <Badge
                    variant="outline"
                    className="border-[#0F3056]/30 bg-[#0F3056]/10 text-[#0F3056] dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400 text-[10px] font-bold py-0 h-5"
                  >
                    {dateCount} {dateCount === 1 ? "Day" : "Days"}
                  </Badge>
                ) : (
                  <Badge
                    variant="outline"
                    className="border-muted-foreground/30 text-muted-foreground text-[10px] font-medium py-0 h-5"
                  >
                    No Range
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setPresetRange(3)}
                className="h-11 min-w-11 md:h-7 md:min-w-0 text-[11px] font-semibold cursor-pointer px-2.5 touch-manipulation transition-press active:scale-[0.97]"
              >
                3D
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setPresetRange(5)}
                className="h-11 min-w-11 md:h-7 md:min-w-0 text-[11px] font-semibold cursor-pointer px-2.5 touch-manipulation transition-press active:scale-[0.97]"
              >
                5D
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setPresetRange(7)}
                className="h-11 min-w-11 md:h-7 md:min-w-0 text-[11px] font-semibold cursor-pointer px-2.5 touch-manipulation transition-press active:scale-[0.97]"
              >
                7D
              </Button>
              <Button
                type="button"
                variant="outline"
                size="xs"
                onClick={() => setPresetRange(14)}
                className="h-11 min-w-11 md:h-7 md:min-w-0 text-[11px] font-semibold cursor-pointer px-2.5 touch-manipulation transition-press active:scale-[0.97]"
              >
                14D
              </Button>
              {dateCount > 0 && (
                <Button
                  type="button"
                  variant="destructive"
                  size="xs"
                  onClick={clearRange}
                  className="h-11 md:h-7 text-[11px] font-semibold cursor-pointer px-2 touch-manipulation transition-press active:scale-[0.97]"
                >
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Date Pickers & Apple Interactive Calendar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            <div className="lg:col-span-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-2.5">
                <DatePicker
                  label="Start Date"
                  value={config.startDate}
                  startDate={config.startDate}
                  endDate={config.endDate}
                  onChange={(iso) => {
                    setSelectingStart(null);
                    setHoveredDate(null);
                    setConfig((prev) => {
                      const next: ScheduleConfigData = {
                        ...prev,
                        startDate: iso,
                      };
                      if (prev.endDate && iso > prev.endDate) {
                        next.endDate = iso;
                      }
                      return next;
                    });
                  }}
                />
                <DatePicker
                  label="End Date"
                  value={config.endDate}
                  startDate={config.startDate}
                  endDate={config.endDate}
                  isEndDate={true}
                  onChange={(iso) => {
                    setSelectingStart(null);
                    setHoveredDate(null);
                    setConfig((prev) => ({ ...prev, endDate: iso }));
                  }}
                />
              </div>
            </div>

            <div
              onMouseLeave={() => {
                if (selectingStart && !drag.current?.moved)
                  setHoveredDate(selectingStart);
              }}
              onPointerDown={(e) => {
                if (e.button !== 0) return;
                const origin = (e.target as HTMLElement)
                  .closest("td[data-day]")
                  ?.getAttribute("data-day");
                drag.current = origin ? { origin, moved: false } : null;
              }}
              onPointerMove={(e) => {
                const d = drag.current;
                if (!d) return;
                const iso = dayAt(e.clientX, e.clientY);
                if (!iso) return;
                if (!d.moved && iso !== d.origin) {
                  d.moved = true;
                  e.currentTarget.setPointerCapture(e.pointerId);
                  setSelectingStart(d.origin);
                }
                if (d.moved) setHoveredDate(iso);
              }}
              onPointerUp={(e) => {
                const d = drag.current;
                drag.current = null;
                if (!d?.moved) return;
                commitRange(
                  d.origin,
                  dayAt(e.clientX, e.clientY) ?? hoveredDate ?? d.origin,
                );
                skipClick.current = true;
                setTimeout(() => (skipClick.current = false), 0);
              }}
              onPointerCancel={() => {
                if (drag.current?.moved) {
                  setSelectingStart(null);
                  setHoveredDate(null);
                }
                drag.current = null;
              }}
              className="lg:col-span-7 flex flex-col items-center justify-center p-1.5 sm:p-4 rounded-3xl bg-background/50 border border-border/70 shadow-2xs [touch-action:pan-y]"
            >
              <Calendar
                animate
                mode="range"
                month={calendarMonth}
                onMonthChange={setCalendarMonth}
                selected={activeEffectiveRange}
                // Without onSelect, react-day-picker keeps its own range and
                // drifts from the inputs; clicks are handled by onDayClick
                onSelect={() => {}}
                onDayClick={handleDayClick}
                onDayMouseEnter={handleDayMouseEnter}
                className="rounded-3xl p-0 sm:p-1 w-full max-w-sm [--cell-size:--spacing(7)] sm:[--cell-size:--spacing(8)]"
              />
              {selectingStart && (
                <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium animate-in fade-in duration-200">
                  <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                  <span>Now pick the end date, or drag across days</span>
                  <span className="ml-1 hidden text-muted-foreground md:inline">
                    (Esc to cancel)
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── 3. Time Slots ─────────────────────────────────────────────────── */}
        <DateSlotsEditor
          slotMode={config.slotMode}
          onSlotModeChange={(slotMode) =>
            setConfig((prev) => ({ ...prev, slotMode }))
          }
          slots={config.timeSlots.map((startTime) => ({
            startTime,
            endTime:
              config.slotEnds?.[startTime] ??
              fromMinutes(Math.min(toMinutes(startTime) + 60, 1439)),
          }))}
          onChange={(slots) =>
            setConfig((prev) => ({
              ...prev,
              timeSlots: slots.map((s) => s.startTime),
              slotEnds: Object.fromEntries(
                slots.map((s) => [s.startTime, s.endTime]),
              ),
            }))
          }
        />
      </Reveal>

      {/* ─── 4. Semester Time Slots ─────────────────────────────────────────── */}
      <Reveal open={mode === "weekly"}>
        <div className="rounded-3xl border border-border/70 bg-card/60 p-5 shadow-xs">
          {openDaysPicker}
        </div>
        <WeeklySlotsEditor
          days={config.weeklyDays ?? []}
          slots={config.weeklySlots ?? []}
          onChange={(weeklySlots) =>
            setConfig((prev) => ({ ...prev, weeklySlots }))
          }
        />
      </Reveal>
    </div>
  );
}
