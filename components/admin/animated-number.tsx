"use client";

import { useEffect, useRef, useState } from "react";

export function AnimatedNumber({
  value,
  decimals = 0,
}: {
  value: number;
  decimals?: number;
}) {
  const [displayed, setDisplayed] = useState(value);
  const current = useRef(value);

  useEffect(() => {
    const from = current.current;
    if (from === value) return;
    const started = performance.now();
    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
    let frame: number;
    const tick = (now: number) => {
      const progress = motion.matches ? 1 : Math.min((now - started) / 400, 1);
      current.current = from + (value - from) * (1 - (1 - progress) ** 3);
      setDisplayed(current.current);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  return (
    <span className="relative inline-block tabular-nums">
      <span aria-hidden="true" className="invisible">
        {value.toFixed(decimals)}
      </span>
      <span className="absolute inset-0">{displayed.toFixed(decimals)}</span>
    </span>
  );
}
