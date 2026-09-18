"use client";

import { useCallback, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon, Tick01Icon } from "@hugeicons/core-free-icons";

import {
  Download,
  ExternalLink,
  FileSpreadsheet,
  Check,
  ChevronsUpDown,
  Filter,
  Search,
  X,
} from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import {
  slotToDateRange,
  downloadIcsFile,
  buildGoogleCalendarUrl,
  escapeCsvCell,
  downloadCsvFile,
  type CalendarEvent,
} from "@/lib/calendar-export";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { COMMITTEES } from "@/lib/constants";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlotEntry = {
  date: string;
  startTime: string;
  count: number;
  users: {
    name: string | null;
    email: string;
    image: string | null;
    committee: string | null;
  }[];
};

export type UserEntry = {
  id: string;
  name: string | null;
  email: string;
  nuId: string | null;
  image: string | null;
  committee: string | null;
  totalSlots: number;
  byDate: Record<string, string[]>;
};

export type AnalyticsData = {
  totalUsers: number;
  totalSlots: number;
  maxCount: number;
  slotMatrix: SlotEntry[];
  users: UserEntry[];
  dates: string[];
  timeSlots: string[];
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function formatDayShort(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

function formatDayFull(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? "?";
}

/** Returns Tailwind classes for a heatmap cell based on its fill ratio. */
function cellStyle(count: number, max: number): string {
  if (count === 0) return "bg-muted/50 text-muted-foreground/30";
  const ratio = count / Math.max(max, 1);
  if (ratio <= 0.25)
    return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400";
  if (ratio <= 0.5)
    return "bg-emerald-500/40 text-emerald-800 dark:text-emerald-300";
  if (ratio <= 0.75)
    return "bg-emerald-500/65 text-emerald-900 dark:text-white";
  return "bg-emerald-600 text-white";
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border px-4 py-4 transition-all",
        accent ? "border-primary/25 bg-primary/8" : "bg-card",
      )}
    >
      <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-heading text-3xl font-semibold",
          accent && "text-primary",
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}

