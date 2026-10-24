"use client";

import { useState } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import { RefreshIcon } from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";

// Refresh icon that spins one turn every time `spin()` is called
export function useRefreshSpin() {
  const [spinKey, setSpinKey] = useState(0);
  return { spinKey, spin: () => setSpinKey((k) => k + 1) };
}

export function RefreshSpinIcon({
  spinKey,
  size = 15,
  className,
}: {
  spinKey: number;
  size?: number;
  className?: string;
}) {
  return (
    <HugeiconsIcon
      key={spinKey}
      icon={RefreshIcon}
      size={size}
      className={cn(spinKey > 0 && "motion-spin-once", className)}
    />
  );
}
