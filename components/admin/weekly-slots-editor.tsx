"use client";

import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import { cn } from "@/lib/utils";
import {
  DAY_OF_WEEK_MAP,
  formatDuration,
  formatTimeSlot,
  fromMinutes,
  generateSlots,
  sortSlots,
  toMinutes,
  type WeeklySlot,
} from "@/lib/weekly-slots";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Clock01Icon,
  Copy01Icon,
  Delete02Icon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";

const ADD_DURATIONS = [30, 45, 60, 90, 120];
const FILL_LENGTHS = [30, 60, 90, 120];
const FILL_BREAKS = [0, 10, 15];

interface ChipProps {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

function Chip({ active, disabled, onClick, children }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-[44px] md:min-h-9 rounded-xl border px-2.5 text-[11px] font-semibold transition-all cursor-pointer touch-manipulation active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40",
        active
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
          : "border-border/70 bg-background/60 text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

interface WeeklySlotsEditorProps {
  days: number[];
  slots: WeeklySlot[];
  onChange: (slots: WeeklySlot[]) => void;
}

export function WeeklySlotsEditor({
  days,
  slots,
  onChange,
}: WeeklySlotsEditorProps) {
  const [pickedDay, setPickedDay] = useState(days[0] ?? 0);
  const selectedDay = days.includes(pickedDay) ? pickedDay : (days[0] ?? 0);
  const dayLabel =
    DAY_OF_WEEK_MAP.find((d) => d.day === selectedDay)?.label ?? "";

  // New slots start where the day's last slot ends, so the form opens valid
  function nextFreeStart(day: number) {
    const last = sortSlots(slots.filter((s) => s.dayOfWeek === day)).at(-1);
    return last && toMinutes(last.endTime) <= 1380 ? last.endTime : "09:00";
  }
  const [newStart, setNewStart] = useState(() => nextFreeStart(selectedDay));
  const [newEnd, setNewEnd] = useState(() =>
    fromMinutes(toMinutes(newStart) + 60),
  );

  function pickDay(day: number) {
    const start = nextFreeStart(day);
    setPickedDay(day);
    setNewStart(start);
    setNewEnd(fromMinutes(toMinutes(start) + 60));
  }
  const [fillFrom, setFillFrom] = useState("08:30");
  const [fillTo, setFillTo] = useState("16:30");
  const [fillLength, setFillLength] = useState(60);
  const [fillBreak, setFillBreak] = useState(0);

  const daySlots = slots.filter((s) => s.dayOfWeek === selectedDay);
  const openSlotCount = slots.filter((s) => days.includes(s.dayOfWeek)).length;
  const newLength = toMinutes(newEnd) - toMinutes(newStart);
  const overlap = daySlots.find(
    (s) => newStart < s.endTime && s.startTime < newEnd,
  );
  const addReason =
    newLength <= 0
      ? "End must be after start."
      : overlap
        ? `Overlaps ${formatTimeSlot(overlap.startTime)} → ${formatTimeSlot(overlap.endTime)}.`
        : null;
  const generated = generateSlots(
    selectedDay,
    fillFrom,
    fillTo,
    fillLength,
    fillBreak,
  );

  function addSlot() {
    if (addReason) return;
    onChange(
      sortSlots([
        ...slots,
        { dayOfWeek: selectedDay, startTime: newStart, endTime: newEnd },
      ]),
    );
    // Queue the next back-to-back slot of the same length
    const nextEnd = toMinutes(newEnd) + newLength;
    if (nextEnd < 1440) {
      setNewStart(newEnd);
      setNewEnd(fromMinutes(nextEnd));
    }
  }

  function setDuration(minutes: number) {
    setNewEnd(fromMinutes(toMinutes(newStart) + minutes));
  }

  function replaceDay(next: WeeklySlot[]) {
    onChange(
      sortSlots([...slots.filter((s) => s.dayOfWeek !== selectedDay), ...next]),
    );
  }

  function copyToAllDays() {
    const others = days.filter((d) => d !== selectedDay);
    onChange(
      sortSlots([
        ...slots.filter((s) => !others.includes(s.dayOfWeek)),
        ...others.flatMap((dayOfWeek) =>
          daySlots.map((s) => ({ ...s, dayOfWeek })),
        ),
      ]),
    );
  }

  return (
    <div className="rounded-3xl border border-border/70 bg-card/60 backdrop-blur-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-8.5 items-center justify-center rounded-xl bg-emerald-500/10 text-emerald-500 ring-1 ring-emerald-500/20 shrink-0">
            <HugeiconsIcon icon={Clock01Icon} size={18} />
          </div>
          <h2 className="text-sm font-bold tracking-tight">
            Semester Time Slots
          </h2>
        </div>
        <Badge
          variant="outline"
          className="border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold py-0 h-5"
        >
          {openSlotCount} {openSlotCount === 1 ? "Slot" : "Slots"}
        </Badge>
      </div>

      {days.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border/80 p-5 text-center">
          <p className="text-xs text-muted-foreground">
            Open at least one day in the Semester Timetable card to add slots.
          </p>
        </div>
      ) : (
        <>
          {/* Day selector */}
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))`,
            }}
          >
            {days.map((day) => {
              const meta = DAY_OF_WEEK_MAP.find((d) => d.day === day);
              const count = slots.filter((s) => s.dayOfWeek === day).length;
              const isSelected = day === selectedDay;
              return (
                <button
                  key={day}
                  type="button"
                  aria-pressed={isSelected}
                  aria-label={`${meta?.label}, ${count} slots`}
                  onClick={() => pickDay(day)}
                  className={cn(
                    "flex min-h-[48px] min-w-0 flex-col items-center justify-center rounded-2xl border px-1 transition-all cursor-pointer touch-manipulation active:scale-[0.97]",
                    isSelected
                      ? "border-[#0F3056] bg-[#0F3056] text-white shadow-sm dark:border-[#2DB1FA]/50 dark:bg-[#18477D]"
                      : "border-border/70 bg-background/50 text-foreground hover:bg-accent/40",
                  )}
                >
                  <span className="text-xs font-bold">{meta?.short}</span>
                  <span
                    className={cn(
                      "text-[10px] font-semibold tabular-nums",
                      isSelected
                        ? "text-white/75"
                        : count === 0
                          ? "text-destructive"
                          : "text-muted-foreground",
                    )}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="space-y-4">
            {/* Tools */}
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 md:items-start">
              <div className="space-y-2.5 rounded-2xl border border-border/60 bg-background/50 p-3">
                <p className="text-xs font-bold">Add a slot</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="min-w-0 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      Start
                    </Label>
                    <TimePicker
                      value={newStart}
                      onChange={(value) => {
                        // Keep the chosen length when the start moves
                        const end = toMinutes(value) + Math.max(newLength, 5);
                        setNewStart(value);
                        if (end < 1440) setNewEnd(fromMinutes(end));
                      }}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      End
                    </Label>
                    <TimePicker
                      value={newEnd}
                      onChange={setNewEnd}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {ADD_DURATIONS.map((minutes) => (
                    <Chip
                      key={minutes}
                      active={newLength === minutes}
                      disabled={toMinutes(newStart) + minutes >= 1440}
                      onClick={() => setDuration(minutes)}
                    >
                      {formatDuration(minutes)}
                    </Chip>
                  ))}
                </div>
                <Button
                  type="button"
                  onClick={addSlot}
                  disabled={Boolean(addReason)}
                  className="h-9 w-full rounded-xl gap-1.5 text-xs font-semibold cursor-pointer"
                >
                  <HugeiconsIcon icon={PlusSignIcon} size={14} />
                  Add to {dayLabel}
                </Button>
                {addReason && (
                  <p className="text-[11px] font-medium text-destructive">
                    {addReason}
                  </p>
                )}
              </div>

              <div className="space-y-2.5 rounded-2xl border border-border/60 bg-background/50 p-3">
                <p className="text-xs font-bold">Fill the day</p>
                <div className="grid grid-cols-2 gap-2">
                  <div className="min-w-0 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      From
                    </Label>
                    <TimePicker
                      value={fillFrom}
                      onChange={setFillFrom}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <Label className="text-[11px] text-muted-foreground">
                      To
                    </Label>
                    <TimePicker
                      value={fillTo}
                      onChange={setFillTo}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Slot length
                  </Label>
                  <div className="flex flex-wrap items-center gap-1.5">
                    {FILL_LENGTHS.map((minutes) => (
                      <Chip
                        key={minutes}
                        active={fillLength === minutes}
                        onClick={() => setFillLength(minutes)}
                      >
                        {formatDuration(minutes)}
                      </Chip>
                    ))}
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        inputMode="numeric"
                        min={5}
                        max={720}
                        step={5}
                        value={fillLength}
                        onChange={(e) =>
                          setFillLength(Math.round(Number(e.target.value)))
                        }
                        aria-label="Custom slot length in minutes"
                        className="h-11 md:h-9 w-16 rounded-xl border border-border/70 bg-background/60 text-xs tabular-nums"
                      />
                      <span className="text-[11px] text-muted-foreground">
                        min
                      </span>
                    </div>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-[11px] text-muted-foreground">
                    Break between slots
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {FILL_BREAKS.map((minutes) => (
                      <Chip
                        key={minutes}
                        active={fillBreak === minutes}
                        onClick={() => setFillBreak(minutes)}
                      >
                        {minutes === 0 ? "None" : formatDuration(minutes)}
                      </Chip>
                    ))}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => replaceDay(generated)}
                  disabled={generated.length === 0}
                  className="h-9 w-full rounded-xl text-xs font-semibold cursor-pointer"
                >
                  {generated.length === 0
                    ? "No slots fit this range"
                    : `Replace ${dayLabel} with ${generated.length} ${generated.length === 1 ? "slot" : "slots"}`}
                </Button>
              </div>
            </div>

            {/* Slot list */}
            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                  {dayLabel} ({daySlots.length})
                </span>
                <div className="flex items-center gap-1">
                  {days.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={copyToAllDays}
                      disabled={daySlots.length === 0}
                      className="h-8 rounded-xl gap-1 px-2 text-[11px] font-semibold cursor-pointer"
                    >
                      <HugeiconsIcon icon={Copy01Icon} size={13} />
                      Copy to all days
                    </Button>
                  )}
                  <Button
                    type="button"
                    variant="ghost"
                    size="xs"
                    onClick={() => replaceDay([])}
                    disabled={daySlots.length === 0}
                    className="h-8 rounded-xl px-2 text-[11px] font-semibold text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                  >
                    Clear day
                  </Button>
                </div>
              </div>

              {daySlots.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border/80 p-6 text-center">
                  <p className="text-xs text-muted-foreground">
                    No slots on {dayLabel} yet. Add one or fill the day.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-2">
                  {daySlots.map((slot) => (
                    <div
                      key={slot.startTime}
                      className="flex min-h-[52px] items-center justify-between gap-2 rounded-xl border border-border/70 bg-card px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold tracking-tight text-foreground whitespace-nowrap">
                          {formatTimeSlot(slot.startTime)} →{" "}
                          {formatTimeSlot(slot.endTime)}
                        </p>
                        <p className="text-[11px] text-muted-foreground">
                          {formatDuration(
                            toMinutes(slot.endTime) - toMinutes(slot.startTime),
                          )}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          replaceDay(
                            daySlots.filter(
                              (s) => s.startTime !== slot.startTime,
                            ),
                          )
                        }
                        aria-label={`Remove ${formatTimeSlot(slot.startTime)} slot`}
                        className="flex size-11 md:size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive cursor-pointer"
                      >
                        <HugeiconsIcon icon={Delete02Icon} size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Removing a slot also clears members&apos; marks for it once you
                save.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
