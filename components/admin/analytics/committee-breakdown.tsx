export function CommitteeBreakdown({
  maxCommitteeSlots,
  committeeStats,
}: {
  maxCommitteeSlots: number;
  committeeStats: { name: string; users: number; slots: number }[];
}) {
  return (
    <div className="overflow-hidden rounded-3xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="font-heading text-base font-semibold">
          Committee Breakdown
        </h2>
        <p className="text-xs text-muted-foreground">
          Distribution of members and total availability slots per committee
        </p>
      </div>
      {maxCommitteeSlots === 0 ? (
        <div className="px-5 py-10 text-center">
          <p className="font-heading text-sm font-semibold text-foreground">
            No answers yet
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            The breakdown appears once members mark their availability.
          </p>
        </div>
      ) : (
        <div className="divide-y p-5">
          {committeeStats.map((entry) => {
            const ratio =
              maxCommitteeSlots > 0 ? entry.slots / maxCommitteeSlots : 0;
            return (
              // Name and numbers on one line, a full-width bar under them,
              // so the bar stays readable on narrow phones
              <div
                key={entry.name}
                className="space-y-1.5 py-3 first:pt-0 last:pb-0"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <span
                    className="min-w-0 truncate text-sm font-medium text-foreground"
                    title={entry.name}
                  >
                    {entry.name}
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    <span className="font-semibold text-foreground">
                      {entry.slots}
                    </span>{" "}
                    {entry.slots === 1 ? "slot" : "slots"} · {entry.users}{" "}
                    {entry.users === 1 ? "member" : "members"}
                  </span>
                </div>
                <div className="h-2 overflow-hidden rounded-full bg-foreground/[0.06]">
                  <div
                    className="h-full w-full origin-left rounded-full bg-emerald-500 transition-transform duration-500 ease-out motion-reduce:transition-none"
                    style={{ transform: `scaleX(${ratio})` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
