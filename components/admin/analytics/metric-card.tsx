import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/admin/animated-number";

export function MetricCard({
  label,
  value,
  sub,
  accent = false,
  decimals = 0,
}: {
  label: string;
  value: string | number;
  sub: string;
  accent?: boolean;
  decimals?: number;
}) {
  return (
    <div
      className={cn(
        "rounded-3xl border px-4 py-4 transition-all",
        accent ? "border-primary/25 bg-primary/8" : "bg-card",
      )}
    >
      <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
        {label}
      </p>
      <p
        className={cn(
          "mt-1 font-heading text-3xl font-semibold",
          accent && "text-primary",
        )}
      >
        {typeof value === "number" ? (
          <AnimatedNumber value={value} decimals={decimals} />
        ) : (
          value
        )}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted-foreground">{sub}</p>
    </div>
  );
}
