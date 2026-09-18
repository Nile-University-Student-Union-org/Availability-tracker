"use client";

import { isSameDay } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { AvailabilityDialog } from "@/components/calendar/availability-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/lib/auth-client";
import { Download, ExternalLink, AlertCircle } from "lucide-react";
import {
  slotToDateRange,
  downloadIcsFile,
  buildGoogleCalendarUrl,
  type CalendarEvent,
} from "@/lib/calendar-export";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { COMMITTEES } from "@/lib/constants";

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

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? "?";
}

interface AvailabilityCalendarProps {
  user?: {
    id?: string;
    name?: string | null;
    email?: string | null;
    nuId?: string | null;
    committee?: string | null;
    image?: string | null;
  } | null;
  initialConfig?: ScheduleConfig | null;
  initialAvailability?: { date: string; startTime: string }[];
}

export function AvailabilityCalendar({
  user,
  initialConfig = null,
  initialAvailability = [],
}: AvailabilityCalendarProps = {}) {
  const { data: session } = authClient.useSession();
  const activeUser = session?.user ?? user;

  const [memberName, setMemberName] = useState(activeUser?.name ?? "");
  const [memberEmail, setMemberEmail] = useState(activeUser?.email ?? "");
  const [memberId, setMemberId] = useState(
    ((activeUser as Record<string, unknown>)?.nuId as string) ?? "",
  );
  const [memberCommittee, setMemberCommittee] = useState(
    ((activeUser as Record<string, unknown>)?.committee as string) ?? "",
  );
  const [memberSaved, setMemberSaved] = useState(Boolean(activeUser?.email));
  const [config, setConfig] = useState<ScheduleConfig | null>(initialConfig);
  const [availability, setAvailability] = useState<AvailabilityMap>(() => {
    const map = new Map<string, Set<string>>();
    if (initialConfig) {
      for (const d of initialConfig.dates) map.set(d, new Set());
    }
    if (initialAvailability && initialAvailability.length > 0) {
      for (const { date, startTime } of initialAvailability) {
        if (map.has(date)) {
          map.get(date)?.add(startTime);
        } else {
          map.set(date, new Set([startTime]));
        }
      }
    }
    return map;
  });
  const [isConfigLoading, setIsConfigLoading] = useState(!initialConfig);
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false);
  const [clearingDate, setClearingDate] = useState<string | null>(null);
  const [dialogDate, setDialogDate] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const fetchAvailability = useCallback(
    async (currentConfig?: ScheduleConfig) => {
      const activeConfig = currentConfig ?? config;
      if (!memberSaved || !memberEmail || !activeConfig) {
        setIsAvailabilityLoading(false);
        return;
      }
      try {
        setIsAvailabilityLoading(true);
        const availRes = await fetch(
          `/api/availability?email=${encodeURIComponent(memberEmail)}&_t=${Date.now()}`,
          {
            cache: "no-store",
            headers: {
              Pragma: "no-cache",
              "Cache-Control": "no-cache",
            },
          },
        );
        if (availRes.ok) {
          const availData: { date: string; startTime: string }[] =
            await availRes.json();
          setAvailability((prev) => {
            const map = new Map(prev);
            // Reset only the dates that are in the config
            for (const d of activeConfig.dates) map.set(d, new Set());
            // Fill with new data
            for (const { date, startTime } of availData) {
              if (map.has(date)) {
                map.get(date)?.add(startTime);
              }
            }
            return map;
          });
        }
      } catch (err) {
        console.error("Failed to fetch availability", err);
      } finally {
        setIsAvailabilityLoading(false);
      }
    },
    [memberEmail, memberSaved, config],
  );

  const fetchConfig = useCallback(async () => {
    try {
      setIsConfigLoading(true);
      const configRes = await fetch(`/api/schedule-config?_t=${Date.now()}`, {
        cache: "no-store",
        headers: {
          Pragma: "no-cache",
          "Cache-Control": "no-cache",
        },
      });
      if (configRes.ok) {
        const configData: ScheduleConfig = await configRes.json();
        setConfig(configData);
        // Initialize map with empty sets for all dates
        setAvailability(new Map(configData.dates.map((d) => [d, new Set()])));
        if (memberEmail && memberSaved) {
          await fetchAvailability(configData);
        } else {
          setIsAvailabilityLoading(false);
        }
      } else {
        setIsAvailabilityLoading(false);
      }
    } finally {
      setIsConfigLoading(false);
    }
  }, [memberEmail, memberSaved, fetchAvailability]);

  useEffect(() => {
    if (activeUser) {
      if (activeUser.name) setMemberName(activeUser.name);
      if (activeUser.email) setMemberEmail(activeUser.email);
      const userRecord = activeUser as Record<string, unknown>;
      const resolvedId =
        (userRecord.nuId as string) || localStorage.getItem("memberId") || "";
      const resolvedCommittee =
        (userRecord.committee as string) ||
        localStorage.getItem("memberCommittee") ||
        "";
      if (resolvedId) setMemberId(resolvedId);
      if (resolvedCommittee) setMemberCommittee(resolvedCommittee);
      if (activeUser.email) setMemberSaved(true);
    } else {
      const savedName = localStorage.getItem("memberName") ?? "";
      const savedEmail = localStorage.getItem("memberEmail") ?? "";
      const savedId = localStorage.getItem("memberId") ?? "";
      const savedCommittee = localStorage.getItem("memberCommittee") ?? "";
      if (savedName && savedEmail && savedId && savedCommittee) {
        setMemberName(savedName);
        setMemberEmail(savedEmail);
        setMemberId(savedId);
        setMemberCommittee(savedCommittee);
        setMemberSaved(true);
      }
    }
  }, [activeUser]);

  useEffect(() => {
    if (!initialConfig) {
      void fetchConfig();
    }
  }, [fetchConfig, initialConfig]);

  useEffect(() => {
    // Only fetch client-side if we didn't receive initial data
    if (
      (!initialAvailability || initialAvailability.length === 0) &&
      !initialConfig
    ) {
      void fetchAvailability();
    }
  }, [fetchAvailability, initialAvailability, initialConfig]);

  function handleSaveMember() {
    const name = memberName.trim();
    const email = memberEmail.trim().toLowerCase();
    const id = memberId.trim();
    const committee = memberCommittee;

    if (!name) {
      toast.error("Please enter your name");
      return;
    }

    if (!email.endsWith("@nu.edu.eg")) {
      toast.error("Please use your NU email (@nu.edu.eg)");
      return;
    }

    if (!/^\d{9}$/.test(id)) {
      toast.error("NU ID must be exactly 9 digits");
      return;
    }

    if (!committee) {
      toast.error("Please select your committee");
      return;
    }

    localStorage.setItem("memberName", name);
    localStorage.setItem("memberEmail", email);
    localStorage.setItem("memberId", id);
    localStorage.setItem("memberCommittee", committee);
    setMemberName(name);
    setMemberEmail(email);
    setMemberId(id);
    setMemberCommittee(committee);
    setMemberSaved(true);
    toast.success("Details saved!");
  }

  function openDialog(iso: string) {
    setDialogDate(iso);
    setDialogOpen(true);
  }

  function handleSaved(savedDate?: string, savedSlots?: string[]) {
    if (savedDate && savedSlots) {
      setAvailability((prev) => {
        const next = new Map(prev);
        next.set(savedDate, new Set(savedSlots));
        return next;
      });
    }
    void fetchAvailability();
  }

  async function handleClear(date: string) {
    setClearingDate(date);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date,
          slots: [],
          memberName,
          memberEmail,
          memberId,
          memberCommittee,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to clear availability");
      }
      setAvailability((prev) => {
        const next = new Map(prev);
        next.set(date, new Set());
        return next;
      });
      toast.success("Availability cleared");
    } catch (err: unknown) {
      const msg =
        err instanceof Error ? err.message : "Failed to clear availability";
      toast.error(msg);
    } finally {
      setClearingDate(null);
    }
  }

  function handleExportIcs() {
    const events: CalendarEvent[] = [];
    for (const iso of datesWithSlotsISO) {
      const slots = Array.from(availability.get(iso) ?? []).sort();
      for (const slot of slots) {
        const { startDate, endDate } = slotToDateRange(iso, slot);
        events.push({
          id: `nusu-${memberEmail}-${iso}-${slot}`,
          title: `NUSU Availability (${formatTime(slot)})`,
          description: `Marked availability for ${memberName || memberEmail} (${memberCommittee || "Member"}).`,
          location: "Nile University Campus",
          startDate,
          endDate,
        });
      }
    }
    if (events.length === 0) {
      toast.error("No availability slots to export.");
      return;
    }
    downloadIcsFile(`nusu-availability-${memberEmail || "member"}.ics`, events);
    toast.success("Calendar file (.ics) downloaded");
  }

  function handleOpenGoogleCalendar() {
    for (const iso of datesWithSlotsISO) {
      const slots = Array.from(availability.get(iso) ?? []).sort();
      if (slots.length > 0) {
        const slot = slots[0];
        const { startDate, endDate } = slotToDateRange(iso, slot);
        const url = buildGoogleCalendarUrl({
          title: `NUSU Availability (${formatTime(slot)})`,
          description: `Marked availability for ${memberName || memberEmail} (${memberCommittee || "Member"}).`,
          location: "Nile University Campus",
          startDate,
          endDate,
        });
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
    }
    toast.error("No availability slots to export.");
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
      {/* Authenticated Member Summary Card */}
      {activeUser ? (
        <div className="w-full max-w-sm rounded-2xl border border-border/80 bg-card p-4 shadow-xs transition-colors">
          <div className="flex items-center gap-3.5">
            <Avatar className="size-11 shrink-0 rounded-full ring-2 ring-emerald-500/20 ring-offset-2 ring-offset-background">
              <AvatarImage
                src={activeUser.image ?? undefined}
                alt={memberName || "Member avatar"}
              />
              <AvatarFallback className="bg-emerald-500/10 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                {getInitials(memberName, memberEmail)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <p className="truncate font-heading text-sm font-bold tracking-tight text-foreground">
                {memberName || "Union Member"}
              </p>
              <p
                className="truncate text-xs text-muted-foreground"
                title={memberEmail}
              >
                {memberEmail}
              </p>
            </div>
          </div>

          {(memberCommittee || memberId) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-2.5">
              {memberCommittee && (
                <span className="inline-flex items-center rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700 dark:text-emerald-400">
                  {memberCommittee}
                </span>
              )}
              {memberId && (
                <span className="inline-flex items-center rounded-full border border-border/70 bg-muted/60 px-2.5 py-0.5 font-mono text-[11px] font-medium text-muted-foreground">
                  ID: {memberId}
                </span>
              )}
            </div>
          )}

          {activeUser?.email === "admin@nu.edu.eg" ? (
            <div className="mt-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-2.5 text-xs text-blue-800 dark:text-blue-300">
              <p className="font-semibold">Admin Account Notice</p>
              <p className="mt-0.5 text-[11px] text-blue-700 dark:text-blue-400">
                You are logged in as Union Administrator. Admin accounts manage
                schedules and view team availability in the Admin Portal, and
                cannot submit member availability.
              </p>
            </div>
          ) : (
            (!memberCommittee || !memberId) && (
              <div className="mt-3 rounded-xl border border-amber-500/30 bg-amber-500/10 p-2.5 text-xs text-amber-800 dark:text-amber-300">
                <div className="flex items-center gap-1.5 font-semibold">
                  <AlertCircle className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Complete Your Profile</span>
                </div>
                <p className="mt-1 text-[11px] text-amber-700 dark:text-amber-400">
                  Please enter your 9-digit NU ID and select your committee to
                  submit availability.
                </p>
                <div className="mt-2 space-y-2">
                  {!memberId && (
                    <Input
                      placeholder="9-digit NU ID (e.g. 211100000)"
                      maxLength={9}
                      value={memberId}
                      onChange={(e) => {
                        const val = e.target.value.replace(/\D/g, "");
                        setMemberId(val);
                        localStorage.setItem("memberId", val);
                      }}
                      className="h-8 text-xs bg-background/80"
                    />
                  )}
                  {!memberCommittee && (
                    <Select
                      value={memberCommittee}
                      onValueChange={(val) => {
                        if (val) {
                          setMemberCommittee(val);
                          localStorage.setItem("memberCommittee", val);
                        }
                      }}
                    >
                      <SelectTrigger className="h-8 text-xs bg-background/80">
                        <SelectValue placeholder="Select Committee" />
                      </SelectTrigger>
                      <SelectContent>
                        {COMMITTEES.map((c) => (
                          <SelectItem key={c} value={c} className="text-xs">
                            {c}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              </div>
            )
          )}
        </div>
      ) : (
        /* Fallback unauthenticated details form */
        <div className="w-full max-w-sm rounded-3xl border bg-card p-4">
          <p className="mb-3 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
            Member Details
          </p>
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="member-name">Name</Label>
              <Input
                id="member-name"
                value={memberName}
                onChange={(e) => setMemberName(e.target.value)}
                placeholder="Your full name"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-email">NU Email</Label>
              <Input
                id="member-email"
                type="email"
                value={memberEmail}
                onChange={(e) => setMemberEmail(e.target.value)}
                placeholder="username@nu.edu.eg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-id">NU ID</Label>
              <Input
                id="member-id"
                value={memberId}
                onChange={(e) => setMemberId(e.target.value)}
                placeholder="9 digits (e.g. 211100000)"
                maxLength={9}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="member-committee">Committee</Label>
              <Select
                value={memberCommittee}
                onValueChange={(val) => setMemberCommittee(val ?? "")}
              >
                <SelectTrigger id="member-committee">
                  <SelectValue placeholder="Select your committee" />
                </SelectTrigger>
                <SelectContent>
                  {COMMITTEES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button className="w-full" onClick={handleSaveMember}>
              Save Details
            </Button>
          </div>
        </div>
      )}

      {isConfigLoading ? (
        <div className="flex h-72 w-full max-w-sm flex-col items-center justify-center rounded-3xl border border-border/80 bg-card p-6 shadow-xs">
          <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-xs font-medium text-muted-foreground">
            Loading schedule calendar...
          </p>
        </div>
      ) : !memberSaved ? (
        <div className="w-full max-w-sm rounded-3xl border border-dashed px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            Save your name and email first to start tracking availability.
          </p>
        </div>
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
            hasSlots: datesWithSlots,
          }}
          modifiersClassNames={{
            hasSlots:
              "!bg-emerald-500/20 !text-emerald-700 dark:!text-emerald-400 font-semibold",
          }}
          className="w-full max-w-sm rounded-3xl border"
        />
      )}

      {/* Availability summary */}
      {isAvailabilityLoading && !config ? null : isAvailabilityLoading &&
        datesWithSlotsISO.length === 0 ? (
        <div className="w-full max-w-sm rounded-3xl border border-dashed px-4 py-6 text-center">
          <p className="text-xs text-muted-foreground">
            Syncing availability...
          </p>
        </div>
      ) : config && datesWithSlotsISO.length > 0 ? (
        <div className="w-full max-w-sm overflow-hidden rounded-3xl border bg-card">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
              Your Availability
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                className="h-7 gap-1 px-2 text-[11px]"
                onClick={handleExportIcs}
                title="Download .ics for Apple Calendar, Outlook, or Google Calendar"
              >
                <Download className="size-3" />
                <span>.ics</span>
              </Button>
              <Button
                variant="outline"
                size="xs"
                className="h-7 gap-1 px-2 text-[11px] text-emerald-600 dark:text-emerald-400"
                onClick={handleOpenGoogleCalendar}
                title="Add first slot to Google Calendar"
              >
                <ExternalLink className="size-3" />
                <span>Google Cal</span>
              </Button>
            </div>
          </div>

          <div className="divide-y">
            {datesWithSlotsISO.map((iso) => {
              const slots = Array.from(availability.get(iso) ?? []).sort();
              const label = new Date(iso + "T00:00:00").toLocaleDateString(
                "en-US",
                { weekday: "long", month: "short", day: "numeric" },
              );
              const isClearing = clearingDate === iso;
              return (
                <div key={iso} className="px-4 py-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-medium">{label}</p>
                    <Button
                      variant="ghost"
                      size="xs"
                      disabled={isClearing}
                      className="h-6 px-2 text-xs text-destructive hover:text-destructive cursor-pointer disabled:opacity-50"
                      onClick={() => handleClear(iso)}
                    >
                      {isClearing ? "Clearing..." : "Clear"}
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
      ) : config && datesWithSlotsISO.length === 0 ? (
        <div className="w-full max-w-sm rounded-3xl border border-dashed px-4 py-6 text-center">
          <p className="text-sm text-muted-foreground">
            No availability marked yet — click a highlighted day above to get
            started.
          </p>
        </div>
      ) : null}

      {dialogDate !== null && config && (
        <AvailabilityDialog
          date={dialogDate}
          initialSlots={Array.from(availability.get(dialogDate) ?? [])}
          memberName={memberName}
          memberEmail={memberEmail}
          memberId={memberId}
          memberCommittee={memberCommittee}
          slotMode={config.slotMode}
          timeSlots={config.timeSlots}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          onSaved={handleSaved}
          allDates={config.dates}
          onNavigateDate={(newDate) => setDialogDate(newDate)}
          availabilityMap={availability}
        />
      )}
    </div>
  );
}
