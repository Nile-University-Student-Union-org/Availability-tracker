import { Button } from "@/components/ui/button";
import { Download, ExternalLink } from "lucide-react";
import { toast } from "@/lib/notify";
import {
  slotToDateRange,
  downloadIcsFile,
  buildGoogleCalendarUrl,
  type CalendarEvent,
} from "@/lib/calendar-export";
import { UserAvatar } from "./user-avatar";
import { formatDayFull, formatTime } from "./format";
import type { SlotEntry } from "./types";

export function ActiveCellDetail({
  activeCellData,
  slotLabel,
  slotMinutes,
  allKnownCommittees,
  selectedCommittees,
}: {
  activeCellData: SlotEntry | null;
  slotLabel: (start: string) => string;
  slotMinutes: (start: string) => number;
  allKnownCommittees: string[];
  selectedCommittees: string[];
}) {
  if (!activeCellData || activeCellData.count <= 0) return null;

  function handleExportSlotIcs(slot: SlotEntry) {
    const { startDate, endDate } = slotToDateRange(
      slot.date,
      slot.startTime,
      slotMinutes(slot.startTime),
    );
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
    const { startDate, endDate } = slotToDateRange(
      slot.date,
      slot.startTime,
      slotMinutes(slot.startTime),
    );
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

  return (
    <div className="rounded-3xl border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 border-b pb-3">
        <p className="text-sm font-medium">
          {formatDayFull(activeCellData.date)}
          {" · "}
          {slotLabel(activeCellData.startTime)}
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
            className="h-7 gap-1 px-2.5 text-[11px]"
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
          const cUsers = activeCellData.users.filter((u) => u.committee === c);
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
  );
}
