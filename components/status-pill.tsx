"use client";

import { useSyncExternalStore } from "react";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Alert02Icon,
  Cancel01Icon,
  CheckmarkCircle02Icon,
  InformationCircleIcon,
} from "@hugeicons/core-free-icons";
import {
  dismissNotice,
  getLastNotice,
  getNotice,
  subscribeNotice,
} from "@/lib/notify";
import { cn } from "@/lib/utils";

const ICON = {
  success: CheckmarkCircle02Icon,
  error: Alert02Icon,
  info: InformationCircleIcon,
};

// Hangs just below its (relative) parent bar and slides out of it.
export function StatusPill({ className }: { className?: string }) {
  const notice = useSyncExternalStore(subscribeNotice, getNotice, () => null);
  // Keep the last message rendered while it fades out
  const shown = useSyncExternalStore(
    subscribeNotice,
    getLastNotice,
    () => null,
  );
  const visible = Boolean(notice);

  return (
    <div
      role={shown?.kind === "error" ? "alert" : "status"}
      aria-live={shown?.kind === "error" ? "assertive" : "polite"}
      className={cn(
        "pointer-events-none absolute top-full left-1/2 z-50 mt-2 flex -translate-x-1/2 justify-center",
        className,
      )}
    >
      {shown && (
        <div
          key={shown.id}
          className={cn(
            "flex max-w-[min(90vw,420px)] items-center gap-2 rounded-full border bg-card py-1.5 pr-1.5 pl-3 text-xs font-semibold shadow-[0_10px_30px_-10px_rgb(15_23_42/0.35)] transition-[opacity,scale,translate] duration-200 ease-[var(--ease-out)] motion-reduce:transition-opacity",
            visible
              ? "pointer-events-auto translate-y-0 scale-100 opacity-100"
              : "-translate-y-1 scale-95 opacity-0",
            shown.kind === "error"
              ? "border-destructive/30 text-destructive"
              : "border-border/70 text-foreground",
            shown.kind !== "error" && "pr-3",
          )}
        >
          <HugeiconsIcon
            icon={ICON[shown.kind]}
            size={16}
            className={cn(
              "shrink-0",
              shown.kind === "success" &&
                "text-emerald-600 dark:text-emerald-400",
              shown.kind === "info" && "text-primary",
            )}
          />
          <span className="truncate">{shown.message}</span>
          {shown.kind === "error" && (
            <button
              type="button"
              onClick={dismissNotice}
              aria-label="Dismiss message"
              className="flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full text-destructive/70 transition-press hover:bg-destructive/10 hover:text-destructive"
            >
              <HugeiconsIcon icon={Cancel01Icon} size={13} />
            </button>
          )}
        </div>
      )}
    </div>
  );
}
