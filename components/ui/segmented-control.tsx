"use client";

import { cn } from "@/lib/utils";

interface SegmentedControlProps<T extends string> {
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
  "aria-label": string;
  className?: string;
}

/**
 * Glass segmented control: equal-width segments on a frosted track, with one
 * lit glass pill that slides to the chosen segment.
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  className,
  ...props
}: SegmentedControlProps<T>) {
  const index = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );
  return (
    <div
      role="radiogroup"
      aria-label={props["aria-label"]}
      className={cn(
        "relative grid rounded-2xl border p-1 backdrop-blur-md backdrop-saturate-150",
        "border-slate-900/10 bg-slate-900/[0.05] shadow-[inset_0_1px_2px_rgb(15_23_42/0.08)]",
        "dark:border-white/10 dark:bg-white/[0.05] dark:shadow-[inset_0_1px_2px_rgb(0_0_0/0.4)]",
        className,
      )}
      style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}
    >
      {/* Sliding glass pill */}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-y-1 left-1 rounded-xl",
          "bg-white/90 shadow-[0_2px_8px_-2px_rgb(15_23_42/0.22),0_1px_2px_rgb(15_23_42/0.1),inset_0_1px_0_rgb(255_255_255)]",
          "dark:bg-white/[0.12] dark:shadow-[0_2px_8px_-2px_rgb(0_0_0/0.6),inset_0_1px_0_rgb(255_255_255/0.12)]",
          "transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
        )}
        style={{
          width: `calc((100% - 0.5rem) / ${options.length})`,
          transform: `translateX(${index * 100}%)`,
        }}
      />
      {options.map((option) => {
        const checked = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={checked}
            onClick={() => onChange(option.value)}
            className={cn(
              "relative z-10 flex min-h-[44px] cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 text-xs font-semibold transition-colors touch-manipulation active:scale-[0.97] md:min-h-9",
              checked
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
