"use client";

import * as React from "react";
import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Clock01Icon,
  Delete02Icon,
  MinusSignIcon,
  PlusSignIcon,
} from "@hugeicons/core-free-icons";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { TimePicker } from "@/components/ui/time-picker";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { cn } from "@/lib/utils";
import {
  formatDuration,
  formatTimeSlot,
  fromMinutes,
  generateSlots,
  toMinutes,
} from "@/lib/weekly-slots";

export type DateSlot = { startTime: string; endTime: string };

const LENGTHS = [30, 45, 60, 90, 120];
const BREAKS = [0, 10, 15, 30];
const DAY_END = 1439;

const overlaps = (a: DateSlot, b: DateSlot) =>
  a.startTime < b.endTime && b.startTime < a.endTime;
const byStart = (a: DateSlot, b: DateSlot) =>
  a.startTime.localeCompare(b.startTime);

function Chip({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "min-h-[44px] rounded-xl border px-3 text-xs font-semibold tabular-nums transition-[background-color,border-color,color,transform] duration-150 cursor-pointer touch-manipulation active:scale-[0.97] disabled:pointer-events-none disabled:opacity-40 md:min-h-9",
        active
          ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
          : "border-border/70 bg-background/60 text-muted-foreground hover:bg-accent/40 hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/** Preset lengths plus a 5-minute stepper for anything else */
function LengthPicker({
  value,
  onChange,
  max,
}: {
  value: number;
  onChange: (minutes: number) => void;
  max: number;
}) {
  const isPreset = LENGTHS.includes(value);
  const [custom, setCustom] = useState(!isPreset);
  const showStepper = custom || !isPreset;
  const clamp = (m: number) => Math.min(Math.max(m, 5), Math.max(max, 5));

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1.5">
        {LENGTHS.map((m) => (
          <Chip
            key={m}
            active={!showStepper && value === m}
            disabled={m > max}
            onClick={() => {
              setCustom(false);
              onChange(m);
            }}
          >
            {formatDuration(m)}
          </Chip>
        ))}
        <Chip active={showStepper} onClick={() => setCustom(true)}>
          Custom
        </Chip>
      </div>
      {showStepper && (
        <div className="motion-enter flex items-center gap-2">
          <button
            type="button"
            aria-label="5 minutes shorter"
            onClick={() => onChange(clamp(value - 5))}
            disabled={value <= 5}
            className="flex size-11 cursor-pointer items-center justify-center rounded-xl border border-border/70 bg-background/60 text-foreground transition-transform touch-manipulation active:scale-[0.94] disabled:opacity-40 md:size-9"
          >
            <HugeiconsIcon icon={MinusSignIcon} size={16} />
          </button>
          <label className="flex h-11 items-center gap-1.5 rounded-xl border border-border/70 bg-background/60 px-3 focus-within:ring-2 focus-within:ring-ring/30 md:h-9">
            <input
              type="number"
              inputMode="numeric"
              min={5}
              max={max}
              step={5}
              value={value}
              onChange={(e) => {
                const next = Math.round(Number(e.target.value));
                if (Number.isFinite(next) && next > 0) onChange(clamp(next));
              }}
              aria-label="Slot length in minutes"
              className="w-12 bg-transparent text-center text-sm font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-xs text-muted-foreground">min</span>
          </label>
          <button
            type="button"
            aria-label="5 minutes longer"
            onClick={() => onChange(clamp(value + 5))}
            disabled={value >= max}
            className="flex size-11 cursor-pointer items-center justify-center rounded-xl border border-border/70 bg-background/60 text-foreground transition-transform touch-manipulation active:scale-[0.94] disabled:opacity-40 md:size-9"
          >
            <HugeiconsIcon icon={PlusSignIcon} size={16} />
          </button>
        </div>
      )}
    </div>
  );
}

interface DateSlotsEditorProps {
  slotMode: "fixed" | "free";
  onSlotModeChange: (mode: "fixed" | "free") => void;
  slots: DateSlot[];
  onChange: (slots: DateSlot[]) => void;
}

export function DateSlotsEditor({
  slotMode,
  onSlotModeChange,
  slots,
  onChange,
}: DateSlotsEditorProps) {
  const sorted = [...slots].sort(byStart);
  const [tool, setTool] = useState<"one" | "range">(
    slots.length ? "one" : "range",
  );

  // One slot: opens right after the last slot so it starts valid
  const lastEnd = sorted.at(-1)?.endTime;
  const [start, setStart] = useState(
    lastEnd && toMinutes(lastEnd) < DAY_END - 30 ? lastEnd : "09:00",
  );
  const [length, setLength] = useState(60);
  const endMinutes = toMinutes(start) + length;
  const draft: DateSlot = {
    startTime: start,
    endTime: fromMinutes(Math.min(endMinutes, DAY_END)),
  };
  const clash = sorted.find((s) => overlaps(s, draft));
  const draftProblem =
    endMinutes > DAY_END
      ? "That runs past midnight."
      : clash
        ? `Overlaps ${formatTimeSlot(clash.startTime)} → ${formatTimeSlot(clash.endTime)}.`
        : null;

  function addOne() {
    if (draftProblem) return;
    onChange([...sorted, draft].sort(byStart));
    // Line up the next back-to-back slot of the same length
    if (endMinutes + length <= DAY_END) setStart(draft.endTime);
  }

  // Fill a range
  const [from, setFrom] = useState("08:30");
  const [to, setTo] = useState("17:30");
  const [fillLength, setFillLength] = useState(60);
  const [gap, setGap] = useState(0);
  const generated: DateSlot[] = generateSlots(0, from, to, fillLength, gap).map(
    ({ startTime, endTime }) => ({ startTime, endTime }),
  );
  const fresh = generated.filter((g) => !sorted.some((s) => overlaps(s, g)));

  const totalMinutes = sorted.reduce(
    (sum, s) => sum + toMinutes(s.endTime) - toMinutes(s.startTime),
    0,
  );

  return (
    <div className="rounded-3xl border border-border/70 bg-card/60 p-5 shadow-xs backdrop-blur-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 text-amber-600 ring-1 ring-amber-500/20 dark:text-amber-400">
            <HugeiconsIcon icon={Clock01Icon} size={18} />
          </div>
          <div>
            <h2 className="text-sm font-bold tracking-tight">Time slots</h2>
            <p className="text-xs text-muted-foreground">
              {slotMode === "free"
                ? "Members enter their own times"
                : sorted.length
                  ? `${sorted.length} ${sorted.length === 1 ? "slot" : "slots"} · ${formatDuration(totalMinutes)} total`
                  : "No slots yet"}
            </p>
          </div>
        </div>
        <SegmentedControl
          aria-label="How members pick times"
          value={slotMode}
          onChange={onSlotModeChange}
          options={[
            { value: "fixed", label: "Set slots" },
            { value: "free", label: "Open times" },
          ]}
          className="w-full sm:w-64"
        />
      </div>

      {slotMode === "free" ? (
        <p className="rounded-2xl border border-dashed border-border/80 px-4 py-5 text-center text-xs text-muted-foreground">
          Members choose any start time on each date. Switch to{" "}
          <span className="font-semibold text-foreground">Set slots</span> to
          offer fixed options instead.
        </p>
      ) : (
        <>
          {/* Composer */}
          <div className="space-y-4 rounded-2xl border border-border/60 bg-background/50 p-4">
            <SegmentedControl
              aria-label="Add slots"
              value={tool}
              onChange={setTool}
              options={[
                { value: "one", label: "One slot" },
                { value: "range", label: "Fill a range" },
              ]}
            />

            {tool === "one" ? (
              <div key="one" className="motion-enter space-y-4">
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground/80">
                    Starts at
                  </Label>
                  <TimePicker
                    value={start}
                    onChange={setStart}
                    className="rounded-xl"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground/80">
                    Length
                  </Label>
                  <LengthPicker
                    value={length}
                    onChange={setLength}
                    max={Math.max(DAY_END - toMinutes(start), 5)}
                  />
                </div>
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-muted/50 px-3.5 py-2.5">
                  <p
                    aria-live="polite"
                    className={cn(
                      "text-sm font-semibold tabular-nums",
                      draftProblem && "text-destructive",
                    )}
                  >
                    {draftProblem ??
                      `${formatTimeSlot(draft.startTime)} → ${formatTimeSlot(draft.endTime)}`}
                  </p>
                  <Button
                    type="button"
                    onClick={addOne}
                    disabled={Boolean(draftProblem)}
                    className="min-h-[44px] cursor-pointer gap-1.5 px-4 text-sm font-semibold touch-manipulation active:scale-[0.97] md:min-h-9"
                  >
                    <HugeiconsIcon icon={PlusSignIcon} size={15} />
                    Add slot
                  </Button>
                </div>
              </div>
            ) : (
              <div key="range" className="motion-enter space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="min-w-0 space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/80">
                      From
                    </Label>
                    <TimePicker
                      value={from}
                      onChange={setFrom}
                      className="rounded-xl"
                    />
                  </div>
                  <div className="min-w-0 space-y-1.5">
                    <Label className="text-xs font-semibold text-foreground/80">
                      To
                    </Label>
                    <TimePicker
                      value={to}
                      onChange={setTo}
                      className="rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground/80">
                    Each slot
                  </Label>
                  <LengthPicker
                    value={fillLength}
                    onChange={setFillLength}
                    max={720}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-semibold text-foreground/80">
                    Break between
                  </Label>
                  <div className="flex flex-wrap gap-1.5">
                    {BREAKS.map((m) => (
                      <Chip
                        key={m}
                        active={gap === m}
                        onClick={() => setGap(m)}
                      >
                        {m === 0 ? "None" : formatDuration(m)}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-2 rounded-xl bg-muted/50 p-3 sm:flex-row sm:items-center sm:justify-between">
                  <p aria-live="polite" className="text-sm font-semibold">
                    {generated.length === 0
                      ? "No slots fit this range"
                      : `${generated.length} ${generated.length === 1 ? "slot" : "slots"} · ${formatTimeSlot(generated[0].startTime)} → ${formatTimeSlot(generated.at(-1)!.endTime)}`}
                  </p>
                  <div className="flex gap-2">
                    {sorted.length > 0 && (
                      <Button
                        type="button"
                        variant="outline"
                        disabled={generated.length === 0}
                        onClick={() => onChange(generated)}
                        className="min-h-[44px] flex-1 cursor-pointer text-xs font-semibold touch-manipulation active:scale-[0.97] md:min-h-9"
                      >
                        Replace all
                      </Button>
                    )}
                    <Button
                      type="button"
                      disabled={fresh.length === 0}
                      onClick={() =>
                        onChange([...sorted, ...fresh].sort(byStart))
                      }
                      className="min-h-[44px] flex-1 cursor-pointer gap-1.5 text-xs font-semibold touch-manipulation active:scale-[0.97] md:min-h-9"
                    >
                      <HugeiconsIcon icon={PlusSignIcon} size={14} />
                      {sorted.length && fresh.length !== generated.length
                        ? `Add ${fresh.length} new`
                        : `Add ${fresh.length}`}
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Slot list */}
          {sorted.length === 0 ? (
            <p className="rounded-2xl border border-dashed border-border/80 px-4 py-6 text-center text-xs text-muted-foreground">
              Add a slot or fill a time range. Members pick from these on every
              date of the poll.
            </p>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground">
                  Offered every day of the poll
                </span>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => onChange([])}
                  className="min-h-[44px] cursor-pointer px-2.5 text-xs font-semibold md:min-h-8"
                >
                  Clear all
                </Button>
              </div>
              <ul className="motion-stagger grid grid-cols-1 gap-2 sm:grid-cols-2">
                {sorted.map((slot, index) => (
                  <li
                    key={slot.startTime}
                    style={{ "--i": index } as React.CSSProperties}
                    className="flex min-h-[56px] items-center justify-between gap-2 rounded-2xl border border-border/70 bg-card py-2 pr-1.5 pl-3.5"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tracking-tight tabular-nums whitespace-nowrap">
                        {formatTimeSlot(slot.startTime)} →{" "}
                        {formatTimeSlot(slot.endTime)}
                      </p>
                      <p className="text-xs text-muted-foreground tabular-nums">
                        {formatDuration(
                          toMinutes(slot.endTime) - toMinutes(slot.startTime),
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        onChange(
                          sorted.filter((s) => s.startTime !== slot.startTime),
                        )
                      }
                      aria-label={`Remove ${formatTimeSlot(slot.startTime)} slot`}
                      className="flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive md:size-9"
                    >
                      <HugeiconsIcon icon={Delete02Icon} size={15} />
                    </button>
                  </li>
                ))}
              </ul>
              <p className="text-[11px] text-muted-foreground">
                Removing a slot also clears members&apos; answers for it once
                you save.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  );
}
