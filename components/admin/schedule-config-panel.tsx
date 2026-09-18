"use client";

import { useCallback, useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
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
} from "@hugeicons/core-free-icons";

export type ScheduleConfigData = {
  startDate: string
  endDate: string
  slotMode: "fixed" | "free"
  timeSlots: string[]
  dateScheduleActive?: boolean
  weeklyScheduleActive?: boolean
  weeklyIncludeSaturday?: boolean
  dateScheduleTitle?: string
  weeklyScheduleTitle?: string
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatDateLabel(iso: string): string {
  if (!iso) return "Pick a date";
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
  endDate,
  isEndDate = false,
  onChange,
}: DatePickerProps) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value + "T00:00:00") : undefined;

  // Compute active range boundaries for calendar highlight
  const effectiveStart = isEndDate ? startDate : value || startDate;
  const effectiveEnd = isEndDate ? value || endDate : endDate;

  const hasRange =
    !!effectiveStart && !!effectiveEnd && effectiveStart <= effectiveEnd;

  const isSingleDay = hasRange && effectiveStart === effectiveEnd;

  const rangeModifiers = {
    range_start: (date: Date) =>
      hasRange && !isSingleDay && toISO(date) === effectiveStart,
    range_middle: (date: Date) => {
      if (!hasRange || isSingleDay) return false;
      const iso = toISO(date);
      return iso > effectiveStart && iso < effectiveEnd;
    },
    range_end: (date: Date) =>
      hasRange && !isSingleDay && toISO(date) === effectiveEnd,
  };

  const defaultMonth =
    selected ||
    (isEndDate && startDate ? new Date(startDate + "T00:00:00") : undefined);

  return (
    <div className="flex-1 space-y-1.5">
      <Label className="text-xs font-semibold tracking-wide text-foreground/80">
        {label}
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          type="button"
          className={cn(
            "group relative flex min-h-[52px] sm:min-h-[48px] w-full items-center justify-between gap-3 rounded-2xl border border-border/70 bg-card/70 px-3.5 py-2.5 text-left text-sm font-medium shadow-2xs transition-all duration-200 outline-none hover:border-primary/50 hover:bg-accent/40 hover:shadow-xs focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 active:scale-[0.98] cursor-pointer touch-manipulation",
            open && "border-primary ring-3 ring-primary/20 bg-accent/40",
            !value && "text-muted-foreground",
          )}
        >
          <div className="flex items-center gap-3 min-w-0 flex-1">
            <div
              className={cn(
                "flex size-8.5 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary/20",
                !value && "bg-muted text-muted-foreground",
              )}
            >
              <HugeiconsIcon
                icon={Calendar03Icon}
                className="size-4.5"
                strokeWidth={1.75}
              />
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                {value ? label : "Select date"}
              </span>
              <span
                className={cn(
                  "truncate text-sm font-semibold text-foreground",
                  !value && "font-normal text-muted-foreground",
                )}
              >
                {formatDateLabel(value)}
              </span>
            </div>
          </div>
          <span className="text-xs text-muted-foreground/60 transition-transform group-hover:translate-x-0.5">
            ›
          </span>
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
            modifiers={rangeModifiers}
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
  initialConfig?: ScheduleConfigData | null
}

