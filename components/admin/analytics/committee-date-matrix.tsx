import { HeatmapPulse } from "@/components/admin/heatmap-pulse";
import { cn } from "@/lib/utils";
import { formatDayShort } from "./format";

export function CommitteeDateMatrix({
  dates,
  committeeDateMatrix,
}: {
  dates: string[];
  committeeDateMatrix: {
    committee: string;
    dates: { date: string; count: number }[];
  }[];
}) {
  return (
    <div className="overflow-hidden rounded-3xl border bg-card">
      <div className="border-b px-5 py-4">
        <h2 className="font-heading text-base font-semibold">
          Committee × Date Coverage
        </h2>
        <p className="text-xs text-muted-foreground">
          Number of unique members available each day per committee
        </p>
      </div>
      <div className="overflow-x-auto p-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden [mask-image:linear-gradient(to_right,black_calc(100%-24px),transparent)]">
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
                        "relative inline-flex h-6 w-6 items-center justify-center rounded-full text-[10px]",
                        d.count > 0
                          ? "bg-emerald-500/15 font-bold text-emerald-700"
                          : "text-muted-foreground/30",
                      )}
                    >
                      <HeatmapPulse count={d.count} />
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
  );
}
