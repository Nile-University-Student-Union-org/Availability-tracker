import { cn } from "@/lib/utils";

/** Placeholder shaped like the content it stands in for, with a soft sheen. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden
      className={cn(
        "relative overflow-hidden rounded-2xl bg-foreground/[0.06]",
        "after:absolute after:inset-0 after:-translate-x-full after:animate-[glass-sheen_1.5s_var(--ease-smooth)_infinite] after:bg-linear-to-r after:from-transparent after:via-white/40 after:to-transparent dark:after:via-white/[0.07] motion-reduce:after:hidden",
        className,
      )}
      {...props}
    />
  );
}

export { Skeleton };
