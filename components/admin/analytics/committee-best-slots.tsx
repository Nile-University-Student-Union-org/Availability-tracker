import { Badge } from "@/components/ui/badge";
import { formatDayFull, formatTime } from "./format";

export function CommitteeBestSlots({
  bestSlotPerCommittee,
}: {
  bestSlotPerCommittee: {
    committee: string;
    best: {
      date: string;
      startTime: string;
      cCount: number;
    } | null;
  }[];
}) {
  return (
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
  );
}
