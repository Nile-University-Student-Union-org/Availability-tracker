"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

export function LiveIndicator({
  lastUpdated,
  status,
}: {
  lastUpdated: number | null;
  status: "live" | "reconnecting";
}) {
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const seconds =
    lastUpdated && now
      ? Math.max(0, Math.floor((now - lastUpdated) / 1000))
      : 0;

  return (
    <span className="inline-flex w-52 shrink-0 items-center gap-1.5 whitespace-nowrap text-[11px] text-muted-foreground tabular-nums">
      <span
        aria-hidden="true"
        className={cn(
          "size-1.5 shrink-0 rounded-full",
          status === "live"
            ? "animate-pulse bg-emerald-500 motion-reduce:animate-none"
            : "bg-muted-foreground/50",
        )}
      />
      {status === "reconnecting"
        ? "Reconnecting…"
        : `Live · Updated ${seconds}s ago`}
    </span>
  );
}
