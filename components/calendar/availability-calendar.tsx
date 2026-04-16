"use client";

import { isSameDay } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { AvailabilityDialog } from "@/components/calendar/availability-dialog";

type ScheduleConfig = {
  startDate: string;
  endDate: string;
  slotMode: "fixed" | "free";
  timeSlots: string[];
  dates: string[];
};

type AvailabilityMap = Map<string, Set<string>>;

function toISO(date: Date): string {
  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, "0"),
    String(date.getDate()).padStart(2, "0"),
  ].join("-");
}

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function AvailabilityCalendar() {
  const [config, setConfig] = useState<ScheduleConfig | null>(null);
  const [availability, setAvailability] = useState<AvailabilityMap>(new Map());
  const [isLoading, setIsLoading] = useState(true);
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const [configRes, availRes] = await Promise.all([
        fetch("/api/schedule-config"),
        fetch("/api/availability"),
      ]);

      if (configRes.ok) {
        const configData: ScheduleConfig = await configRes.json();
        setConfig(configData);

        const map: AvailabilityMap = new Map();
        for (const d of configData.dates) map.set(d, new Set());

        if (availRes.ok) {
          const availData: { date: string; startTime: string }[] =
            await availRes.json();
          for (const { date, startTime } of availData)
            map.get(date)?.add(startTime);
        }

        setAvailability(map);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function openDialog(iso: string) {
    setDialogDate(iso);
    setDialogOpen(true);
  }

  function handleSaved() {
    void fetchData();
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

  // Derived values from config
  const activeDates = config
    ? config.dates.map((d) => new Date(d + "T00:00:00"))
    : [];
  const weekDates = config?.dates ?? [];

  const datesWithSlots = activeDates.filter(
    (d) => (availability.get(toISO(d))?.size ?? 0) > 0,
  );

  const datesWithSlotsISO = weekDates.filter(
    (d) => (availability.get(d)?.size ?? 0) > 0,
  );

  // Determine which month to show based on config
  const calendarMonth = config
    ? new Date(config.startDate + "T00:00:00")
    : new Date();
  const displayMonth = new Date(
    calendarMonth.getFullYear(),
    calendarMonth.getMonth(),
    1,
  );

  return (
    <div className="flex w-full flex-col items-center gap-4">
      {isLoading ? (
        <Skeleton className="h-[340px] w-full max-w-sm rounded-3xl" />
      ) : !config ? (
        <div className="w-full max-w-sm rounded-3xl border border-dashed px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No schedule has been configured yet. Please contact an admin.
          </p>
        </div>
      ) : (
        <Calendar
          mode="single"
          month={displayMonth}
          onMonthChange={() => undefined}
          selected={undefined}
          onDayClick={(day) => {
            const iso = toISO(day);
            if (weekDates.includes(iso)) openDialog(iso);
          }}
          disabled={(day) => !activeDates.some((d) => isSameDay(d, day))}
          modifiers={{
            activeWeek: activeDates,
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

      {/* Availability summary */}
      {!isLoading && config && datesWithSlotsISO.length > 0 && (
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
                        {formatTime(slot)}
                      </Badge>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && config && datesWithSlotsISO.length === 0 && (
        <div className="w-full max-w-sm rounded-3xl border border-dashed px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No availability marked yet — click a highlighted day above to get
            started.
          </p>
        </div>
      )}

      {dialogDate !== null && config && (
        <AvailabilityDialog
          date={dialogDate}
          initialSlots={Array.from(availability.get(dialogDate) ?? [])}
          slotMode={config.slotMode}
          timeSlots={config.timeSlots}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSaved={() => handleSaved()}
        />
      )}
    </div>
  );
}
