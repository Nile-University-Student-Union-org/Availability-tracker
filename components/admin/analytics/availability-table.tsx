import { Button } from "@/components/ui/button";
import { RefreshSpinIcon } from "@/components/admin/refresh-spin";
import { HeatmapPulse } from "@/components/admin/heatmap-pulse";
import { cn } from "@/lib/utils";
import { formatTime, formatDayShort, cellStyle } from "./format";
import type { SlotEntry } from "./types";

export function AvailabilityTable({
  dates,
  timeSlots,
  selectedCommittees,
  filteredSlotMatrix,
  filteredMaxCount,
  activeCell,
  setActiveCell,
  onRefresh,
  spinKey,
}: {
  dates: string[];
  timeSlots: string[];
  selectedCommittees: string[];
  filteredSlotMatrix: SlotEntry[];
  filteredMaxCount: number;
  activeCell: { date: string; startTime: string } | null;
  setActiveCell: (cell: { date: string; startTime: string } | null) => void;
  onRefresh: () => void;
  spinKey: number;
}) {
  return (
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

        <div className="flex items-center gap-2.5 self-start sm:self-center shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onRefresh}
            className="min-h-[44px] px-3 text-xs font-semibold cursor-pointer touch-manipulation active:scale-[0.97]"
            title="Refresh availability table data"
          >
            <RefreshSpinIcon spinKey={spinKey} size={14} />
            Refresh Table
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
          <div className="overflow-x-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]">
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
                              "relative min-h-[56px] w-full rounded-lg text-xs font-semibold transition-[background-color,color,scale] touch-manipulation active:scale-[0.97] md:h-8 md:min-h-0",
                              cellStyle(count, filteredMaxCount),
                              count > 0 && "cursor-pointer hover:opacity-75",
                              count === 0 && "cursor-default",
                              isActive &&
                                "ring-2 ring-primary ring-offset-1 ring-offset-card",
                            )}
                          >
                            <HeatmapPulse count={count} />
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
  );
}
