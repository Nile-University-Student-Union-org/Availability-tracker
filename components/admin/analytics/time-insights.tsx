import { UserAvatar } from "./user-avatar";
import { formatDayFull } from "./format";
import type { SlotEntry, UserEntry } from "./types";

export function TimeInsights({
  topSlots,
  dates,
  filteredSlotMatrix,
  filteredUsers,
  slotLabel,
}: {
  topSlots: SlotEntry[];
  dates: string[];
  filteredSlotMatrix: SlotEntry[];
  filteredUsers: UserEntry[];
  slotLabel: (start: string) => string;
}) {
  return (
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
                    {slotLabel(slot.startTime)}
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
            const totalDaySlots = daySlots.reduce((sum, s) => sum + s.count, 0);
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
                    {uniqueUsers.size !== 1 ? "s" : ""} · {totalDaySlots} slots
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
  );
}
