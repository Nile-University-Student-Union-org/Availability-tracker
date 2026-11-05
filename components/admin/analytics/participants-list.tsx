import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "./user-avatar";
import { formatDayShort } from "./format";
import type { UserEntry } from "./types";

export function ParticipantsList({
  filteredUsers,
  setViewingUser,
}: {
  filteredUsers: UserEntry[];
  setViewingUser: (user: UserEntry) => void;
}) {
  return (
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
  );
}
