"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

export interface SegmentedControlProps<T extends string> {
  value: T;
  options: { value: T; label: React.ReactNode; icon?: React.ReactNode }[];
  onChange: (value: T) => void;
  "aria-label": string;
  variant?: "default" | "tabs";
  role?: "tablist" | "radiogroup";
  className?: string;
}

/**
 * Liquid glass segmented control and tabs:
 * Clear glass track with a sliding lens capsule (var(--lens) or var(--lens-nile))
 * that glides between options with spring physics (var(--ease-spring)).
 */
export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  variant = "default",
  role = "tablist",
  className,
  ...props
}: SegmentedControlProps<T>) {
  const buttonRefs = React.useRef<(HTMLButtonElement | null)[]>([]);
  const [thumb, setThumb] = React.useState<{
    left: number;
    width: number;
  } | null>(null);
  const [mounted, setMounted] = React.useState(false);

  const activeIndex = Math.max(
    0,
    options.findIndex((o) => o.value === value),
  );

  const isTabs = variant === "tabs";

  const updateThumb = React.useCallback(() => {
    const el = buttonRefs.current[activeIndex];
    if (el) {
      setThumb({
        left: el.offsetLeft,
        width: el.offsetWidth,
      });
    }
  }, [activeIndex]);

  React.useLayoutEffect(() => {
    updateThumb();
  }, [updateThumb, options, value]);

  React.useEffect(() => {
    setMounted(true);
    const handleResize = () => updateThumb();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [updateThumb]);

  const handleKeyDown = (e: React.KeyboardEvent, currentIndex: number) => {
    let nextIndex = -1;
    if (e.key === "ArrowRight") {
      nextIndex = (currentIndex + 1) % options.length;
    } else if (e.key === "ArrowLeft") {
      nextIndex = (currentIndex - 1 + options.length) % options.length;
    }
    if (nextIndex >= 0) {
      e.preventDefault();
      const nextOption = options[nextIndex];
      onChange(nextOption.value);
      buttonRefs.current[nextIndex]?.focus();
    }
  };

  return (
    <div
      role={role}
      aria-label={props["aria-label"]}
      className={cn(
        "relative inline-flex items-center glass rounded-full",
        isTabs
          ? "p-1 max-w-full overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "p-[3px]",
        className,
      )}
    >
      {/* Sliding Lens Thumb */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute left-0 z-[2] rounded-full will-change-[transform,width]",
          isTabs ? "top-1 bottom-1" : "top-[3px] bottom-[3px]",
          isTabs
            ? "glass-lens"
            : "bg-(--lens) shadow-[var(--edge),0_4px_14px_-6px_rgb(0_0_0/0.35)]",
          mounted
            ? "transition-[transform,width] duration-[560ms] ease-[var(--ease-spring)] motion-reduce:transition-none"
            : "transition-none",
        )}
        style={
          thumb
            ? {
                transform: `translateX(${thumb.left}px)`,
                width: `${thumb.width}px`,
              }
            : {
                transform: `translateX(calc(${activeIndex} * 100%))`,
                width: `calc(100% / ${Math.max(1, options.length)})`,
              }
        }
      />

      {options.map((option, index) => {
        const selected = option.value === value;
        return (
          <button
            key={option.value}
            ref={(el) => {
              buttonRefs.current[index] = el;
            }}
            type="button"
            role={role === "radiogroup" ? "radio" : "tab"}
            aria-selected={role === "radiogroup" ? undefined : selected}
            aria-checked={role === "radiogroup" ? selected : undefined}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(option.value)}
            onKeyDown={(e) => handleKeyDown(e, index)}
            className={cn(
              "relative z-[3] flex flex-1 min-w-0 items-center justify-center gap-1.5 rounded-full whitespace-nowrap text-xs font-semibold cursor-pointer touch-manipulation select-none outline-none focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-(--glass-nile-fg) active:scale-[0.97] transition-colors duration-200",
              isTabs
                ? "h-10 min-h-[44px] md:min-h-10 px-4 text-sm"
                : "h-9 min-h-[44px] md:min-h-[38px] px-3.5",
              selected
                ? isTabs
                  ? "text-(--glass-nile-fg) font-semibold"
                  : "text-foreground font-semibold"
                : "text-muted-foreground hover:text-foreground font-medium",
            )}
          >
            {option.icon}
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
