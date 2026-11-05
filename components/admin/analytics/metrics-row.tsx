import { MetricCard } from "./metric-card";
import type { UserEntry } from "./types";

export function MetricsRow({
  filteredUsers,
  selectedCommittees,
  filteredTotalSlots,
  topCommittee,
  avgSlots,
}: {
  filteredUsers: UserEntry[];
  selectedCommittees: string[];
  filteredTotalSlots: number;
  topCommittee: { name: string; slots: number } | null;
  avgSlots: number | string;
}) {
  return (
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
        decimals={1}
        sub="slots per member"
      />
    </div>
  );
}