export function ScheduleConfigPanel({
  initialConfig = null,
}: ScheduleConfigPanelProps = {}) {
  const router = useRouter()
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
  }))
  const [isLoading, setIsLoading] = useState(!initialConfig)
  const [isSaving, setIsSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newSlotTime, setNewSlotTime] = useState("09:00")

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/schedule-config?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      })
      if (res.ok) {
        const data = await res.json()
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
        })
      }
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!initialConfig) {
      void fetchConfig()
    }
  }, [fetchConfig, initialConfig])

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
      })
      if (!res.ok) {
        const errData = await res.json().catch(() => null)
        throw new Error(errData?.error || "Failed to save")
      }
      setSaved(true)
      router.refresh()
      await fetchConfig()
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to save configuration. Please try again."
      )
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

  // Compute active days list and count for preview
  const activeDays = getDaysInRange(config.startDate, config.endDate);
  const dateCount = activeDays.length;

  if (isLoading) {
    return (
      <div className="flex min-h-[360px] w-full flex-col items-center justify-center rounded-3xl border border-border/80 bg-card p-8 shadow-xs">
        <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="mt-3 text-xs font-medium text-muted-foreground">
          Loading schedule configuration...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Availability Controls & Toggles */}
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <HugeiconsIcon
            icon={Clock01Icon}
            className="size-4.5 text-primary"
            strokeWidth={1.5}
          />
          <div>
            <h2 className="font-heading text-base font-semibold">
              Availability Controls & Submissions
            </h2>
            <p className="text-xs text-muted-foreground">
              Toggle which availability options are currently accepting responses from members
            </p>
          </div>
        </div>

        <div className="divide-y p-5 space-y-4">
          {/* Specific Date Toggle */}
          <div className="flex items-center justify-between gap-4 pt-1">
            <div>
              <p className="text-sm font-medium">Accept Specific Date Submissions (/specific)</p>
              <p className="text-xs text-muted-foreground">
                When enabled, members can mark availability for specific calendar dates.
              </p>
            </div>
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

          {/* Semester Availability Toggle */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <div>
              <p className="text-sm font-medium">Accept Semester Availability Submissions (/weekly)</p>
              <p className="text-xs text-muted-foreground">
                When enabled, members can mark their standing weekly semester timetable.
              </p>
            </div>
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

          {/* Saturday Inclusion Toggle */}
          <div className="flex items-center justify-between gap-4 pt-4">
            <div>
              <p className="text-sm font-medium">Include Saturday in Semester Timetable</p>
              <p className="text-xs text-muted-foreground">
                Expands the semester timetable from Sun–Thu (5 days) to Sun–Sat (6 days).
              </p>
            </div>
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

          {/* Form Display Names / Custom Titles */}
          <div className="pt-5 space-y-3">
            <div>
              <p className="text-sm font-medium">Form Display Names (Member-Facing)</p>
              <p className="text-xs text-muted-foreground">
                Customize what members see in the navbar and page headers (e.g. rename Specific Date to &quot;Orientation Week Availability&quot; or an event name)
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Specific Date Form Name
                </Label>
                <Input
                  value={config.dateScheduleTitle ?? "Specific Date Availability"}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      dateScheduleTitle: e.target.value,
                    }))
                  }
                  placeholder="e.g. Orientation Week Availability"
                  className="mt-1.5 h-9 text-xs sm:text-sm bg-background/60"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Displays on /specific and in the main navigation
                </p>
              </div>

              <div>
                <Label className="text-xs font-semibold text-foreground">
                  Semester Availability Form Name
                </Label>
                <Input
                  value={config.weeklyScheduleTitle ?? "Semester Availability"}
                  onChange={(e) =>
                    setConfig((prev) => ({
                      ...prev,
                      weeklyScheduleTitle: e.target.value,
                    }))
                  }
                  placeholder="e.g. Semester Availability"
                  className="mt-1.5 h-9 text-xs sm:text-sm bg-background/60"
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Displays on /weekly and in the main navigation
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Date Range */}
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <HugeiconsIcon
            icon={Calendar03Icon}
            className="size-4.5 text-primary"
            strokeWidth={1.5}
          />
          <div>
            <h2 className="font-heading text-base font-semibold">Date Range</h2>
            <p className="text-xs text-muted-foreground">
              Set the active days users can mark availability for
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 sm:gap-4">
            <DatePicker
              label="Start Date"
              value={config.startDate}
              startDate={config.startDate}
              endDate={config.endDate}
              onChange={(iso) =>
                setConfig((prev) => {
                  const next: ScheduleConfigData = { ...prev, startDate: iso };
                  if (prev.endDate && iso > prev.endDate) {
                    next.endDate = iso;
                  }
                  return next;
                })
              }
            />
            <DatePicker
              label="End Date"
              value={config.endDate}
              startDate={config.startDate}
              endDate={config.endDate}
              isEndDate={true}
              onChange={(iso) =>
                setConfig((prev) => ({ ...prev, endDate: iso }))
              }
            />
          </div>

          {dateCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <Badge
                variant="secondary"
                className="rounded-full bg-primary/10 text-primary border border-primary/20 text-xs px-2.5 py-0.5 font-medium"
              >
                {dateCount} active day{dateCount !== 1 ? "s" : ""} selected
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">
                {config.startDate} → {config.endDate}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Slot Mode */}
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <HugeiconsIcon
            icon={Clock01Icon}
            className="size-4.5 text-primary"
            strokeWidth={1.5}
          />
          <div>
            <h2 className="font-heading text-base font-semibold">
              Booking Mode
            </h2>
            <p className="text-xs text-muted-foreground">
              How users select their available times
            </p>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium">Free Booking</p>
              <p className="text-xs text-muted-foreground">
                {config.slotMode === "free"
                  ? "Users can type any time they are available"
                  : "Switch on to let users book any time instead of fixed slots"}
              </p>
            </div>
            <Switch
              checked={config.slotMode === "free"}
              onCheckedChange={(checked) =>
                setConfig((prev) => ({
                  ...prev,
                  slotMode: checked ? "free" : "fixed",
                }))
              }
            />
          </div>

          {/* Fixed Slots Section */}
          {config.slotMode === "fixed" && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-[11px] font-medium tracking-widest text-muted-foreground uppercase">
                  Time Slots
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Add slot */}
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="new-slot">Add Time Slot</Label>
                  <TimePicker
                    id="new-slot"
                    value={newSlotTime}
                    onChange={setNewSlotTime}
                    placeholder="Pick a time slot..."
                    className="rounded-3xl"
                  />
                </div>
                <Button
                  onClick={addTimeSlot}
                  size="sm"
                  disabled={
                    !newSlotTime || config.timeSlots.includes(newSlotTime)
                  }
                  className="rounded-2xl"
                >
                  <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
                  Add
                </Button>
              </div>

              {/* Slot list */}
              {config.timeSlots.length === 0 ? (
                <div className="rounded-2xl border border-dashed px-4 py-5 text-center">
                  <p className="text-sm text-muted-foreground">
                    No time slots configured yet. Add slots above.
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {config.timeSlots.map((slot) => (
                    <Badge
                      key={slot}
                      variant="secondary"
                      className="group gap-1.5 rounded-xl bg-primary/10 py-1.5 pr-1.5 pl-3 text-sm text-primary"
                    >
                      {formatTime(slot)}
                      <button
                        onClick={() => removeTimeSlot(slot)}
                        className="rounded-lg p-0.5 opacity-50 transition-opacity hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                      >
                        <HugeiconsIcon
                          icon={Delete02Icon}
                          className="size-3.5"
                          strokeWidth={2}
                        />
                      </button>
                    </Badge>
                  ))}
                </div>
              )}

              <p className="text-xs text-muted-foreground">
                {config.timeSlots.length} slot
                {config.timeSlots.length !== 1 ? "s" : ""} configured
              </p>
            </div>
          )}

          {config.slotMode === "free" && (
            <div className="rounded-2xl border border-dashed bg-primary/5 px-4 py-4 text-center">
              <p className="text-sm text-muted-foreground">
                Users will enter their available times manually. No pre-defined
                slots needed.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Save Button + Status */}
      {error && (
        <div className="rounded-2xl border border-destructive/30 bg-destructive/10 px-4 py-3">
          <p className="text-sm text-destructive">{error}</p>
        </div>
      )}

      <div className="flex items-center gap-3">
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className={cn(
            "rounded-2xl px-6",
            saved && "bg-emerald-600 hover:bg-emerald-600",
          )}
        >
          {saved ? (
            <>
              <HugeiconsIcon icon={Tick01Icon} className="size-4" />
              Saved
            </>
          ) : isSaving ? (
            "Saving..."
          ) : (
            "Save Configuration"
          )}
        </Button>

        {saved && (
          <p className="text-sm text-emerald-600 dark:text-emerald-400">
            Schedule updated successfully
          </p>
        )}
      </div>
    </div>
  );
}
