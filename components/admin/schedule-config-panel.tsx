"use client";

import { useCallback, useEffect, useState } from "react";
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
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  Clock01Icon,
  Delete02Icon,
  PlusSignIcon,
  Tick01Icon,
} from "@hugeicons/core-free-icons";

type ScheduleConfigData = {
  startDate: string;
  endDate: string;
  slotMode: "fixed" | "free";
  timeSlots: string[];
};

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

function DatePicker({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (iso: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const selected = value ? new Date(value + "T00:00:00") : undefined;

  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          className={cn(
            "flex h-9 w-full items-center gap-2 rounded-3xl border border-transparent bg-input/50 px-3 text-sm transition-[color,box-shadow,background-color] outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30",
            !value && "text-muted-foreground",
          )}
        >
          <HugeiconsIcon
            icon={Calendar03Icon}
            className="size-4 text-muted-foreground"
            strokeWidth={1.5}
          />
          {formatDateLabel(value)}
        </PopoverTrigger>
        <PopoverContent align="start" className="w-auto p-0">
          <Calendar
            mode="single"
            selected={selected}
            onSelect={(day) => {
              if (day) {
                onChange(toISO(day));
                setOpen(false);
              }
            }}
            className="rounded-3xl"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ScheduleConfigPanel() {
  const [config, setConfig] = useState<ScheduleConfigData>({
    startDate: "",
    endDate: "",
    slotMode: "fixed",
    timeSlots: [],
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [newSlotTime, setNewSlotTime] = useState("09:00");

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch("/api/schedule-config");
      if (res.ok) {
        const data = await res.json();
        setConfig({
          startDate: data.startDate,
          endDate: data.endDate,
          slotMode: data.slotMode,
          timeSlots: data.timeSlots,
        });
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfig();
  }, [fetchConfig]);

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
      if (!res.ok) throw new Error("Failed to save");
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      setError("Failed to save configuration. Please try again.");
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

  // Compute date count for preview
  const dateCount =
    config.startDate && config.endDate
      ? Math.max(
          0,
          Math.floor(
            (new Date(config.endDate).getTime() -
              new Date(config.startDate).getTime()) /
              86400000,
          ) + 1,
        )
      : 0;

  if (isLoading) {
    return (
      <div className="rounded-3xl border bg-card p-6">
        <div className="h-6 w-48 animate-pulse rounded-lg bg-muted" />
        <div className="mt-4 space-y-3">
          <div className="h-10 animate-pulse rounded-2xl bg-muted" />
          <div className="h-10 animate-pulse rounded-2xl bg-muted" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Date Range */}
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="flex items-center gap-2 border-b px-5 py-4">
          <HugeiconsIcon
            icon={Calendar03Icon}
            className="size-4.5 text-primary"
            strokeWidth={1.5}
          />
          <div>
            <h2 className="font-heading text-base font-semibold">
              Date Range
            </h2>
            <p className="text-xs text-muted-foreground">
              Set the active days users can mark availability for
            </p>
          </div>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-2 gap-4">
            <DatePicker
              label="Start Date"
              value={config.startDate}
              onChange={(iso) =>
                setConfig((prev) => ({ ...prev, startDate: iso }))
              }
            />
            <DatePicker
              label="End Date"
              value={config.endDate}
              onChange={(iso) =>
                setConfig((prev) => ({ ...prev, endDate: iso }))
              }
            />
          </div>

          {dateCount > 0 && (
            <p className="text-xs text-muted-foreground">
              {dateCount} day{dateCount !== 1 ? "s" : ""} selected
            </p>
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
                <span className="text-[11px] font-medium uppercase tracking-widest text-muted-foreground">
                  Time Slots
                </span>
                <div className="h-px flex-1 bg-border" />
              </div>

              {/* Add slot */}
              <div className="flex items-end gap-2">
                <div className="flex-1 space-y-2">
                  <Label htmlFor="new-slot">Add Time Slot</Label>
                  <Input
                    id="new-slot"
                    type="time"
                    value={newSlotTime}
                    onChange={(e) => setNewSlotTime(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") addTimeSlot();
                    }}
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
