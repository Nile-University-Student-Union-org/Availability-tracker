"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { cn } from "@/lib/utils"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Download, ExternalLink, FileSpreadsheet } from "lucide-react"
import { toast } from "sonner"
import {
  slotToDateRange,
  downloadIcsFile,
  buildGoogleCalendarUrl,
  escapeCsvCell,
  downloadCsvFile,
  type CalendarEvent,
} from "@/lib/calendar-export"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ScrollArea } from "@/components/ui/scroll-area"
import { COMMITTEES } from "@/lib/constants"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts"

// ─── Types ────────────────────────────────────────────────────────────────────

export type SlotEntry = {
  date: string
  startTime: string
  count: number
  users: {
    name: string | null
    email: string
    image: string | null
    committee: string | null
  }[]
}

export type UserEntry = {
  id: string
  name: string | null
  email: string
  nuId: string | null
  image: string | null
  committee: string | null
  totalSlots: number
  byDate: Record<string, string[]>
}

export type AnalyticsData = {
  totalUsers: number
  totalSlots: number
  maxCount: number
  slotMatrix: SlotEntry[]
  users: UserEntry[]
  dates: string[]
  timeSlots: string[]
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number)
  const suffix = h >= 12 ? "PM" : "AM"
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`
}

function formatDayShort(date: string): string {
  const d = new Date(date + "T00:00:00")
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })
}

function formatDayFull(date: string): string {
  const d = new Date(date + "T00:00:00")
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  })
}

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return email?.slice(0, 2).toUpperCase() ?? "?"
}

/** Returns Tailwind classes for a heatmap cell based on its fill ratio. */
function cellStyle(count: number, max: number): string {
  if (count === 0) return "bg-muted/50 text-muted-foreground/30"
  const ratio = count / Math.max(max, 1)
  if (ratio <= 0.25)
    return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400"
  if (ratio <= 0.5)
    return "bg-emerald-500/40 text-emerald-800 dark:text-emerald-300"
  if (ratio <= 0.75) return "bg-emerald-500/65 text-emerald-900 dark:text-white"
  return "bg-emerald-600 text-white"
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MetricCard({
  label,
  value,
  sub,
  accent = false,
}: {
  label: string
  value: string | number
  sub: string
  accent?: boolean
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border px-4 py-4",
        accent ? "border-primary/25 bg-primary/8" : "bg-card"
      )}
    >
      <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-heading text-3xl font-semibold",
          accent && "text-primary"
        )}
      >
        {value}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
    </div>
  )
}

function UserAvatar({
  name,
  email,
  image,
  size = "sm",
}: {
  name: string | null
  email: string
  image: string | null
  size?: "sm" | "xs"
}) {
  return (
    <Avatar className={size === "xs" ? "size-5" : "size-8"}>
      <AvatarImage src={image ?? undefined} referrerPolicy="no-referrer" />
      <AvatarFallback className={size === "xs" ? "text-[9px]" : "text-xs"}>
        {getInitials(name, email)}
      </AvatarFallback>
    </Avatar>
  )
}

// ─── Main dashboard ───────────────────────────────────────────────────────────
export function AnalyticsDashboard({ data }: { data: AnalyticsData }) {
  const {
    totalUsers,
    totalSlots,
    maxCount,
    slotMatrix,
    users,
    dates,
    timeSlots,
  } = data
  const [activeCell, setActiveCell] = useState<{
    date: string
    startTime: string
  } | null>(null)
  const [viewingUser, setViewingUser] = useState<UserEntry | null>(null)

  const [selectedCommittee, setSelectedCommittee] = useState<string>("all")

  const filteredUsers =
    selectedCommittee === "all"
      ? users
      : users.filter((u) => u.committee === selectedCommittee)

  const filteredUserIds = new Set(filteredUsers.map((u) => u.id))

  // Recalculate everything based on filtered users
  const filteredSlotMatrix = slotMatrix.map((slot) => {
    const matchingUsers = slot.users.filter((u) => {
      // Find the user object in the main users list to get their ID for filtering
      const mainUser = users.find((mu) => mu.email === u.email)
      return mainUser && filteredUserIds.has(mainUser.id)
    })
    return {
      ...slot,
      count: matchingUsers.length,
      users: matchingUsers,
    }
  })

  const filteredTotalSlots = filteredUsers.reduce(
    (sum, u) => sum + u.totalSlots,
    0
  )
  const filteredMaxCount = filteredSlotMatrix.reduce(
    (m, s) => Math.max(m, s.count),
    0
  )

  const avgSlots =
    filteredUsers.length > 0
      ? (filteredTotalSlots / filteredUsers.length).toFixed(1)
      : "—"

  const peakEntry = filteredSlotMatrix.reduce<SlotEntry | null>(
    (best, entry) => (entry.count > (best?.count ?? 0) ? entry : best),
    null
  )

  const activeCellData = activeCell
    ? (filteredSlotMatrix.find(
        (s) =>
          s.date === activeCell.date && s.startTime === activeCell.startTime
      ) ?? null)
    : null

  // Top-5 busiest slots
  const topSlots = [...filteredSlotMatrix]
    .filter((s) => s.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  // Committee breakdown for insights
  const committeeStats = COMMITTEES.map((c) => {
    const cUsers = users.filter((u) => u.committee === c)
    const cSlots = cUsers.reduce((sum, u) => sum + u.totalSlots, 0)
    return { name: c, users: cUsers.length, slots: cSlots }
  }).sort((a, b) => b.slots - a.slots)

  const topCommittee = committeeStats[0]?.slots > 0 ? committeeStats[0] : null

  function handleExportSlotIcs(slot: SlotEntry) {
    const { startDate, endDate } = slotToDateRange(slot.date, slot.startTime)
    const attendeeList = slot.users
      .map((u) => `${u.name || u.email} (${u.committee || "Member"})`)
      .join("\n")
    const event: CalendarEvent = {
      id: `nusu-meeting-${slot.date}-${slot.startTime}`,
      title: `NUSU Meeting (${formatTime(slot.startTime)})`,
      description: `Nile University Student Union Meeting\n\nAttending Members (${slot.count}):\n${attendeeList}`,
      location: "Nile University Campus",
      startDate,
      endDate,
    }
    downloadIcsFile(
      `nusu-meeting-${slot.date}-${slot.startTime.replace(":", "")}.ics`,
      [event]
    )
    toast.success("Meeting calendar file (.ics) downloaded")
  }

  function handleOpenSlotGoogleCalendar(slot: SlotEntry) {
    const { startDate, endDate } = slotToDateRange(slot.date, slot.startTime)
    const attendeeList = slot.users
      .map((u) => `${u.name || u.email} (${u.committee || "Member"})`)
      .join(", ")
    const url = buildGoogleCalendarUrl({
      title: `NUSU Meeting (${formatTime(slot.startTime)})`,
      description: `Nile University Student Union Meeting\n\nAvailable Members (${slot.count}):\n${attendeeList}`,
      location: "Nile University Campus",
      startDate,
      endDate,
    })
    window.open(url, "_blank", "noopener,noreferrer")
  }

  function handleExportScheduleCsv() {
    const validSlots = filteredSlotMatrix
      .filter((s) => s.count > 0)
      .sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date)
        return a.startTime.localeCompare(b.startTime)
      })

    if (validSlots.length === 0) {
      toast.error("No schedule data available to export.")
      return
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
    ]

    const rows: string[] = [csvHeaders.join(",")]

    for (const slot of validSlots) {
      const { endDate } = slotToDateRange(slot.date, slot.startTime)
      const endH = String(endDate.getHours()).padStart(2, "0")
      const endM = String(endDate.getMinutes()).padStart(2, "0")
      const endTimeStr = formatTime(`${endH}:${endM}`)
      const attendeeNames = slot.users.map((u) => u.name || u.email).join("; ")
      const attendeeEmails = slot.users.map((u) => u.email).join("; ")

      rows.push(
        [
          escapeCsvCell(slot.date),
          escapeCsvCell(formatTime(slot.startTime)),
          escapeCsvCell(endTimeStr),
          escapeCsvCell("60 mins"),
          escapeCsvCell(
            selectedCommittee === "all" ? "All Committees" : selectedCommittee
          ),
          escapeCsvCell(slot.count),
          escapeCsvCell(attendeeNames),
          escapeCsvCell(attendeeEmails),
        ].join(",")
      )
    }

    const label =
      selectedCommittee === "all"
        ? "all-committees"
        : selectedCommittee.toLowerCase().replace(/\s+/g, "-")
    downloadCsvFile(`nusu-schedule-${label}.csv`, rows.join("\r\n"))
    toast.success("Schedule CSV downloaded")
  }

  function handleExportMatrixCsv() {
    if (filteredUsers.length === 0) {
      toast.error("No member data available to export.")
      return
    }

    const slotHeaders: string[] = []
    for (const d of dates) {
      for (const t of timeSlots) {
        slotHeaders.push(`${d} ${t}`)
      }
    }

    const csvHeaders = [
      "Member Name",
      "NU ID",
      "Email",
      "Committee",
      "Total Available Slots",
      ...slotHeaders,
    ]

    const rows: string[] = [csvHeaders.map(escapeCsvCell).join(",")]

    for (const u of filteredUsers) {
      const row = [
        escapeCsvCell(u.name || ""),
        escapeCsvCell(u.nuId || ""),
        escapeCsvCell(u.email),
        escapeCsvCell(u.committee || ""),
        escapeCsvCell(u.totalSlots),
      ]

      for (const d of dates) {
        const userSlotsOnDate = new Set(u.byDate[d] || [])
        for (const t of timeSlots) {
          row.push(escapeCsvCell(userSlotsOnDate.has(t) ? "YES" : "NO"))
        }
      }
      rows.push(row.join(","))
    }

    const label =
      selectedCommittee === "all"
        ? "all-committees"
        : selectedCommittee.toLowerCase().replace(/\s+/g, "-")
    downloadCsvFile(`nusu-availability-matrix-${label}.csv`, rows.join("\r\n"))
    toast.success("Availability matrix CSV downloaded")
  }

  // NEW: Best slot per committee
  const bestSlotPerCommittee = COMMITTEES.map((c) => {
    const cSlots = filteredSlotMatrix.map((slot) => {
      const cUsers = slot.users.filter((u) => u.committee === c)
      return { ...slot, cCount: cUsers.length }
    })
    const best = cSlots.reduce<{
      date: string
      startTime: string
      cCount: number
    } | null>(
      (acc, s) =>
        s.cCount > (acc?.cCount ?? 0)
          ? { date: s.date, startTime: s.startTime, cCount: s.cCount }
          : acc,
      null
    )
    return { committee: c, best }
  }).filter((b) => b.best && b.best.cCount > 0)

  // NEW: Committee x Date matrix
  const committeeDateMatrix = COMMITTEES.map((c) => {
    const datesData = dates.map((d) => {
      const uniqueUsers = new Set(
        filteredSlotMatrix
          .filter((s) => s.date === d)
          .flatMap((s) =>
            s.users.filter((u) => u.committee === c).map((u) => u.email)
          )
      )
      return { date: d, count: uniqueUsers.size }
    })
    return { committee: c, dates: datesData }
  })

  return (
    <div className="space-y-5">
      {/* ── Committee Filter ─────────────────────────────────────────── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          <Label
            htmlFor="committee-filter"
            className="text-xs font-semibold tracking-widest text-muted-foreground uppercase"
          >
            Filter by Committee:
          </Label>
          <Select
            value={selectedCommittee}
            onValueChange={(val) => setSelectedCommittee(val ?? "all")}
          >
            <SelectTrigger
              id="committee-filter"
              size="sm"
              className="w-full sm:w-48"
            >
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
        <div className="flex flex-wrap items-center gap-2">
          {selectedCommittee !== "all" && (
            <Badge
              variant="outline"
              className="w-fit border-primary/20 bg-primary/5 text-primary"
            >
              Showing {filteredUsers.length} from {selectedCommittee}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-xl text-xs"
            onClick={handleExportScheduleCsv}
            title="Export finalized meetings schedule as CSV"
          >
            <FileSpreadsheet className="size-3.5 text-emerald-600 dark:text-emerald-400" />
            <span>Schedule CSV</span>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 gap-1.5 rounded-xl text-xs"
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
            selectedCommittee === "all"
              ? "total users"
              : `members in ${selectedCommittee}`
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
        <div className="h-64 w-full p-4">
          <ResponsiveContainer width="100%" height="100%">
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
                          (s) => s.date === date && s.startTime === startTime
                        )
                        const count = entry?.count ?? 0
                        const isActive =
                          activeCell?.date === date &&
                          activeCell?.startTime === startTime

                        return (
                          <td key={date} className="px-1 py-0.5">
                            <button
                              onClick={() =>
                                setActiveCell(
                                  isActive ? null : { date, startTime }
                                )
                              }
                              disabled={count === 0}
                              className={cn(
                                "h-8 w-full rounded-lg text-xs font-semibold transition-all",
                                cellStyle(count, filteredMaxCount),
                                count > 0 && "cursor-pointer hover:opacity-75",
                                count === 0 && "cursor-default",
                                isActive &&
                                  "ring-2 ring-primary ring-offset-1 ring-offset-card"
                              )}
                            >
                              {count > 0 ? count : "·"}
                            </button>
                          </td>
                        )
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
            {COMMITTEES.map((c) => {
              const cUsers = activeCellData.users.filter(
                (u) => u.committee === c
              )
              if (cUsers.length === 0) return null
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
              )
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
                (s) => s.date === date && s.count > 0
              )
              const uniqueUsers = new Set(
                daySlots.flatMap((s) => s.users.map((u) => u.email))
              )
              const totalDaySlots = daySlots.reduce(
                (sum, s) => sum + s.count,
                0
              )
              const fill =
                filteredUsers.length > 0
                  ? uniqueUsers.size / filteredUsers.length
                  : 0

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
              )
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
                            : "text-muted-foreground/30"
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
  )
}
