"use client";

import { Switch as SwitchPrimitive } from "@base-ui/react/switch";

import { cn } from "@/lib/utils";

/**
 * Glass switch: a frosted track with a floating glass thumb.
 * The thumb stretches while pressed (toward the side it will travel from)
 * and settles on a critically damped curve, so it reads as one physical
 * piece rather than a jump between two states.
 */
function Switch({
  className,
  size = "default",
  ...props
}: SwitchPrimitive.Root.Props & {
  size?: "sm" | "default";
}) {
  return (
    <SwitchPrimitive.Root
      data-slot="switch"
      data-size={size}
      className={cn(
        "peer group/switch relative inline-flex shrink-0 cursor-pointer items-center rounded-full p-0.5 outline-none touch-manipulation",
        // 44px hit area without growing the visible control
        "after:absolute after:-inset-x-2 after:-inset-y-2.5",
        "data-[size=default]:h-7 data-[size=default]:w-12 data-[size=sm]:h-5 data-[size=sm]:w-9",
        // Frosted track: tinted glass with an inner shadow and a lit top edge
        "border backdrop-blur-md backdrop-saturate-150",
        "transition-[background-color,border-color,box-shadow] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
        "data-unchecked:border-slate-900/10 data-unchecked:bg-slate-900/[0.07] data-unchecked:shadow-[inset_0_1px_3px_rgb(15_23_42/0.14)]",
        "dark:data-unchecked:border-white/12 dark:data-unchecked:bg-white/[0.07] dark:data-unchecked:shadow-[inset_0_1px_3px_rgb(0_0_0/0.45)]",
        "data-checked:border-emerald-400/50 data-checked:bg-emerald-500/80 data-checked:shadow-[inset_0_1px_0_rgb(255_255_255/0.35),0_0_0_4px_rgb(16_185_129/0.12)]",
        "dark:data-checked:border-emerald-300/30 dark:data-checked:bg-emerald-500/70",
        "focus-visible:ring-3 focus-visible:ring-ring/40",
        "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
        "data-disabled:cursor-not-allowed data-disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        data-slot="switch-thumb"
        className={cn(
          "pointer-events-none block rounded-full",
          // Glass thumb: bright fill, lit top edge, soft offset shadow
          "bg-white/95 shadow-[0_2px_6px_-1px_rgb(15_23_42/0.3),0_1px_2px_rgb(15_23_42/0.15),inset_0_1px_0_rgb(255_255_255)]",
          "dark:bg-white/90 dark:data-unchecked:bg-white/70",
          "transition-[transform,width] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] motion-reduce:transition-none",
          "group-data-[size=default]/switch:h-6 group-data-[size=default]/switch:w-6 group-data-[size=sm]/switch:h-4 group-data-[size=sm]/switch:w-4",
          // Press: stretch like iOS; when on, grow leftward by shifting back
          "group-active/switch:group-data-[size=default]/switch:w-7 group-active/switch:group-data-[size=sm]/switch:w-5",
          "data-unchecked:translate-x-0",
          "group-data-[size=default]/switch:data-checked:translate-x-[18px] group-data-[size=sm]/switch:data-checked:translate-x-[14px]",
          "group-active/switch:group-data-[size=default]/switch:data-checked:translate-x-[14px] group-active/switch:group-data-[size=sm]/switch:data-checked:translate-x-[10px]",
        )}
      />
    </SwitchPrimitive.Root>
  );
}

export { Switch };
