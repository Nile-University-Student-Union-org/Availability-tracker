"use client";

import { isSameDay } from "date-fns";
import { useCallback, useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { Skeleton } from "@/components/ui/skeleton";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/notify";
import { AvailabilityDialog } from "@/components/calendar/availability-dialog";
import { MemberSummary } from "@/components/member/member-summary";
import { authClient } from "@/lib/auth-client";
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
  slotEnds?: Record<string, string>;
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

interface AvailabilityCalendarProps {
  pollId?: string;
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
  pollId = "legacy-date",
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
  const [availableCommittees, setAvailableCommittees] =
    useState<string[]>(COMMITTEES);
  const [memberSaved, setMemberSaved] = useState(Boolean(activeUser?.email));

  useEffect(() => {
    fetch("/api/committees")
      .then((res) => res.json())
      .then((d) => {
        if (Array.isArray(d?.committees) && d.committees.length > 0) {
          setAvailableCommittees(d.committees);
        }
      })
      .catch(() => {});
  }, []);
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
          `/api/availability?pollId=${encodeURIComponent(pollId)}&email=${encodeURIComponent(memberEmail)}&_t=${Date.now()}`,
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
    [memberEmail, memberSaved, config, pollId],
  );

  const fetchConfig = useCallback(async () => {
    try {
      setIsConfigLoading(true);
      const configRes = await fetch(
        `/api/polls/${encodeURIComponent(pollId)}?_t=${Date.now()}`,
        {
          cache: "no-store",
          headers: {
            Pragma: "no-cache",
            "Cache-Control": "no-cache",
          },
        },
      );
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
  }, [memberEmail, memberSaved, fetchAvailability, pollId]);

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
          pollId,
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
      {activeUser ? (
        <div className="w-full max-w-sm space-y-3">
          <MemberSummary
            name={memberName}
            email={memberEmail}
            image={activeUser.image}
            committee={memberCommittee}
            nuId={memberId}
          />

          {activeUser?.email === "admin@nu.edu.eg" ? (
            <div className="rounded-2xl border border-blue-500/30 bg-blue-500/10 p-3 text-xs text-blue-800 dark:text-blue-300">
              <p className="font-semibold">Admin Account Notice</p>
              <p className="mt-0.5 text-[11px] text-blue-700 dark:text-blue-400">
                You are logged in as Union Administrator. Admin accounts manage
                schedules and view team availability in the Admin Portal, and
                cannot submit member availability.
              </p>
            </div>
          ) : null}
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
                <SelectTrigger id="member-committee" className="min-h-[44px]">
                  <SelectValue placeholder="Select your committee" />
                </SelectTrigger>
                <SelectContent>
                  {availableCommittees.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full min-h-[44px] touch-manipulation cursor-pointer"
              onClick={handleSaveMember}
            >
              Save Details
            </Button>
          </div>
        </div>
      )}

      {isConfigLoading ? (
        <div
          aria-busy="true"
          className="flex h-72 w-full max-w-sm flex-col justify-between rounded-3xl border border-border/80 bg-card p-6 shadow-xs"
        >
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-28 rounded-full" />
            <Skeleton className="h-5 w-16 rounded-full" />
          </div>
          <div className="grid grid-cols-7 gap-2">
            {Array.from({ length: 14 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-8 rounded-full mx-auto" />
            ))}
          </div>
          <Skeleton className="h-3 w-3/4 mx-auto rounded-full" />
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
          month={displayMonth}
          onMonthChange={() => undefined}
          onDayClick={(day) => {
            const iso = toISO(day);
            if (weekDates.includes(iso)) openDialog(iso);
          }}
          disabled={(day) => !activeDates.some((d) => isSameDay(d, day))}
          modifiers={{
            available: activeDates,
            hasSlots: datesWithSlots,
          }}
          className="w-full max-w-sm rounded-3xl border border-border/80 bg-card p-3.5 shadow-xs"
        />
      )}

      {/* Availability summary */}
      {isAvailabilityLoading && !config ? null : isAvailabilityLoading &&
        datesWithSlotsISO.length === 0 ? (
        <div
          aria-busy="true"
          className="w-full max-w-sm space-y-2.5 rounded-3xl border border-border/70 p-4"
        >
          <Skeleton className="h-4 w-32 rounded-full" />
          <Skeleton className="h-8 w-full rounded-xl" />
          <Skeleton className="h-8 w-3/4 rounded-xl" />
        </div>
      ) : config && datesWithSlotsISO.length > 0 ? (
        <div className="w-full max-w-sm overflow-hidden rounded-3xl border bg-card">
          <div className="border-b px-4 py-3">
            <h2 className="text-sm font-semibold text-foreground">
              Your availability
            </h2>
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
                      variant="destructive"
                      size="xs"
                      disabled={isClearing}
                      aria-busy={isClearing}
                      className="h-6 px-2 text-xs cursor-pointer disabled:opacity-50"
                      onClick={() => handleClear(iso)}
                    >
                      {isClearing ? (
                        <>
                          <Spinner className="size-3" label="Clearing" />
                          <span>Clearing...</span>
                        </>
                      ) : (
                        "Clear"
                      )}
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
            No availability marked yet. Tap a highlighted day to get started.
          </p>
        </div>
      ) : null}

      {dialogDate !== null && config && (
        <AvailabilityDialog
          pollId={pollId}
          date={dialogDate}
          initialSlots={Array.from(availability.get(dialogDate) ?? [])}
          memberName={memberName}
          memberEmail={memberEmail}
          memberId={memberId}
          memberCommittee={memberCommittee}
          slotMode={config.slotMode}
          timeSlots={config.timeSlots}
          slotEnds={config.slotEnds}
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
