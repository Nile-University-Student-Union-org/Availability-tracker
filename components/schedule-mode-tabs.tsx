"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import { Calendar03Icon, Clock01Icon } from "@hugeicons/core-free-icons";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface ScheduleModeTabsProps {
  dateScheduleActive?: boolean;
  weeklyScheduleActive?: boolean;
  className?: string;
}

export function ScheduleModeTabs({
  dateScheduleActive = true,
  weeklyScheduleActive = true,
  className,
}: ScheduleModeTabsProps) {
  const pathname = usePathname();
  const isSpecific = pathname === "/specific" || pathname === "/";
  const isWeekly = pathname === "/weekly";

  return (
    <div
      className={cn(
        "flex w-full max-w-md items-center justify-center p-1 rounded-2xl bg-muted/70 backdrop-blur-md border border-border/70 shadow-xs",
        className,
      )}
      role="tablist"
      aria-label="Availability mode switcher"
    >
      {/* Specific Date Tab */}
      <Link
        href="/specific"
        role="tab"
        aria-selected={isSpecific}
        className={cn(
          "relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-semibold transition-all duration-200 select-none min-h-[44px] touch-manipulation",
          isSpecific
            ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
            : "text-muted-foreground hover:text-foreground hover:bg-background/40",
        )}
      >
        <HugeiconsIcon
          icon={Calendar03Icon}
          size={16}
          strokeWidth={2}
          className={cn(
            "transition-colors",
            isSpecific ? "text-primary" : "text-muted-foreground",
          )}
        />
        <span>Specific Date</span>
        {!dateScheduleActive && (
          <Badge
            variant="outline"
            className="ml-1 text-[10px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
          >
            Closed
          </Badge>
        )}
      </Link>

      {/* Semester Availability Tab */}
      <Link
        href="/weekly"
        role="tab"
        aria-selected={isWeekly}
        className={cn(
          "relative flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 px-3 text-xs sm:text-sm font-semibold transition-all duration-200 select-none min-h-[44px] touch-manipulation",
          isWeekly
            ? "bg-background text-foreground shadow-sm ring-1 ring-black/5 dark:ring-white/10"
            : "text-muted-foreground hover:text-foreground hover:bg-background/40",
        )}
      >
        <HugeiconsIcon
          icon={Clock01Icon}
          size={16}
          strokeWidth={2}
          className={cn(
            "transition-colors",
            isWeekly ? "text-emerald-500" : "text-muted-foreground",
          )}
        />
        <span>Semester Availability</span>
        {!weeklyScheduleActive && (
          <Badge
            variant="outline"
            className="ml-1 text-[10px] px-1.5 py-0 h-4 border-amber-500/30 text-amber-600 dark:text-amber-400 bg-amber-500/10"
          >
            Closed
          </Badge>
        )}
      </Link>
    </div>
  );
}
