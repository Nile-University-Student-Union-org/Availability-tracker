"use client";

import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { COMMITTEES } from "@/lib/constants";

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlotEntry = {
  date: string;
  startTime: string;
  count: number;
  users: { name: string | null; email: string; image: string | null; committee: string | null }[];
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
        "rounded-3xl border px-4 py-4",
        accent ? "bg-primary/8 border-primary/25" : "bg-card",
      )}
    >
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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
  const { totalUsers, totalSlots, maxCount, slotMatrix, users, dates, timeSlots } =
    data;
  const [activeCell, setActiveCell] = useState<{
    date: string;
    startTime: string;
  } | null>(null);
  const [viewingUser, setViewingUser] = useState<UserEntry | null>(null);

  const [selectedCommittee, setSelectedCommittee] = useState<string>("all");

  const filteredUsers =
    selectedCommittee === "all"
      ? users
      : users.filter((u) => u.committee === selectedCommittee);

  const filteredUserIds = new Set(filteredUsers.map((u) => u.id));

  // Recalculate everything based on filtered users
  const filteredSlotMatrix = slotMatrix.map((slot) => {
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

  const filteredTotalSlots = filteredUsers.reduce(
    (sum, u) => sum + u.totalSlots,
    0,
  );
  const filteredMaxCount = filteredSlotMatrix.reduce(
    (m, s) => Math.max(m, s.count),
    0,
  );

  const avgSlots =
    filteredUsers.length > 0
      ? (filteredTotalSlots / filteredUsers.length).toFixed(1)
      : "—";

  const peakEntry = filteredSlotMatrix.reduce<SlotEntry | null>(
    (best, entry) => (entry.count > (best?.count ?? 0) ? entry : best),
    null,
  );

  const activeCellData = activeCell
    ? (filteredSlotMatrix.find(
        (s) =>
          s.date === activeCell.date && s.startTime === activeCell.startTime,
      ) ?? null)
    : null;

  // Top-5 busiest slots
  const topSlots = [...filteredSlotMatrix]
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // Committee breakdown for insights
  const committeeStats = COMMITTEES.map((c) => {
    const cUsers = users.filter((u) => u.committee === c);
    const cSlots = cUsers.reduce((sum, u) => sum + u.totalSlots, 0);
    return { name: c, users: cUsers.length, slots: cSlots };
  }).sort((a, b) => b.slots - a.slots);

  const topCommittee = committeeStats[0]?.slots > 0 ? committeeStats[0] : null;

  return (
    <div className="space-y-5">
      {/* ── Committee Filter ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Label htmlFor="committee-filter" className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">
            Filter by Committee:
          </Label>
          <Select value={selectedCommittee} onValueChange={(val) => setSelectedCommittee(val ?? "all")}>
            <SelectTrigger id="committee-filter" className="h-8 w-40 rounded-xl text-xs">
              <SelectValue placeholder="All Committees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Committees</SelectItem>
              {COMMITTEES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {selectedCommittee !== "all" && (
          <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
            Showing {filteredUsers.length} from {selectedCommittee}
          </Badge>
        )}
      </div>

      {/* ── Metric cards ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MetricCard
          label="Participants"
          value={filteredUsers.length}
          sub={selectedCommittee === "all" ? "total users" : `members in ${selectedCommittee}`}
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
          sub={topCommittee ? `${topCommittee.slots} slots marked` : "No data yet"}
        />
        <MetricCard
          label="Avg / User"
          value={avgSlots}
          sub="slots per member"
        />
      </div>

      {/* ── Availability matrix ─────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-heading text-base font-semibold">
            Availability Matrix
          </h2>
          <p className="text-xs text-muted-foreground">
            {dates.length === 0
              ? "Configure a schedule to see availability data."
              : timeSlots.length === 0
                ? "No bookings yet — users will appear here once they submit availability."
                : selectedCommittee === "all"
                  ? "How many users are free per slot. Click any cell for details."
                  : `Group availability for ${selectedCommittee} members.`}
          </p>
        </div>

        {dates.length === 0 || timeSlots.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm text-muted-foreground">
            {dates.length === 0
              ? "Set up a schedule below to start collecting availability."
              : "Waiting for the first booking — the matrix will appear here."}
          </div>
        ) : (
          <>
            <div className="overflow-x-auto p-4">
              <table className="w-full min-w-90 text-xs">
                <thead>
                  <tr>
                    <th className="w-20 pb-2 pr-3 text-left text-[11px] font-medium text-muted-foreground" />
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
          <p className="mb-3 text-sm font-medium">
            {formatDayFull(activeCellData.date)}
            {" · "}
            {formatTime(activeCellData.startTime)}
            <span className="ml-2 text-muted-foreground">
              — {activeCellData.count}{" "}
              {activeCellData.count === 1 ? "user" : "users"} available
            </span>
          </p>
          <div className="flex flex-wrap gap-2">
            {activeCellData.users.map((user) => (
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
                  {user.committee && (
                    <span className="text-[10px] text-muted-foreground leading-tight">
                      {user.committee}
                    </span>
                  )}
                </div>
              </div>
            ))}
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
                filteredUsers.length > 0 ? uniqueUsers.size / filteredUsers.length : 0;

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

      {/* ── Participants table ──────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-3xl border bg-card">
        <div className="border-b px-5 py-4">
          <h2 className="font-heading text-base font-semibold">
            Participants
          </h2>
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
                      className="shrink-0 bg-primary/10 text-primary text-xs"
                    >
                      {user.totalSlots} slot{user.totalSlots !== 1 ? "s" : ""}
                    </Badge>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {user.email} {user.nuId && `· ID: ${user.nuId}`} {user.committee && `· ${user.committee}`}
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
      <Dialog open={!!viewingUser} onOpenChange={(open) => !open && setViewingUser(null)}>
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
                      {viewingUser.email} {viewingUser.nuId && `· ID: ${viewingUser.nuId}`}
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
                        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
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
