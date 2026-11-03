import { cn } from "@/lib/utils";

/**
 * Comet spinner: a conic arc with a rounded head on a faint track, in
 * currentColor. Use it only for an action in progress (inside its button);
 * content that is loading gets a Skeleton instead.
 */
function Spinner({
  className,
  label = "Loading",
  ...props
}: React.ComponentProps<"span"> & { label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className={cn(
        "relative inline-block size-4 shrink-0 animate-[spin_760ms_linear_infinite] rounded-full [--w:2px] motion-reduce:animate-[spin_1.6s_linear_infinite]",
        "[mask:radial-gradient(farthest-side,transparent_calc(100%-var(--w)),#000_calc(100%-var(--w)+0.5px))] bg-[conic-gradient(from_0deg,transparent_0%,transparent_8%,currentColor_100%)]",
        "before:absolute before:inset-0 before:rounded-full before:bg-current before:opacity-15",
        "after:absolute after:top-0 after:left-1/2 after:size-(--w) after:-translate-x-1/2 after:rounded-full after:bg-current",
        className,
      )}
      {...props}
    />
  );
}

export { Spinner };
