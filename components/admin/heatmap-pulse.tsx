"use client";

import { useEffect, useRef } from "react";

export function HeatmapPulse({ count }: { count: number }) {
  const element = useRef<HTMLSpanElement>(null);
  const previous = useRef(count);

  useEffect(() => {
    const changed = previous.current !== count;
    previous.current = count;
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!changed || motion.matches) return;

    const animation = element.current?.animate(
      [
        {
          opacity: 1,
          boxShadow: "inset 0 0 0 2px #10b981, 0 0 10px #10b98180",
        },
        {
          opacity: 0,
          boxShadow: "inset 0 0 0 2px #10b981, 0 0 16px #10b98100",
        },
      ],
      { duration: 600, easing: "cubic-bezier(0.23, 1, 0.32, 1)" },
    );
    const stop = () => {
      if (motion.matches) animation?.cancel();
    };
    motion.addEventListener("change", stop);
    return () => {
      animation?.cancel();
      motion.removeEventListener("change", stop);
    };
  }, [count]);

  return (
    <span
      ref={element}
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-0"
    />
  );
}