function UserAvatar({
  name,
  email,
  image,
  size = "sm",
}: {
  name: string | null;
  email: string;
  image: string | null;
  size?: "sm" | "xs";
}) {
  return (
    <Avatar className={size === "xs" ? "size-5" : "size-8"}>
      <AvatarImage src={image ?? undefined} referrerPolicy="no-referrer" />
      <AvatarFallback className={size === "xs" ? "text-[9px]" : "text-xs"}>
        {getInitials(name, email)}
      </AvatarFallback>
    </Avatar>
  );
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const { slotMatrix, users, dates, timeSlots } = data;
  const [activeCell, setActiveCell] = useState<{
    date: string;
    startTime: string;
  } | null>(null);
  const [viewingUser, setViewingUser] = useState<UserEntry | null>(null);

  const [selectedCommittees, setSelectedCommittees] = useState<string[]>([]);
  const [availableCommittees, setAvailableCommittees] =
    useState<string[]>(COMMITTEES);
  const [filterPopoverOpen, setFilterPopoverOpen] = useState(false);
  const [committeeSearch, setCommitteeSearch] = useState("");

  useEffect(() => {
    fetch("/api/committees")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data?.committees) && data.committees.length > 0) {
          setAvailableCommittees(data.committees);
        }
      })
      .catch(() => {
        // Fallback to static COMMITTEES
      });
  }, []);

  // Merge static/dynamic committees with any committee present in user records
  const allKnownCommittees = useMemo(() => {
    const set = new Set<string>(availableCommittees);
    for (const u of users) {
      if (u.committee) set.add(u.committee);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [availableCommittees, users]);

  // Precompute count of users per committee
  const committeeMemberCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const u of users) {
      if (u.committee) {
        counts.set(u.committee, (counts.get(u.committee) ?? 0) + 1);
      }
    }
    return counts;
  }, [users]);

  // Filtered committees matching the search query inside the popover
  const filteredAvailableCommittees = useMemo(() => {
    if (!committeeSearch.trim()) return allKnownCommittees;
    const q = committeeSearch.toLowerCase();
    return allKnownCommittees.filter((c) => c.toLowerCase().includes(q));
  }, [allKnownCommittees, committeeSearch]);

  const toggleCommittee = (c: string) => {
    setSelectedCommittees((prev) => {
      if (prev.length === 0) {
        return [c];
      }
      if (prev.includes(c)) {
        return prev.filter((item) => item !== c);
      }
      return [...prev, c];
    });
  };

  const handleSelectAllCommittees = () => {
    setSelectedCommittees([...allKnownCommittees]);
  };

  const handleClearCommittees = () => {
    setSelectedCommittees([]);
  };

  // Matrix live-refresh state with tactile animation
  const router = useRouter();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [justRefreshed, setJustRefreshed] = useState(false);
  const [lastRefreshedAt, setLastRefreshedAt] = useState<Date>(new Date());

  const handleRefresh = useCallback(() => {
    if (isRefreshing) return;
    setIsRefreshing(true);
    setJustRefreshed(false);

    router.refresh();

    setTimeout(() => {
      setIsRefreshing(false);
      setJustRefreshed(true);
      setLastRefreshedAt(new Date());
      toast.success("Availability table refreshed", {
        description: "Latest member bookings and slot counts synchronized.",
      });
      setTimeout(() => {
        setJustRefreshed(false);
      }, 2000);
    }, 250);
  }, [isRefreshing, router]);

  const lastUpdatedTime = lastRefreshedAt.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

  const filteredUsers = useMemo(() => {
    if (selectedCommittees.length === 0) return users;
    const selectedSet = new Set(selectedCommittees);
    return users.filter((u) => u.committee && selectedSet.has(u.committee));
  }, [users, selectedCommittees]);

  const filteredUserIds = useMemo(
    () => new Set(filteredUsers.map((u) => u.id)),
    [filteredUsers],
  );

  // Recalculate everything based on filtered users
  const filteredSlotMatrix = useMemo(() => {
    return slotMatrix.map((slot) => {
      const matchingUsers = slot.users.filter((u) => {
        // Find the user object in the main users list to get their ID for filtering
        const mainUser = users.find((mu) => mu.email === u.email);
        return mainUser && filteredUserIds.has(mainUser.id);
      });
      return {
        ...slot,
        count: matchingUsers.length,
        users: matchingUsers,
      };
    });
  }, [slotMatrix, users, filteredUserIds]);

  const filteredTotalSlots = useMemo(
    () => filteredUsers.reduce((sum, u) => sum + u.totalSlots, 0),
    [filteredUsers],
  );
  const filteredMaxCount = useMemo(
    () => filteredSlotMatrix.reduce((m, s) => Math.max(m, s.count), 0),
    [filteredSlotMatrix],
  );

  const avgSlots =
    filteredUsers.length > 0
      ? (filteredTotalSlots / filteredUsers.length).toFixed(1)
      : "—";

  const activeCellData = activeCell
    ? (filteredSlotMatrix.find(
        (s) =>
          s.date === activeCell.date && s.startTime === activeCell.startTime,
      ) ?? null)
    : null;

  // Top-5 busiest slots
  const topSlots = useMemo(() => {
    return [...filteredSlotMatrix]
      .filter((s) => s.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [filteredSlotMatrix]);

  // Committee breakdown for insights
  const committeeStats = useMemo(() => {
    const targetCommittees =
      selectedCommittees.length > 0
        ? allKnownCommittees.filter((c) => selectedCommittees.includes(c))
        : allKnownCommittees;

    return targetCommittees
      .map((c) => {
        const cUsers = users.filter((u) => u.committee === c);
        const cSlots = cUsers.reduce((sum, u) => sum + u.totalSlots, 0);
        return { name: c, users: cUsers.length, slots: cSlots };
      })
      .sort((a, b) => b.slots - a.slots);
  }, [allKnownCommittees, selectedCommittees, users]);

  const topCommittee = committeeStats[0]?.slots > 0 ? committeeStats[0] : null;

  function handleExportSlotIcs(slot: SlotEntry) {
    const { startDate, endDate } = slotToDateRange(slot.date, slot.startTime);
    const attendeeList = slot.users
      .map((u) => `${u.name || u.email} (${u.committee || "Member"})`)
      .join("\n");
    const event: CalendarEvent = {
      id: `nusu-meeting-${slot.date}-${slot.startTime}`,
      title: `NUSU Meeting (${formatTime(slot.startTime)})`,
      description: `Nile University Student Union Meeting\n\nAttending Members (${slot.count}):\n${attendeeList}`,
      location: "Nile University Campus",
      startDate,
      endDate,
    };
    downloadIcsFile(
      `nusu-meeting-${slot.date}-${slot.startTime.replace(":", "")}.ics`,
      [event],
    );
    toast.success("Meeting calendar file (.ics) downloaded");
  }

  function handleOpenSlotGoogleCalendar(slot: SlotEntry) {
    const { startDate, endDate } = slotToDateRange(slot.date, slot.startTime);
    const attendeeList = slot.users
      .map((u) => `${u.name || u.email} (${u.committee || "Member"})`)
      .join(", ");
    const url = buildGoogleCalendarUrl({
      title: `NUSU Meeting (${formatTime(slot.startTime)})`,
      description: `Nile University Student Union Meeting\n\nAvailable Members (${slot.count}):\n${attendeeList}`,
      location: "Nile University Campus",
      startDate,
      endDate,
    });
    window.open(url, "_blank", "noopener,noreferrer");
  }

  function handleExportScheduleCsv() {
    const validSlots = filteredSlotMatrix
      .filter((s) => s.count > 0)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        return a.startTime.localeCompare(b.startTime);
      });

    if (validSlots.length === 0) {
      toast.error("No schedule data available to export.");
      return;
    }

    const csvHeaders = [
      "Date",
      "Start Time",
      "End Time",
      "Duration",
      "Committee",
      "Attendee Count",
      "Attendees (Names)",
      "Attendees (Emails)",
    ];

    const rows: string[] = [csvHeaders.join(",")];

    for (const slot of validSlots) {
      const { endDate } = slotToDateRange(slot.date, slot.startTime);
      const endH = String(endDate.getHours()).padStart(2, "0");
      const endM = String(endDate.getMinutes()).padStart(2, "0");
      const endTimeStr = formatTime(`${endH}:${endM}`);
      const attendeeNames = slot.users.map((u) => u.name || u.email).join("; ");
      const attendeeEmails = slot.users.map((u) => u.email).join("; ");

      rows.push(
        [
          escapeCsvCell(slot.date),
          escapeCsvCell(formatTime(slot.startTime)),
          escapeCsvCell(endTimeStr),
          escapeCsvCell("60 mins"),
          escapeCsvCell(
            selectedCommittees.length === 0
              ? "All Committees"
              : selectedCommittees.join(" + "),
          ),
          escapeCsvCell(slot.count),
          escapeCsvCell(attendeeNames),
          escapeCsvCell(attendeeEmails),
        ].join(","),
      );
    }

    const label =
      selectedCommittees.length === 0
        ? "all-committees"
        : selectedCommittees
            .map((c) => c.toLowerCase().replace(/\s+/g, "-"))
            .join("-plus-");
    downloadCsvFile(`nusu-schedule-${label}.csv`, rows.join("\r\n"));
    toast.success("Schedule CSV downloaded");
  }

  function handleExportMatrixCsv() {
    if (filteredUsers.length === 0) {
      toast.error("No member data available to export.");
      return;
    }

    const slotHeaders: string[] = [];
    for (const d of dates) {
      for (const t of timeSlots) {
        slotHeaders.push(`${d} ${t}`);
      }
    }

    const csvHeaders = [
      "Member Name",
      "NU ID",
      "Email",
      "Committee",
      "Total Available Slots",
      ...slotHeaders,
    ];

    const rows: string[] = [csvHeaders.map(escapeCsvCell).join(",")];

    for (const u of filteredUsers) {
      const row = [
        escapeCsvCell(u.name || ""),
        escapeCsvCell(u.nuId || ""),
        escapeCsvCell(u.email),
        escapeCsvCell(u.committee || ""),
        escapeCsvCell(u.totalSlots),
      ];

      for (const d of dates) {
        const userSlotsOnDate = new Set(u.byDate[d] || []);
        for (const t of timeSlots) {
          row.push(escapeCsvCell(userSlotsOnDate.has(t) ? "YES" : "NO"));
        }
      }
      rows.push(row.join(","));
    }

    const label =
      selectedCommittees.length === 0
        ? "all-committees"
        : selectedCommittees
            .map((c) => c.toLowerCase().replace(/\s+/g, "-"))
            .join("-plus-");
    downloadCsvFile(`nusu-availability-matrix-${label}.csv`, rows.join("\r\n"));
    toast.success("Availability matrix CSV downloaded");
  }

  // Best slot per committee (scoped to selected committees if filtered)
  const bestSlotPerCommittee = useMemo(() => {
    const targetCommittees =
      selectedCommittees.length > 0
        ? allKnownCommittees.filter((c) => selectedCommittees.includes(c))
        : allKnownCommittees;

    return targetCommittees
      .map((c) => {
        const cSlots = filteredSlotMatrix.map((slot) => {
          const cUsers = slot.users.filter((u) => u.committee === c);
          return { ...slot, cCount: cUsers.length };
        });
        const best = cSlots.reduce<{
          date: string;
          startTime: string;
          cCount: number;
        } | null>(
          (acc, s) =>
            s.cCount > (acc?.cCount ?? 0)
              ? { date: s.date, startTime: s.startTime, cCount: s.cCount }
              : acc,
          null,
        );
        return { committee: c, best };
      })
      .filter((b) => b.best && b.best.cCount > 0);
  }, [allKnownCommittees, selectedCommittees, filteredSlotMatrix]);

  // Committee x Date matrix (scoped to selected committees if filtered)
  const committeeDateMatrix = useMemo(() => {
    const targetCommittees =
      selectedCommittees.length > 0
        ? allKnownCommittees.filter((c) => selectedCommittees.includes(c))
        : allKnownCommittees;

    return targetCommittees.map((c) => {
      const datesData = dates.map((d) => {
        const uniqueUsers = new Set(
          filteredSlotMatrix
            .filter((s) => s.date === d)
            .flatMap((s) =>
              s.users.filter((u) => u.committee === c).map((u) => u.email),
            ),
        );
        return { date: d, count: uniqueUsers.size };
      });
      return { committee: c, dates: datesData };
    });
  }, [allKnownCommittees, selectedCommittees, dates, filteredSlotMatrix]);

  return (
    <div className="space-y-5">
      {/* ── Multi-Committee Filter Bar ───────────────────────────────── */}
      <div className="flex flex-col gap-3.5 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex flex-col gap-2.5 min-w-0 max-w-full flex-1">
          <div className="flex flex-wrap items-center gap-2.5">
            <Label
              htmlFor="committee-filter-btn"
              className="text-xs font-semibold tracking-widest text-muted-foreground uppercase shrink-0"
            >
              Filter by Committee:
            </Label>

            {/* Apple-grade Interactive Multi-Select Popover */}
            <Popover
              open={filterPopoverOpen}
              onOpenChange={setFilterPopoverOpen}
            >
              <PopoverTrigger
                id="committee-filter-btn"
                type="button"
                className={cn(
                  "group relative flex min-h-[42px] sm:min-h-[38px] w-full sm:w-auto sm:min-w-[220px] max-w-full items-center justify-between gap-2.5 rounded-xl border border-border/80 bg-card px-3 py-1.5 text-left text-xs font-semibold shadow-2xs transition-all hover:border-primary/50 hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring/30 active:scale-[0.98] cursor-pointer touch-manipulation",
                  selectedCommittees.length > 0 &&
                    "border-primary/40 bg-primary/5 text-primary ring-1 ring-primary/20",
                )}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1">
                  <Filter className="size-3.5 shrink-0 text-muted-foreground group-hover:text-primary transition-colors" />
                  <span className="truncate text-foreground font-medium">
                    {selectedCommittees.length === 0
                      ? "All Committees"
                      : selectedCommittees.length === 1
                        ? selectedCommittees[0]
                        : selectedCommittees.length === 2
                          ? `${selectedCommittees[0]}, ${selectedCommittees[1]}`
                          : `${selectedCommittees.length} Committees`}
                  </span>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {selectedCommittees.length > 0 && (
                    <span className="flex size-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground shadow-2xs">
                      {selectedCommittees.length}
                    </span>
                  )}
                  <ChevronsUpDown className="size-3.5 text-muted-foreground/60" />
                </div>
              </PopoverTrigger>

              <PopoverContent
                align="start"
                className="w-[calc(100vw-2rem)] sm:w-88 max-w-md rounded-2xl border border-border/80 bg-popover/98 p-3 shadow-2xl backdrop-blur-xl space-y-2.5 overflow-hidden"
              >
                {/* Popover Header */}
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <div className="flex items-center gap-1.5">
                    <Filter className="size-3.5 text-primary" />
                    <span className="text-xs font-bold text-foreground">
                      Select Committees
                    </span>
                  </div>
                  {selectedCommittees.length > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={handleClearCommittees}
                      className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                    >
                      Reset to All
                    </Button>
                  )}
                </div>

                {/* Quick Action Toggle Buttons */}
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant={
                      selectedCommittees.length === 0 ? "secondary" : "outline"
                    }
                    size="xs"
                    onClick={handleClearCommittees}
                    className={cn(
                      "h-7 flex-1 text-[11px] rounded-lg cursor-pointer font-medium",
                      selectedCommittees.length === 0 &&
                        "bg-primary/15 text-primary border-primary/30 font-semibold",
                    )}
                  >
                    All Committees
                  </Button>
                  <Button
                    type="button"
                    variant={
                      selectedCommittees.length === allKnownCommittees.length &&
                      allKnownCommittees.length > 0
                        ? "secondary"
                        : "outline"
                    }
                    size="xs"
                    onClick={handleSelectAllCommittees}
                    className={cn(
                      "h-7 flex-1 text-[11px] rounded-lg cursor-pointer font-medium",
                      selectedCommittees.length === allKnownCommittees.length &&
                        allKnownCommittees.length > 0 &&
                        "bg-primary/15 text-primary border-primary/30 font-semibold",
                    )}
                  >
                    Select All
                  </Button>
                </div>

                {/* Search Input */}
                {allKnownCommittees.length > 5 && (
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-3 text-muted-foreground pointer-events-none" />
                    <Input
                      placeholder="Search committees..."
                      value={committeeSearch}
                      onChange={(e) => setCommitteeSearch(e.target.value)}
                      className="h-8 pl-8 pr-7 text-xs bg-muted/40 rounded-xl"
                    />
                    {committeeSearch && (
                      <button
                        type="button"
                        onClick={() => setCommitteeSearch("")}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground cursor-pointer"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>
                )}

                {/* Committees Checkbox List */}
                <div className="max-h-60 overflow-y-auto overflow-x-hidden space-y-1 pr-0.5 scrollbar-thin">
                  {filteredAvailableCommittees.map((c) => {
                    const isSelected = selectedCommittees.includes(c);
                    const memberCount = committeeMemberCounts.get(c) ?? 0;
                    return (
                      <button
                        key={c}
                        type="button"
                        onClick={() => toggleCommittee(c)}
                        className={cn(
                          "group flex w-full min-h-[38px] items-center justify-between gap-2.5 rounded-xl px-2.5 py-2 text-xs transition-colors cursor-pointer select-none touch-manipulation active:scale-[0.99]",
                          isSelected
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted/60",
                        )}
                      >
                        <div className="flex items-center gap-2.5 min-w-0 flex-1">
                          <div
                            className={cn(
                              "flex size-4 shrink-0 items-center justify-center rounded-[5px] border transition-colors",
                              isSelected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40 bg-background group-hover:border-primary/50",
                            )}
                          >
                            {isSelected && (
                              <Check className="size-3 stroke-[2.5]" />
                            )}
                          </div>
                          <span className="truncate text-left block flex-1 font-medium">{c}</span>
                        </div>
                        <span className="text-[10px] text-muted-foreground/80 font-mono shrink-0 whitespace-nowrap pl-1">
                          {memberCount}{" "}
                          {memberCount === 1 ? "member" : "members"}
                        </span>
                      </button>
                    );
                  })}
                  {filteredAvailableCommittees.length === 0 && (
                    <p className="py-4 text-center text-xs text-muted-foreground">
                      No committees match &quot;{committeeSearch}&quot;
                    </p>
                  )}
                </div>

                {/* Popover Footer */}
                <div className="flex items-center justify-between border-t border-border/60 pt-2 text-[11px] text-muted-foreground">
                  <span>
                    {selectedCommittees.length === 0
                      ? `All members (${filteredUsers.length})`
                      : `${selectedCommittees.length} selected · ${filteredUsers.length} members`}
                  </span>
                  <Button
                    type="button"
                    size="xs"
                    onClick={() => setFilterPopoverOpen(false)}
                    className="h-6 px-2.5 text-[11px] font-semibold rounded-lg cursor-pointer"
                  >
                    Done
                  </Button>
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Interactive Selected Committee Pills / Badges */}
          {selectedCommittees.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 pt-0.5 max-w-full">
              <span className="text-[11px] font-semibold text-muted-foreground shrink-0">
                Active:
              </span>
              {selectedCommittees.map((c) => (
                <Badge
                  key={c}
                  variant="outline"
                  className="h-auto min-h-[24px] max-w-full gap-1 rounded-lg border-primary/30 bg-primary/10 text-primary text-[11px] font-medium py-0.5 pr-1 pl-2 transition-all hover:bg-primary/15"
                >
                  <span className="truncate max-w-[200px]">{c}</span>
                  <button
                    type="button"
                    onClick={() => toggleCommittee(c)}
                    className="rounded-full p-0.5 hover:bg-primary/20 text-primary/70 hover:text-primary transition-colors cursor-pointer shrink-0"
                    title={`Remove ${c} from filter`}
                  >
                    <X className="size-3" />
                  </button>
                </Badge>
              ))}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClearCommittees}
                className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground font-medium cursor-pointer shrink-0"
              >
                Clear all
              </Button>
            </div>
          )}
        </div>

        {/* Export & Summary Badges */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <Badge
            variant="outline"
            className={cn(
              "w-fit text-xs font-semibold py-1 px-2.5 rounded-xl transition-colors",
              selectedCommittees.length > 0
                ? "border-primary/30 bg-primary/5 text-primary"
                : "border-border/70 text-muted-foreground",
            )}
          >
            {selectedCommittees.length === 0
              ? `All Committees (${filteredUsers.length} members)`
              : `Showing ${filteredUsers.length} member${filteredUsers.length === 1 ? "" : "s"} across ${selectedCommittees.length} committee${selectedCommittees.length === 1 ? "" : "s"}`}
          </Badge>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-xl text-xs cursor-pointer active:scale-95"
            onClick={handleExportScheduleCsv}
            title="Export finalized meetings schedule as CSV"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Schedule CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-xl text-xs cursor-pointer active:scale-95"
            onClick={handleExportMatrixCsv}
            title="Export full member availability matrix as CSV"
          >
            <Download className="size-3.5" />
            <span>Matrix CSV</span>
          </Button>
        </div>
      </div>

      {/* ── Metric cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Participants"
          value={filteredUsers.length}
          sub={
            selectedCommittees.length === 0
              ? "total users"
              : selectedCommittees.length === 1
                ? `members in ${selectedCommittees[0]}`
                : `members in ${selectedCommittees.length} committees`
          }
          accent
        />
        <MetricCard
          label="Selections"
          value={filteredTotalSlots}
          sub="total slots marked"
        />
        <MetricCard
          label="Peak Committee"
          value={topCommittee?.name ?? "—"}
          sub={
            topCommittee ? `${topCommittee.slots} slots marked` : "No data yet"
          }
        />
        <MetricCard
          label="Avg / User"
          value={avgSlots}
          sub="slots per member"
        />
      </div>

      {/* ── NEW: Committee Breakdown Chart ────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-heading text-base font-semibold">
            Committee Breakdown
          </h2>
          <p className="text-xs text-muted-foreground">
            Distribution of members and total availability slots per committee
          </p>
        </div>
        <div className="h-64 w-full min-w-0 p-4">
          <ResponsiveContainer
            width="100%"
            height="100%"
            minWidth={0}
            minHeight={200}
          >
            <BarChart
              data={committeeStats}
              layout="vertical"
              margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
            >
              <XAxis type="number" hide />
              <YAxis
                dataKey="name"
                type="category"
                width={80}
                tick={{ fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={{ fill: "transparent" }}
                contentStyle={{
                  borderRadius: "16px",
                  border: "none",
                  boxShadow: "0 10px 15px -3px rgb(0 0 0 / 0.1)",
                  fontSize: "12px",
                }}
              />
              <Bar dataKey="slots" radius={[0, 4, 4, 0]} barSize={20}>
                {committeeStats.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      index % 2 === 0
                        ? "var(--color-primary)"
                        : "var(--color-primary-foreground)"
                    }
                    className="fill-primary"
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Availability table ─────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b px-5 py-4">
          <div className="min-w-0 flex-1">
            <h2 className="font-heading text-base font-semibold">
              Availability Table
            </h2>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {dates.length === 0
                ? "Configure a schedule to see availability data."
                : timeSlots.length === 0
                  ? "No bookings yet — users will appear here once they submit availability."
                  : selectedCommittees.length === 0
                    ? "How many users are free per slot. Click any cell for details."
                    : `Group availability for ${
                        selectedCommittees.length === 1
                          ? selectedCommittees[0]
                          : `${selectedCommittees.length} selected committees`
                      } members.`}
            </p>
          </div>

          {/* Minimalist animated refresh action */}
          <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
            <span className="hidden md:inline-block text-[11px] font-medium text-muted-foreground/70">
              Synced {lastUpdatedTime}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              disabled={isRefreshing}
              className={cn(
                "group relative h-9 overflow-hidden rounded-xl border border-border/80 bg-background/80 px-3 text-xs font-semibold shadow-2xs transition-all duration-300 hover:border-primary/50 hover:bg-accent/40 active:scale-95 cursor-pointer touch-manipulation",
                isRefreshing &&
                  "border-primary/60 bg-primary/5 text-primary shadow-xs",
                justRefreshed &&
                  "border-emerald-500/50 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
              )}
              title="Refresh availability table data"
            >
              {justRefreshed ? (
                <HugeiconsIcon
                  icon={Tick01Icon}
                  className="size-3.5 text-emerald-500 animate-in zoom-in-50 duration-200"
                  strokeWidth={2}
                />
              ) : (
                <HugeiconsIcon
                  icon={RefreshIcon}
                  className={cn(
                    "size-3.5 transition-transform duration-500 ease-out",
                    isRefreshing
                      ? "animate-spin text-primary"
                      : "group-hover:rotate-180 text-muted-foreground group-hover:text-foreground",
                  )}
                  strokeWidth={2}
                />
              )}
              <span>
                {isRefreshing
                  ? "Refreshing..."
                  : justRefreshed
                    ? "Updated!"
                    : "Refresh Table"}
              </span>

              {/* Minimalist animated glint beam while refreshing */}
              {isRefreshing && (
                <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-primary/20 to-transparent animate-shimmer" />
              )}
            </Button>
          </div>
        </div>

        {dates.length === 0 || timeSlots.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            {dates.length === 0
              ? "Set up a schedule below to start collecting availability."
              : "Waiting for the first booking — the table will appear here."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto p-4">
              <table
                className={cn(
                  "w-full min-w-90 text-xs transition-opacity duration-200",
                  isRefreshing && "opacity-60",
                )}
              >
                <thead>
                  <tr>
                    <th className="w-20 pr-3 pb-2 text-left text-[11px] font-medium text-muted-foreground" />
                    {dates.map((date) => (
                      <th
                        key={date}
                        className="pb-2 text-center text-[11px] font-semibold"
                      >
                        {formatDayShort(date)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {timeSlots.map((startTime) => (
                    <tr key={startTime}>
                      <td className="py-0.5 pr-3 text-right text-[11px] whitespace-nowrap text-muted-foreground">
                        {formatTime(startTime)}
                      </td>
                      {dates.map((date) => {
                        const entry = filteredSlotMatrix.find(
                          (s) => s.date === date && s.startTime === startTime,
                        );
                        const count = entry?.count ?? 0;
                        const isActive =
                          activeCell?.date === date &&
                          activeCell?.startTime === startTime;

                        return (
                          <td key={date} className="px-1 py-0.5">
                            <button
                              onClick={() =>
                                setActiveCell(
                                  isActive ? null : { date, startTime },
                                )
                              }
                              disabled={count === 0}
                              className={cn(
                                "h-8 w-full rounded-lg text-xs font-semibold transition-all",
                                cellStyle(count, filteredMaxCount),
                                count > 0 && "cursor-pointer hover:opacity-75",
                                count === 0 && "cursor-default",
                                isActive &&
                                  "ring-2 ring-primary ring-offset-1 ring-offset-card",
                              )}
                            >
                              {count > 0 ? count : "·"}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 border-t px-5 py-3 text-[11px] text-muted-foreground">
              <span>Fewer</span>
              <div className="flex gap-1">
                <div className="h-3 w-5 rounded-sm bg-emerald-500/20" />
                <div className="h-3 w-5 rounded-sm bg-emerald-500/40" />
                <div className="h-3 w-5 rounded-sm bg-emerald-500/65" />
                <div className="h-3 w-5 rounded-sm bg-emerald-600" />
              </div>
              <span>More users free</span>
            </div>
          </>
        )}
      </div>

      {/* ── Active cell detail panel ─────────────────────────────────────── */}
      {activeCellData && activeCellData.count > 0 && (
        <div className="rounded-3xl border bg-card p-5">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
            <p className="text-sm font-medium">
              {formatDayFull(activeCellData.date)}
              {" · "}
              {formatTime(activeCellData.startTime)}
              <span className="ml-2 text-muted-foreground">
                — {activeCellData.count}{" "}
                {activeCellData.count === 1 ? "user" : "users"} available
              </span>
            </p>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="xs"
                className="h-7 gap-1 px-2.5 text-[11px]"
                onClick={() => handleExportSlotIcs(activeCellData)}
                title="Export this meeting slot as an .ics file"
              >
                <Download className="size-3" />
                <span>.ics</span>
              </Button>
              <Button
                variant="outline"
                size="xs"
                className="h-7 gap-1 px-2.5 text-[11px] text-emerald-600 dark:text-emerald-400"
                onClick={() => handleOpenSlotGoogleCalendar(activeCellData)}
                title="Schedule this meeting slot in Google Calendar"
              >
                <ExternalLink className="size-3" />
                <span>Google Cal</span>
              </Button>
            </div>
          </div>
          <div className="space-y-4">
            {allKnownCommittees.map((c) => {
              if (
                selectedCommittees.length > 0 &&
                !selectedCommittees.includes(c)
              ) {
                return null;
              }
              const cUsers = activeCellData.users.filter(
                (u) => u.committee === c,
              );
              if (cUsers.length === 0) return null;
              return (
                <div key={c}>
                  <p className="mb-2 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                    {c} ({cUsers.length})
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {cUsers.map((user) => (
                      <div
                        key={user.email}
                        className="flex items-center gap-2 rounded-xl border bg-muted/30 px-2.5 py-1.5 text-xs"
                      >
                        <UserAvatar
                          name={user.name}
                          email={user.email}
                          image={user.image}
                          size="xs"
                        />
                        <div className="flex flex-col">
                          <span>{user.name ?? user.email}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Top slots + per-day summaries (side by side on md+) ─────────── */}
      <div className="grid gap-5 md:grid-cols-2">
        {/* Best meeting times */}
        <div className="overflow-hidden rounded-3xl border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="font-heading text-base font-semibold">
              Best Meeting Times
            </h2>
            <p className="text-xs text-muted-foreground">
              Slots with the highest group availability
            </p>
          </div>
          {topSlots.length === 0 ? (
            <p className="px-5 py-6 text-sm text-muted-foreground">
              No data yet.
            </p>
          ) : (
            <div className="divide-y">
              {topSlots.map((slot, i) => (
                <div
                  key={`${slot.date}-${slot.startTime}`}
                  className="flex items-center gap-3 px-5 py-3"
                >
                  <span className="w-5 shrink-0 text-center text-xs font-semibold text-muted-foreground">
                    #{i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">
                      {formatDayFull(slot.date)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(slot.startTime)}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="flex -space-x-1.5">
                      {slot.users.slice(0, 4).map((u) => (
                        <UserAvatar
                          key={u.email}
                          name={u.name}
                          email={u.email}
                          image={u.image}
                          size="xs"
                        />
                      ))}
                      {slot.users.length > 4 && (
                        <div className="flex size-5 items-center justify-center rounded-full bg-muted text-[9px] font-semibold ring-1 ring-background">
                          +{slot.users.length - 4}
                        </div>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      {slot.count}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Per-day summary */}
        <div className="overflow-hidden rounded-3xl border bg-card">
          <div className="border-b px-5 py-4">
            <h2 className="font-heading text-base font-semibold">
              Daily Participation
            </h2>
            <p className="text-xs text-muted-foreground">
              Unique users with at least one slot per day
            </p>
          </div>
          <div className="divide-y">
            {dates.map((date) => {
              const daySlots = filteredSlotMatrix.filter(
                (s) => s.date === date && s.count > 0,
              );
              const uniqueUsers = new Set(
                daySlots.flatMap((s) => s.users.map((u) => u.email)),
              );
              const totalDaySlots = daySlots.reduce(
                (sum, s) => sum + s.count,
                0,
              );
              const fill =
                filteredUsers.length > 0
                  ? uniqueUsers.size / filteredUsers.length
                  : 0;

              return (
                <div key={date} className="px-5 py-3">
                  <div className="mb-1.5 flex items-center justify-between text-sm">
                    <span className="font-medium">{formatDayFull(date)}</span>
                    <span className="text-xs text-muted-foreground">
                      {uniqueUsers.size} user
                      {uniqueUsers.size !== 1 ? "s" : ""} · {totalDaySlots}{" "}
                      slots
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-emerald-500 transition-all"
                      style={{ width: `${fill * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── NEW: Committee x Date Table ────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-heading text-base font-semibold">
            Committee × Date Coverage
          </h2>
          <p className="text-xs text-muted-foreground">
            Number of unique members available each day per committee
          </p>
        </div>
        <div className="overflow-x-auto p-4">
          <table className="w-full text-xs">
            <thead>
              <tr>
                <th className="pb-2 text-left text-[11px] font-medium text-muted-foreground">
                  Committee
                </th>
                {dates.map((d) => (
                  <th
                    key={d}
                    className="pb-2 text-center text-[11px] font-medium text-muted-foreground"
                  >
                    {formatDayShort(d)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y">
              {committeeDateMatrix.map((row) => (
                <tr key={row.committee}>
                  <td className="py-2 text-[11px] font-semibold">
                    {row.committee}
                  </td>
                  {row.dates.map((d) => (
                    <td key={d.date} className="py-2 text-center">
                      <span
                        className={cn(
                          "inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px]",
                          d.count > 0
                            ? "bg-emerald-500/15 font-bold text-emerald-700"
                            : "text-muted-foreground/30",
                        )}
                      >
                        {d.count > 0 ? d.count : "0"}
                      </span>
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── NEW: Best Slot per Committee ──────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-heading text-base font-semibold">
            Best Slots by Committee
          </h2>
          <p className="text-xs text-muted-foreground">
            Recommended time slots with peak attendance for each committee
          </p>
        </div>
        <div className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-3">
          {bestSlotPerCommittee.map((b) => (
            <div key={b.committee} className="bg-card p-4">
              <p className="mb-1 text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
                {b.committee}
              </p>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">
                    {formatDayFull(b.best!.date)}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {formatTime(b.best!.startTime)}
                  </p>
                </div>
                <Badge className="border-none bg-emerald-500/20 text-emerald-700">
                  {b.best!.cCount} members
                </Badge>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ── Participants table ──────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-heading text-base font-semibold">Participants</h2>
          <p className="text-xs text-muted-foreground">
            {filteredUsers.length === 0
              ? "No members match the selected filter."
              : `${filteredUsers.length} member${filteredUsers.length === 1 ? "" : "s"} shown.`}
          </p>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            No participants found for the current selection.
          </div>
        ) : (
          <div className="divide-y">
            {filteredUsers.map((user) => (
              <div
                key={user.id}
                onClick={() => setViewingUser(user)}
                className="flex cursor-pointer items-start gap-3 px-5 py-4 transition-colors hover:bg-muted/30"
              >
                <UserAvatar
                  name={user.name}
                  email={user.email}
                  image={user.image}
                  size="sm"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">
                      {user.name ?? "—"}
                    </p>
                    <Badge
                      variant="secondary"
                      className="shrink-0 bg-primary/10 text-xs text-primary"
                    >
                      {user.totalSlots} slot{user.totalSlots !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email} {user.nuId && `· ID: ${user.nuId}`}{" "}
                    {user.committee && `· ${user.committee}`}
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {Object.entries(user.byDate)
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([date, slots]) => (
                        <Badge
                          key={date}
                          variant="secondary"
                          className="bg-emerald-500/12 text-[10px] text-emerald-700 dark:text-emerald-400"
                        >
                          {formatDayShort(date)} · {slots.length}×
                        </Badge>
                      ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Individual member schedule dialog ──────────────────────────── */}
      <Dialog
        open={!!viewingUser}
        onOpenChange={(open) => !open && setViewingUser(null)}
      >
        <DialogContent className="max-w-md rounded-3xl">
          {viewingUser && (
            <>
              <DialogHeader>
                <div className="flex items-center gap-3">
                  <UserAvatar
                    name={viewingUser.name}
                    email={viewingUser.email}
                    image={viewingUser.image}
                    size="sm"
                  />
                  <div className="text-left">
                    <DialogTitle className="font-heading text-lg">
                      {viewingUser.name ?? "Member Schedule"}
                    </DialogTitle>
                    <DialogDescription className="text-xs">
                      {viewingUser.email}{" "}
                      {viewingUser.nuId && `· ID: ${viewingUser.nuId}`}
                    </DialogDescription>
                  </div>
                </div>
              </DialogHeader>

              <ScrollArea className="mt-4 max-h-[60vh] pr-4">
                <div className="space-y-6 pb-2">
                  {Object.entries(viewingUser.byDate)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([date, slots]) => (
                      <div key={date}>
                        <p className="mb-2 text-xs font-semibold tracking-widest text-muted-foreground uppercase">
                          {formatDayFull(date)}
                        </p>
                        <div className="flex flex-wrap gap-2">
                          {slots.sort().map((slot) => (
                            <Badge
                              key={slot}
                              variant="secondary"
                              className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                            >
                              {formatTime(slot)}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  {Object.keys(viewingUser.byDate).length === 0 && (
                    <p className="py-8 text-center text-sm text-muted-foreground">
                      No availability marked yet.
                    </p>
                  )}
                </div>
              </ScrollArea>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
