"use client";

import * as React from "react";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Clock, ChevronDown } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Drawer, DrawerContent, DrawerTitle } from "@/components/ui/drawer";
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

// In time order, the meeting starts people reach for most
const QUICK = ["08:30", "09:00", "10:00", "12:00", "13:00", "14:00", "16:00", "17:00"];
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const PERIODS: Period[] = ["AM", "PM"];

const ITEM = 40; // px per row; the band sits on the middle of 5 visible rows
const SETTLE_MS = 90; // commit once the scroll snaps and stops

/**
 * One scroll-snap wheel. Native momentum does the physics; the row nearest
 * the band is styled live while scrolling, and committed once it settles.
 */
function Wheel<T extends string | number>({
  items,
  value,
  onChange,
  format,
  label,
}: {
  items: T[];
  value: T;
  onChange: (value: T) => void;
  format: (item: T) => string;
  label: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const settle = useRef<ReturnType<typeof setTimeout>>(undefined);
  const index = Math.max(0, items.indexOf(value));
  const [live, setLive] = useState(index);
  // Follow value changes from outside (quick times) without an effect round-trip
  const [shownIndex, setShownIndex] = useState(index);
  if (shownIndex !== index) {
    setShownIndex(index);
    setLive(index);
  }

  // Keep the wheel on the value when it changes from outside
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && Math.round(el.scrollTop / ITEM) !== index) el.scrollTop = index * ITEM;
  }, [index]);

  useEffect(() => () => clearTimeout(settle.current), []);

  function handleScroll() {
    const el = ref.current;
    if (!el) return;
    const i = Math.min(items.length - 1, Math.max(0, Math.round(el.scrollTop / ITEM)));
    setLive(i);
    clearTimeout(settle.current);
    settle.current = setTimeout(() => {
      if (items[i] !== value) onChange(items[i]);
    }, SETTLE_MS);
  }

  const scrollToIndex = (i: number) =>
    ref.current?.scrollTo({ top: i * ITEM, behavior: "smooth" });

  return (
    <div
      ref={ref}
      // Inside the phone sheet, vertical drags spin the wheel instead of closing the sheet
      data-vaul-no-drag
      role="listbox"
      tabIndex={0}
      aria-label={label}
      aria-activedescendant={`${label}-${live}`}
      onScroll={handleScroll}
      onKeyDown={(e) => {
        if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
        e.preventDefault();
        scrollToIndex(Math.min(items.length - 1, Math.max(0, live + (e.key === "ArrowDown" ? 1 : -1))));
      }}
      className="relative z-10 h-[200px] snap-y snap-mandatory overflow-y-auto overscroll-contain rounded-xl outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-ring/40 [&::-webkit-scrollbar]:hidden"
      style={{ paddingBlock: ITEM * 2 }}
    >
      {items.map((item, i) => (
        <div
          key={String(item)}
          id={`${label}-${i}`}
          role="option"
          aria-selected={i === live}
          onClick={() => scrollToIndex(i)}
          className={cn(
            "flex h-10 cursor-pointer snap-center items-center justify-center text-lg tabular-nums transition-[color,opacity] duration-150 select-none",
            i === live
              ? "font-semibold text-foreground"
              : Math.abs(i - live) === 1
                ? "text-foreground/55"
                : "text-foreground/30",
          )}
        >
          {format(item)}
        </div>
      ))}
    </div>
  );
}

/**
 * iOS-style time picker: hour, minute and AM/PM wheels behind a glass
 * selection band, plus quick times in time order. Values commit as each
 * wheel settles, so the field always shows what the band shows.
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
  // A stored minute off the 5-minute grid stays selectable
  const minutes = MINUTES.includes(minute) ? MINUTES : [...MINUTES, minute].sort((a, b) => a - b);

  // Read the latest parts at commit time, so two wheels settling together don't clobber each other
  const latest = useRef({ hour12, minute, period });
  useLayoutEffect(() => {
    latest.current = { hour12, minute, period };
  }, [hour12, minute, period]);
  const commit = (next: Partial<typeof latest.current>) => {
    const merged = { ...latest.current, ...next };
    latest.current = merged;
    onChange(toHHmm(merged.hour12, merged.minute, merged.period));
  };

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
      <div className="space-y-1.5">
        <p className="px-1 text-[11px] font-semibold text-muted-foreground">Quick times</p>
        <div className="grid grid-cols-4 gap-1">
          {QUICK.map((t) => (
            <button
              key={t}
              type="button"
              aria-pressed={t === value}
              onClick={() => onChange(t)}
              className={cn(
                "h-9 min-w-0 cursor-pointer whitespace-nowrap rounded-full border px-1 text-[11px] font-semibold tabular-nums sm:text-xs transition-[background-color,border-color,transform] duration-150 touch-manipulation active:scale-[0.95]",
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

      {/* Wheels: fade at the edges, glass band marks the selection */}
      <div className="relative grid grid-cols-[1fr_1fr_0.9fr] gap-1 rounded-2xl bg-foreground/[0.03] px-1 [mask-image:linear-gradient(to_bottom,transparent,black_30%,black_70%,transparent)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-1 top-[80px] h-10 rounded-xl border border-border/60 bg-background/80 shadow-[0_1px_2px_rgb(15_23_42/0.06),inset_0_1px_0_rgb(255_255_255/0.6)] backdrop-blur-sm dark:bg-white/[0.08] dark:shadow-[inset_0_1px_0_rgb(255_255_255/0.08)]"
        />
        <Wheel label="Hour" items={HOURS} value={hour12} onChange={(h) => commit({ hour12: h })} format={String} />
        <Wheel
          label="Minute"
          items={minutes}
          value={minute}
          onChange={(m) => commit({ minute: m })}
          format={(m) => String(m).padStart(2, "0")}
        />
        <Wheel label="AM or PM" items={PERIODS} value={period} onChange={(p) => commit({ period: p })} format={String} />
      </div>

      <Button
        type="button"
        onClick={() => setOpen(false)}
        className="h-11 w-full cursor-pointer rounded-2xl text-sm font-semibold touch-manipulation active:scale-[0.98] md:h-10"
      >
        Done
      </Button>
    </div>
  );

  // Phones get a bottom sheet, the native home for a wheel picker
  if (isMobile) {
    return (
      <>
        <button id={id} type="button" onClick={() => setOpen(true)} className={triggerClass}>
          {triggerContent}
        </button>
        <Drawer open={open} onOpenChange={setOpen}>
          <DrawerContent className="px-4 pb-6">
            <DrawerTitle className="sr-only">Pick a time</DrawerTitle>
            <div className="mx-auto w-full max-w-sm pt-2">{body}</div>
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
        className="w-[min(18rem,calc(100vw-2rem))] rounded-3xl border-border/70 bg-popover/95 p-3 shadow-[0_24px_48px_-16px_rgb(15_23_42/0.35)] backdrop-blur-xl"
      >
        {body}
      </PopoverContent>
    </Popover>
  );
}
