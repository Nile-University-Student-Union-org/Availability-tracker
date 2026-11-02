"use client";

import * as React from "react";
import { useState } from "react";
import { Clock, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  value: string; // "HH:mm" e.g. "08:30"
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  id?: string;
}

type Period = "AM" | "PM";

function parseHHmm(time: string): { hour12: number; minute: number; period: Period } {
  if (!time || !time.includes(":")) return { hour12: 9, minute: 0, period: "AM" };
  const [h, m] = time.split(":").map(Number);
  return { hour12: (h || 0) % 12 || 12, minute: m || 0, period: h >= 12 ? "PM" : "AM" };
}

function toHHmm(hour12: number, minute: number, period: Period): string {
  const h = (hour12 % 12) + (period === "PM" ? 12 : 0);
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

function formatDisplay(time: string): string {
  if (!time) return "";
  const { hour12, minute, period } = parseHHmm(time);
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`;
}

// In time order, the meeting times people reach for most
const QUICK = ["08:30", "09:00", "10:00", "12:00", "13:00", "14:00", "16:00", "17:00"];
const HOURS = [12, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function Cell({
  selected,
  onClick,
  label,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex h-10 min-w-0 cursor-pointer items-center justify-center rounded-xl text-sm font-semibold tabular-nums transition-[background-color,color,transform] duration-150 touch-manipulation active:scale-[0.94] sm:h-9",
        selected
          ? "bg-emerald-500 text-white shadow-[0_2px_8px_-2px_rgb(16_185_129/0.5),inset_0_1px_0_rgb(255_255_255/0.25)] dark:bg-emerald-500 dark:text-emerald-950"
          : "text-foreground hover:bg-foreground/[0.06]",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Time picker without native inputs: every tap updates the value immediately,
 * so the readout and the field always agree. Hour, minute and AM/PM are each
 * one tap; quick times cover the common meeting starts.
 */
export function TimePicker({
  value,
  onChange,
  placeholder = "Select time...",
  className,
  id,
}: TimePickerProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const { hour12, minute, period } = parseHHmm(value);
  const set = (h: number, m: number, p: Period) => onChange(toHHmm(h, m, p));

  const triggerClass = cn(
    "flex h-11 w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-input bg-card px-3 text-sm text-foreground shadow-xs transition-[border-color,box-shadow] outline-none touch-manipulation hover:border-primary/50 focus-visible:ring-2 focus-visible:ring-ring/30 md:h-9",
    open && "border-primary/60 ring-2 ring-primary/15",
    !value && "text-muted-foreground",
    className,
  );
  const triggerContent = (
    <>
      <span className="flex min-w-0 items-center gap-2">
        <Clock className="size-4 shrink-0 text-primary dark:text-sky-300" />
        <span className={cn("truncate font-medium tabular-nums", !value && "font-normal")}>
          {value ? formatDisplay(value) : placeholder}
        </span>
      </span>
      <ChevronDown
        className={cn(
          "size-4 shrink-0 text-muted-foreground/70 transition-transform duration-200",
          open && "rotate-180",
        )}
      />
    </>
  );
  const body = (
    <div className="space-y-3">
      {/* Live readout */}
      <div className="flex items-end justify-between px-1 pt-0.5">
        <p className="font-heading text-3xl font-bold tracking-[-0.02em] tabular-nums leading-none">
          {hour12}:{String(minute).padStart(2, "0")}
          <span className="ml-1.5 text-base font-semibold tracking-normal text-muted-foreground">
            {period}
          </span>
        </p>
        <SegmentedControl
          aria-label="AM or PM"
          value={period}
          onChange={(p) => set(hour12, minute, p)}
          options={[
            { value: "AM", label: "AM" },
            { value: "PM", label: "PM" },
          ]}
          className="w-28"
        />
      </div>

      <div className="space-y-1.5">
        <p className="px-1 text-[11px] font-semibold text-muted-foreground">Hour</p>
        <div className="grid grid-cols-6 gap-1 rounded-2xl bg-foreground/[0.03] p-1">
          {HOURS.map((h) => (
            <Cell key={h} selected={h === hour12} onClick={() => set(h, minute, period)} label={`${h} o'clock`}>
              {h}
            </Cell>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="px-1 text-[11px] font-semibold text-muted-foreground">Minute</p>
        <div className="grid grid-cols-6 gap-1 rounded-2xl bg-foreground/[0.03] p-1">
          {MINUTES.map((m) => (
            <Cell key={m} selected={m === minute} onClick={() => set(hour12, m, period)} label={`${m} minutes`}>
              :{String(m).padStart(2, "0")}
            </Cell>
          ))}
        </div>
      </div>

      <div className="space-y-1.5">
        <p className="px-1 text-[11px] font-semibold text-muted-foreground">Quick times</p>
        <div className="flex flex-wrap gap-1">
          {QUICK.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={t === value}
              onClick={() => {
                onChange(t);
                setOpen(false);
              }}
              className={cn(
                "h-9 cursor-pointer whitespace-nowrap rounded-full border px-2.5 text-xs font-semibold tabular-nums transition-[background-color,border-color,transform] duration-150 touch-manipulation active:scale-[0.95]",
                t === value
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-800 dark:text-emerald-200"
                  : "border-border/70 text-muted-foreground hover:bg-foreground/[0.05] hover:text-foreground",
              )}
            >
              {formatDisplay(t)}
            </button>
          ))}
        </div>
      </div>

      {/* Stays reachable when the sheet scrolls on short screens */}
      <div className="sticky bottom-0 bg-popover/95 pt-1 pb-0.5 backdrop-blur-md">
        <Button
          type="button"
          onClick={() => setOpen(false)}
          className="h-11 w-full cursor-pointer rounded-2xl text-sm font-semibold touch-manipulation active:scale-[0.98] md:h-10"
        >
          Done
        </Button>
      </div>
    </div>
  );

  // Phones get a bottom sheet so the whole picker and Done stay on screen
  if (isMobile) {
    return (
      <>
        <button id={id} type="button" onClick={() => setOpen(true)} className={triggerClass}>
          {triggerContent}
        </button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="max-h-[92svh] px-4 pb-4">
            <DrawerTitle className="sr-only">Pick a time</DrawerTitle>
            <div className="mx-auto w-full max-w-sm overflow-x-hidden overflow-y-auto overscroll-contain pt-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">{body}</div>
          </DrawerContent>
        </Drawer>
      </>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger id={id} type="button" className={triggerClass}>
        {triggerContent}
      </PopoverTrigger>
      <PopoverContent
        align="start"
        className="w-[min(20rem,calc(100vw-2rem))] rounded-3xl border-border/70 bg-popover/95 p-3 shadow-[0_24px_48px_-16px_rgb(15_23_42/0.35)] backdrop-blur-xl"
      >
        {body}
      </PopoverContent>
    </Popover>
  );
}
