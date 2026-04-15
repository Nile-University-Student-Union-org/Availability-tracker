"use client";

import { isSameDay } from "date-fns";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ACTIVE_DATES,
  TIME_SLOT_LABELS,
  WEEK_DATES,
  type WeekDate,
} from "@/components/calendar/constants";
import { AvailabilityDialog } from "@/components/calendar/availability-dialog";

type AvailabilityMap = Map<string, Set<string>>;

function toISO(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

export function AvailabilityCalendar() {
  const [availability, setAvailability] = useState<AvailabilityMap>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  useEffect(() => {
    async function fetchAvailability() {
      try {
        const res = await fetch("/api/availability");
        if (!res.ok) return;
        const data: { date: string; startTime: string }[] = await res.json();

        const map: AvailabilityMap = new Map();
        for (const d of WEEK_DATES) map.set(d, new Set());
        for (const { date, startTime } of data) map.get(date)?.add(startTime);

        setAvailability(map);
      } finally {
        setIsLoading(false);
      }
    }
    fetchAvailability();
  }, []);

  function openDialog(iso: string) {
    setDialogDate(iso);
    setDialogOpen(true);
  }

  function handleSaved(date: string, slots: string[]) {
    setAvailability((prev) => {
      const next = new Map(prev);
      next.set(date, new Set(slots));
      return next;
    });
  }

  async function handleClear(date: string) {
    await fetch("/api/availability", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, slots: [] }),
    });
    setAvailability((prev) => {
      const next = new Map(prev);
      next.set(date, new Set());
      return next;
    });
  }

  const datesWithSlots = ACTIVE_DATES.filter(
    (d) => (availability.get(toISO(d))?.size ?? 0) > 0,
  );

  // ISO strings for dates that have saved slots — drives the summary section
  const datesWithSlotsISO = WEEK_DATES.filter(
    (d) => (availability.get(d)?.size ?? 0) > 0,
  );

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {isLoading ? (
        <Skeleton className="h-[340px] w-full max-w-sm rounded-3xl" />
      ) : (
        <Calendar
          mode="single"
          month={new Date(2026, 3, 1)}
          onMonthChange={() => undefined}
          selected={undefined}
          onDayClick={(day) => {
            const iso = toISO(day);
            if (WEEK_DATES.includes(iso as WeekDate)) openDialog(iso);
          }}
          disabled={(day) => !ACTIVE_DATES.some((d) => isSameDay(d, day))}
          modifiers={{
            activeWeek: ACTIVE_DATES,
            hasSlots: datesWithSlots,
          }}
          modifiersClassNames={{
            activeWeek: "ring-1 ring-primary/50",
            hasSlots:
              "!bg-emerald-500/20 !text-emerald-700 dark:!text-emerald-400 font-semibold",
          }}
          className="w-full max-w-sm rounded-3xl border"
        />
      )}

      {/* Availability summary — shown whenever slots exist (on load or after save) */}
      {!isLoading && datesWithSlotsISO.length > 0 && (
        <div className="w-full max-w-sm overflow-hidden rounded-3xl border bg-card">
          <div className="border-b px-4 py-3">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              Your Availability
            </p>
          </div>

          <div className="divide-y">
            {datesWithSlotsISO.map((iso) => {
              const slots = Array.from(availability.get(iso) ?? []).sort();
              const label = new Date(iso + "T00:00:00").toLocaleDateString(
                "en-US",
                { weekday: "long", month: "short", day: "numeric" },
              );
              return (
                <div key={iso} className="px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">{label}</p>
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-6 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleClear(iso)}
                    >
                      Clear
                    </Button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {slots.map((slot) => (
                      <Badge
                        key={slot}
                        variant="secondary"
                        className="bg-emerald-500/15 text-xs text-emerald-700 dark:text-emerald-400"
                      >
                        {TIME_SLOT_LABELS[slot as keyof typeof TIME_SLOT_LABELS]}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state — shown after loading when nothing is marked yet */}
      {!isLoading && datesWithSlotsISO.length === 0 && (
        <div className="w-full max-w-sm rounded-3xl border border-dashed px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No availability marked yet — click a highlighted day above to get started.
          </p>
        </div>
      )}

      {dialogDate !== null && (
        <AvailabilityDialog
          date={dialogDate}
          initialSlots={Array.from(availability.get(dialogDate) ?? [])}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSaved={handleSaved}
        />
      )}
    </div>
  );
}
