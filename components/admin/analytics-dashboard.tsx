"use client";

import { useRefreshSpin } from "@/components/admin/refresh-spin";
import { useState, useEffect, useMemo, useCallback } from "react";
import { toast } from "@/lib/notify";
import { COMMITTEES } from "@/lib/constants";
import { useLivePoll } from "@/hooks/use-live-poll";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  slotToDateRange,
  escapeCsvCell,
  downloadCsvFile,
} from "@/lib/calendar-export";
import { formatTime } from "./analytics/format";
import type { AnalyticsData, UserEntry } from "./analytics/types";
import { FilterAndExportBar } from "./analytics/filter-and-export-bar";
import { MetricsRow } from "./analytics/metrics-row";
import { CommitteeBreakdown } from "./analytics/committee-breakdown";
import { AvailabilityTable } from "./analytics/availability-table";
import { ActiveCellDetail } from "./analytics/active-cell-detail";
import { TimeInsights } from "./analytics/time-insights";
import { CommitteeDateMatrix } from "./analytics/committee-date-matrix";
import { CommitteeBestSlots } from "./analytics/committee-best-slots";
import { ParticipantsList } from "./analytics/participants-list";
import { MemberScheduleDialog } from "./analytics/member-schedule-dialog";

export type { SlotEntry, UserEntry, AnalyticsData } from "./analytics/types";

// ─── Main dashboard ───────────────────────────────────────────────────────────
export function AnalyticsDashboard({
  data: initialData,
  pollId,
  pollCommittees,
}: {
  data: AnalyticsData;
  pollId: string;
  /** The poll's committees; omit for a poll open to every committee */
  pollCommittees?: string[];
}) {
  const fetchDateAnalytics = useCallback(
    async (signal: AbortSignal): Promise<AnalyticsData> => {
      const response = await fetch(
        `/api/admin/analytics?pollId=${encodeURIComponent(pollId)}`,
        { signal, cache: "no-store" },
      );
      if (!response.ok) throw new Error("Failed to load date analytics");
      return response.json();
    },
    [pollId],
  );
  const {
    data = initialData,
    lastUpdated,
    status,
    refresh,
  } = useLivePoll(fetchDateAnalytics, 10000, initialData);
  const { spinKey, spin } = useRefreshSpin();
  const { slotMatrix, users, dates, timeSlots, slotEnds } = data;
  const slotMinutes = (start: string) => {
    const end = slotEnds?.[start];
    if (!end) return 60;
    const [sh, sm] = start.split(":").map(Number);
    const [eh, em] = end.split(":").map(Number);
    return eh * 60 + em - (sh * 60 + sm);
  };
  const slotLabel = (start: string) =>
    slotEnds?.[start]
      ? `${formatTime(start)} → ${formatTime(slotEnds[start])}`
      : formatTime(start);
  const isMobile = useIsMobile();
  const [activeCell, setActiveCell] = useState<{
    date: string;
    startTime: string;
  } | null>(null);
  const [viewingUser, setViewingUser] = useState<UserEntry | null>(null);

  const [selectedCommittees, setSelectedCommittees] = useState<string[]>([]);

  // The poll's own committees, or every committee for an all-committee poll
  const [globalCommittees, setGlobalCommittees] =
    useState<string[]>(COMMITTEES);
  useEffect(() => {
    if (pollCommittees) return;
    fetch("/api/committees")
      .then((res) => res.json())
      .then((d) => {
        if (Array.isArray(d?.committees) && d.committees.length > 0) {
          setGlobalCommittees(d.committees);
        }
      })
      .catch(() => {});
  }, [pollCommittees]);
  const allKnownCommittees = useMemo(() => {
    const set = new Set<string>(pollCommittees ?? globalCommittees);
    for (const u of users) {
      if (u.committee) set.add(u.committee);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [pollCommittees, globalCommittees, users]);

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

  const handleClearCommittees = () => {
    setSelectedCommittees([]);
  };

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
    filteredUsers.length > 0 ? filteredTotalSlots / filteredUsers.length : "—";

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

  const maxCommitteeSlots = useMemo(
    () => committeeStats.reduce((max, c) => Math.max(max, c.slots), 0),
    [committeeStats],
  );

  const topCommittee = committeeStats[0]?.slots > 0 ? committeeStats[0] : null;

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
      const { endDate } = slotToDateRange(
        slot.date,
        slot.startTime,
        slotMinutes(slot.startTime),
      );
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
          escapeCsvCell(`${slotMinutes(slot.startTime)} mins`),
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
      <FilterAndExportBar
        allKnownCommittees={allKnownCommittees}
        selectedCommittees={selectedCommittees}
        committeeMemberCounts={committeeMemberCounts}
        filteredUsers={filteredUsers}
        lastUpdated={lastUpdated}
        status={status}
        toggleCommittee={toggleCommittee}
        handleClearCommittees={handleClearCommittees}
        handleExportScheduleCsv={handleExportScheduleCsv}
        handleExportMatrixCsv={handleExportMatrixCsv}
      />

      <MetricsRow
        filteredUsers={filteredUsers}
        selectedCommittees={selectedCommittees}
        filteredTotalSlots={filteredTotalSlots}
        topCommittee={topCommittee}
        avgSlots={avgSlots}
      />

      <CommitteeBreakdown
        maxCommitteeSlots={maxCommitteeSlots}
        committeeStats={committeeStats}
      />

      <AvailabilityTable
        dates={dates}
        timeSlots={timeSlots}
        selectedCommittees={selectedCommittees}
        filteredSlotMatrix={filteredSlotMatrix}
        filteredMaxCount={filteredMaxCount}
        activeCell={activeCell}
        setActiveCell={setActiveCell}
        onRefresh={() => {
          spin();
          refresh();
        }}
        spinKey={spinKey}
      />

      <ActiveCellDetail
        activeCellData={activeCellData}
        slotLabel={slotLabel}
        slotMinutes={slotMinutes}
        allKnownCommittees={allKnownCommittees}
        selectedCommittees={selectedCommittees}
      />

      <TimeInsights
        topSlots={topSlots}
        dates={dates}
        filteredSlotMatrix={filteredSlotMatrix}
        filteredUsers={filteredUsers}
        slotLabel={slotLabel}
      />

      <CommitteeDateMatrix
        dates={dates}
        committeeDateMatrix={committeeDateMatrix}
      />

      <CommitteeBestSlots bestSlotPerCommittee={bestSlotPerCommittee} />

      <ParticipantsList
        filteredUsers={filteredUsers}
        setViewingUser={setViewingUser}
      />

      <MemberScheduleDialog
        viewingUser={viewingUser}
        setViewingUser={setViewingUser}
        isMobile={isMobile}
      />
    </div>
  );
}
