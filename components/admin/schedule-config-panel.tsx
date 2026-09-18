"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { type DateRange } from "react-day-picker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  Clock01Icon,
  Delete02Icon,
  PlusSignIcon,
  Tick01Icon,
  CheckmarkCircle02Icon,
} from "@hugeicons/core-free-icons";

export type ScheduleConfigData = {
  startDate: string;
  endDate: string;
  slotMode: "fixed" | "free";
  timeSlots: string[];
  dateScheduleActive?: boolean;
  weeklyScheduleActive?: boolean;
  weeklyIncludeSaturday?: boolean;
  dateScheduleTitle?: string;
  weeklyScheduleTitle?: string;
};

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function getSlotEndTime(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number);
  const endH = (h + 1) % 24;
  const suffix = endH >= 12 ? "PM" : "AM";
  const hour = endH % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

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
            "group relative flex min-h-[46px] w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/70 px-3 py-2 text-left text-sm font-medium shadow-2xs transition-all duration-200 outline-none hover:border-primary/50 hover:bg-accent/40 focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.98] cursor-pointer touch-manipulation",
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

interface ScheduleConfigPanelProps {
  initialConfig?: ScheduleConfigData | null;
}

export function ScheduleConfigPanel({
  initialConfig = null,
}: ScheduleConfigPanelProps = {}) {
  const router = useRouter();
  const [config, setConfig] = useState<ScheduleConfigData>(() => ({
    startDate: initialConfig?.startDate ?? "",
    endDate: initialConfig?.endDate ?? "",
    slotMode: initialConfig?.slotMode ?? "fixed",
    timeSlots: initialConfig?.timeSlots ?? [],
    dateScheduleActive: initialConfig?.dateScheduleActive ?? true,
    weeklyScheduleActive: initialConfig?.weeklyScheduleActive ?? true,
    weeklyIncludeSaturday: initialConfig?.weeklyIncludeSaturday ?? false,
    dateScheduleTitle:
      initialConfig?.dateScheduleTitle ?? "Specific Date Availability",
    weeklyScheduleTitle:
      initialConfig?.weeklyScheduleTitle ?? "Semester Availability",
  }));
  const [isLoading, setIsLoading] = useState(!initialConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSlotTime, setNewSlotTime] = useState("09:00");

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/schedule-config?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });
      if (res.ok) {
        const data = await res.json();
        setConfig({
          startDate: data.startDate,
          endDate: data.endDate,
          slotMode: data.slotMode,
          timeSlots: data.timeSlots ?? [],
          dateScheduleActive: data.dateScheduleActive ?? true,
          weeklyScheduleActive: data.weeklyScheduleActive ?? true,
          weeklyIncludeSaturday: data.weeklyIncludeSaturday ?? false,
          dateScheduleTitle:
            data.dateScheduleTitle || "Specific Date Availability",
          weeklyScheduleTitle:
            data.weeklyScheduleTitle || "Semester Availability",
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialConfig) {
      void fetchConfig();
    }
  }, [fetchConfig, initialConfig]);

  async function handleSave() {
    setError(null);
    setSaved(false);

    if (!config.startDate || !config.endDate) {
      setError("Please set both start and end dates.");
      return;
    }
    if (config.startDate > config.endDate) {
      setError("Start date must be before or equal to end date.");
      return;
    }
    if (config.slotMode === "fixed" && config.timeSlots.length === 0) {
      setError("Please add at least one time slot for fixed mode.");
      return;
    }

    setIsSaving(true);
    try {
      const res = await fetch("/api/admin/schedule-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(config),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Failed to save");
      }
      setSaved(true);
      router.refresh();
      await fetchConfig();
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to save configuration. Please try again.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  function addTimeSlot() {
    if (!newSlotTime) return;
    const normalized =
      newSlotTime.length === 5 ? newSlotTime : `0${newSlotTime}`;
    if (config.timeSlots.includes(normalized)) return;

    setConfig((prev) => ({
      ...prev,
      timeSlots: [...prev.timeSlots, normalized].sort(),
    }));
  }

  function removeTimeSlot(slot: string) {
    setConfig((prev) => ({
      ...prev,
      timeSlots: prev.timeSlots.filter((s) => s !== slot),
    }));
  }

  function addDefaultSlots() {
    const defaults = [
      "08:30",
      "09:30",
      "10:30",
      "11:30",
      "12:30",
      "13:30",
      "14:30",
      "15:30",
      "16:30",
    ];
    setConfig((prev) => ({
      ...prev,
      timeSlots: Array.from(new Set([...prev.timeSlots, ...defaults])).sort(),
    }));
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

  function handleDayClick(day?: Date) {
    if (!day) return;
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
      const start = selectingStart < iso ? selectingStart : iso;
      const end = selectingStart < iso ? iso : selectingStart;
      setConfig((prev) => ({
        ...prev,
        startDate: start,
        endDate: end,
      }));
      setSelectingStart(null);
      setHoveredDate(null);
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

  const calendarDisplayMonth = useMemo(() => {
    if (config.startDate) return new Date(config.startDate + "T00:00:00");
    return new Date();
  }, [config.startDate]);

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] w-full flex-col items-center justify-center rounded-3xl border border-border/80 bg-card p-8 shadow-xs">
        <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 pb-8">
      {/* ─── 1. Channel Controls (2-Column Grid) ─────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Specific Date Polls Card */}
        <div className="rounded-3xl border border-border/70 bg-card/60 backdrop-blur-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8.5 items-center justify-center rounded-xl bg-blue-500/10 text-blue-500 ring-1 ring-blue-500/20 shrink-0">
                  <HugeiconsIcon icon={Calendar03Icon} size={18} />
                </div>
                <h2 className="text-sm font-bold tracking-tight">
                  Specific Date Polls
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold py-0 h-5",
                    config.dateScheduleActive
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-muted-foreground/30 text-muted-foreground bg-muted/40",
                  )}
                >
                  {config.dateScheduleActive ? "Active" : "Closed"}
                </Badge>
                <Switch
                  checked={config.dateScheduleActive ?? true}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      dateScheduleActive: checked,
                    }))
                  }
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground/80">
                Form Display Name
              </Label>
              <Input
                value={config.dateScheduleTitle ?? "Specific Date Availability"}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    dateScheduleTitle: e.target.value,
                  }))
                }
                placeholder="Specific Date Availability"
                className="h-8.5 text-xs bg-background/60 rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Semester Recurring Availability Card */}
        <div className="rounded-3xl border border-border/70 bg-card/60 backdrop-blur-xl p-5 shadow-xs flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8.5 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20 shrink-0">
                  <HugeiconsIcon icon={Clock01Icon} size={18} />
                </div>
                <h2 className="text-sm font-bold tracking-tight">
                  Semester Timetable
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    "text-[10px] font-bold py-0 h-5",
                    config.weeklyScheduleActive
                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                      : "border-muted-foreground/30 text-muted-foreground bg-muted/40",
                  )}
                >
                  {config.weeklyScheduleActive ? "Active" : "Closed"}
                </Badge>
                <Switch
                  checked={config.weeklyScheduleActive ?? true}
                  onCheckedChange={(checked) =>
                    setConfig((prev) => ({
                      ...prev,
                      weeklyScheduleActive: checked,
                    }))
                  }
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/40 px-3 py-1.5">
              <span className="text-xs font-semibold text-foreground">
                Include Saturdays (6-day week)
              </span>
              <Switch
                checked={config.weeklyIncludeSaturday ?? false}
                onCheckedChange={(checked) =>
                  setConfig((prev) => ({
                    ...prev,
                    weeklyIncludeSaturday: checked,
                  }))
                }
              />
            </div>

            <div className="space-y-1">
              <Label className="text-xs font-semibold text-foreground/80">
                Form Display Name
              </Label>
              <Input
                value={config.weeklyScheduleTitle ?? "Semester Availability"}
                onChange={(e) =>
                  setConfig((prev) => ({
                    ...prev,
                    weeklyScheduleTitle: e.target.value,
                  }))
                }
                placeholder="Semester Availability"
                className="h-8.5 text-xs bg-background/60 rounded-xl"
              />
            </div>
          </div>
        </div>
      </div>

      {/* ─── 2. Apple-Grade Interactive Date Range Studio ────────────────────── */}
      <div className="rounded-3xl border border-border/70 bg-card/60 backdrop-blur-2xl p-5 sm:p-6 shadow-sm space-y-4">
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
              className="h-7 rounded-xl text-[11px] font-semibold cursor-pointer px-2.5 hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
            >
              3D
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setPresetRange(5)}
              className="h-7 rounded-xl text-[11px] font-semibold cursor-pointer px-2.5 hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
            >
              5D
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setPresetRange(7)}
              className="h-7 rounded-xl text-[11px] font-semibold cursor-pointer px-2.5 hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
            >
              7D
            </Button>
            <Button
              type="button"
              variant="outline"
              size="xs"
              onClick={() => setPresetRange(14)}
              className="h-7 rounded-xl text-[11px] font-semibold cursor-pointer px-2.5 hover:bg-primary/10 hover:text-primary transition-all active:scale-95"
            >
              14D
            </Button>
            {dateCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={clearRange}
                className="h-7 rounded-xl text-[11px] font-semibold cursor-pointer px-2 text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-all active:scale-95"
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
              if (selectingStart) setHoveredDate(selectingStart);
            }}
            className="lg:col-span-7 flex flex-col items-center justify-center p-4 rounded-3xl bg-background/50 border border-border/70 shadow-2xs"
          >
            <Calendar
              mode="range"
              defaultMonth={calendarDisplayMonth}
              selected={activeEffectiveRange}
              onDayClick={handleDayClick}
              onDayMouseEnter={handleDayMouseEnter}
              className="rounded-3xl p-1 w-full max-w-sm"
            />
            {selectingStart && (
              <div className="mt-2.5 flex items-center gap-1.5 px-3 py-1 rounded-full bg-primary/10 text-primary border border-primary/20 text-[11px] font-medium animate-in fade-in duration-200">
                <span className="size-1.5 rounded-full bg-primary animate-pulse" />
                <span>Click a date to set range end</span>
                <span className="text-muted-foreground ml-1">
                  (Esc to cancel)
                </span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── 3. Time Slots Card ─────────────────────────────────────────────── */}
      <div className="rounded-3xl border border-border/70 bg-card/60 backdrop-blur-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="flex size-8.5 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20 shrink-0">
              <HugeiconsIcon icon={Clock01Icon} size={18} />
            </div>
            <h2 className="text-sm font-bold tracking-tight">Time Slots</h2>
          </div>

          <div className="flex items-center gap-1 p-0.5 rounded-xl bg-muted/60 border border-border/60">
            <button
              type="button"
              onClick={() =>
                setConfig((prev) => ({ ...prev, slotMode: "fixed" }))
              }
              className={cn(
                "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer",
                config.slotMode === "fixed"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Fixed Slots
            </button>
            <button
              type="button"
              onClick={() =>
                setConfig((prev) => ({ ...prev, slotMode: "free" }))
              }
              className={cn(
                "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-all cursor-pointer",
                config.slotMode === "free"
                  ? "bg-background text-foreground shadow-xs font-bold"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              Free Manual
            </button>
          </div>
        </div>

        {config.slotMode === "fixed" ? (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-end gap-2.5 p-3 rounded-2xl bg-background/50 border border-border/60">
              <div className="flex-1 space-y-1">
                <Label htmlFor="new-slot" className="text-xs font-semibold">
                  Add Time Slot
                </Label>
                <TimePicker
                  id="new-slot"
                  value={newSlotTime}
                  onChange={setNewSlotTime}
                  placeholder="Pick start time..."
                  className="rounded-xl"
                />
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  onClick={addTimeSlot}
                  disabled={
                    !newSlotTime || config.timeSlots.includes(newSlotTime)
                  }
                  className="h-9 px-3.5 rounded-xl gap-1.5 bg-primary text-primary-foreground font-semibold text-xs cursor-pointer shadow-xs"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={14} />
                  <span>Add Slot</span>
                </Button>

                <Button
                  type="button"
                  variant="outline"
                  onClick={addDefaultSlots}
                  className="h-9 px-3 text-xs font-semibold rounded-xl cursor-pointer"
                >
                  Presets (8:30–5:30)
                </Button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  Configured Slots ({config.timeSlots.length})
                </span>
                {config.timeSlots.length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      setConfig((prev) => ({ ...prev, timeSlots: [] }))
                    }
                    className="text-xs text-muted-foreground hover:text-destructive transition-colors cursor-pointer font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {config.timeSlots.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 p-5 text-center">
                  <p className="text-xs text-muted-foreground">
                    No time slots configured.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-2">
                  {config.timeSlots.map((slot) => (
                    <div
                      key={slot}
                      className="group flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl border border-border/70 bg-card hover:border-primary/40 hover:bg-accent/30 transition-all"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold tracking-tight text-foreground truncate">
                          {formatTime(slot)}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate">
                          → {getSlotEndTime(slot)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeTimeSlot(slot)}
                        aria-label={`Remove slot ${slot}`}
                        className="size-5 shrink-0 flex items-center justify-center rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors cursor-pointer opacity-60 group-hover:opacity-100"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={13} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-border/80 bg-background/40 p-5 text-center">
            <p className="text-xs font-semibold text-foreground">
              Freeform Manual Booking Active
            </p>
          </div>
        )}
      </div>

      {/* ─── 4. Save Action Bar ──────────────────────────────────────────────── */}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-xs text-destructive font-medium">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-4 pt-1">
        <div className="flex items-center gap-2">
          {saved && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400 animate-in fade-in duration-200">
              <HugeiconsIcon icon={CheckmarkCircle02Icon} size={15} />
              <span>Saved successfully</span>
            </div>
          )}
        </div>

        <Button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "min-h-[42px] px-5 rounded-2xl gap-2 font-semibold text-xs sm:text-sm cursor-pointer shadow-md active:scale-95 transition-all",
            saved
              ? "bg-emerald-600 hover:bg-emerald-600 text-white"
              : "bg-[#0F3056] text-white hover:bg-[#0F3056]/90 dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90",
          )}
        >
          {saved ? (
            <>
              <HugeiconsIcon icon={Tick01Icon} size={15} strokeWidth={2.5} />
              <span>Saved</span>
            </>
          ) : isSaving ? (
            <>
              <div className="size-3.5 animate-spin rounded-full border-2 border-white border-t-transparent" />
              <span>Saving...</span>
            </>
          ) : (
            <>
              <HugeiconsIcon icon={Tick01Icon} size={15} strokeWidth={2.5} />
              <span>Save Configuration</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
