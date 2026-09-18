"use client";

import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Badge } from "@/components/ui/badge";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Check,
  ChevronLeft,
  ChevronRight,
  CalendarCheck2,
  AlertCircle,
} from "lucide-react";

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

function getSlotEndTime(startTime: string): string {
  const [h, m] = startTime.split(":").map(Number);
  const endH = (h + 1) % 24;
  return `${String(endH).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

const DEFAULT_HOURS = [
  "08:30",
  "09:30",
  "10:30",
  "11:30",
  "12:30",
  "13:30",
  "14:30",
  "15:30",
  "16:30",
  "17:30",
];

interface AvailabilityDialogProps {
  date: string;
  initialSlots: string[];
  memberName: string;
  memberEmail: string;
  memberId: string;
  memberCommittee: string;
  slotMode: "fixed" | "free";
  timeSlots: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (date: string, slots: string[]) => void;
  allDates?: string[];
  onNavigateDate?: (date: string) => void;
  availabilityMap?: Map<string, Set<string>>;
}

export function AvailabilityDialog({
  date,
  initialSlots,
  memberName,
  memberEmail,
  memberId,
  memberCommittee,
  timeSlots,
  open,
  onOpenChange,
  onSaved,
  allDates = [],
  onNavigateDate,
  availabilityMap,
}: AvailabilityDialogProps) {
  const isMobile = useIsMobile();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(
    new Set(initialSlots),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Drag-to-select tracking
  const [isDragging, setIsDragging] = useState(false);
  const dragModeRef = useRef<"add" | "remove">("add");
  const isDirtyRef = useRef(false);

  // Sync selected slots whenever date or open state changes
  useEffect(() => {
    if (open) {
      const currentInitial = availabilityMap?.has(date)
        ? Array.from(availabilityMap.get(date) ?? [])
        : initialSlots;
      setSelectedSlots(new Set(currentInitial));
      setError(null);
      isDirtyRef.current = false;
    }
  }, [open, date, initialSlots, availabilityMap]);

  // Global listener to terminate drag operations
  useEffect(() => {
    const handleGlobalPointerUp = () => {
      setIsDragging(false);
    };
    window.addEventListener("pointerup", handleGlobalPointerUp);
    return () => window.removeEventListener("pointerup", handleGlobalPointerUp);
  }, []);

  // Compute active available slots in unified chronological order
  const effectiveSlots = useMemo(() => {
    const base = timeSlots.length > 0 ? timeSlots : DEFAULT_HOURS;
    return Array.from(new Set(base)).sort();
  }, [timeSlots]);

  function handleSlotPointerDown(slot: string, e: React.PointerEvent) {
    if (e.button !== 0) return;
    setError(null);
    isDirtyRef.current = true;
    setIsDragging(true);

    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) {
        next.delete(slot);
        dragModeRef.current = "remove";
      } else {
        next.add(slot);
        dragModeRef.current = "add";
      }
      return next;
    });
  }

  function handleSlotPointerEnter(slot: string) {
    if (!isDragging) return;
    setError(null);
    isDirtyRef.current = true;

    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (dragModeRef.current === "add") {
        next.add(slot);
      } else {
        next.delete(slot);
      }
      return next;
    });
  }

  // Save logic
  const saveSlots = useCallback(
    async (targetDate: string, slotsToSave: string[], closeAfter = true) => {
      if (memberEmail === "admin@nu.edu.eg") {
        setError(
          "Admin accounts cannot mark availability. Please use the Admin Portal.",
        );
        return false;
      }
      if (!memberId?.trim() || !memberCommittee?.trim()) {
        setError(
          "Please complete your profile (NU ID & Committee) before saving availability.",
        );
        return false;
      }
      setIsSaving(true);
      setError(null);
      try {
        const res = await fetch("/api/availability", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            date: targetDate,
            slots: slotsToSave,
            memberName,
            memberEmail,
            memberId,
            memberCommittee,
          }),
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(
            errData?.error || `Failed to save (Status ${res.status})`,
          );
        }

        onSaved(targetDate, slotsToSave);
        isDirtyRef.current = false;
        toast.success(
          `Saved ${new Date(targetDate + "T00:00:00").toLocaleDateString(
            "en-US",
            {
              weekday: "short",
              month: "short",
              day: "numeric",
            },
          )}`,
          {
            id: "availability-save",
            duration: 2000,
          },
        );
        if (closeAfter) {
          onOpenChange(false);
        }
        return true;
      } catch (err: unknown) {
        const message =
          err instanceof Error
            ? err.message
            : "Failed to save. Please try again.";
        setError(message);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [memberName, memberEmail, memberId, memberCommittee, onSaved, onOpenChange],
  );

  async function handleSaveClick() {
    await saveSlots(date, Array.from(selectedSlots), true);
  }

  // Navigation between days
  const currentIndex = allDates.indexOf(date);
  const prevDate = currentIndex > 0 ? allDates[currentIndex - 1] : null;
  const nextDate =
    currentIndex >= 0 && currentIndex < allDates.length - 1
      ? allDates[currentIndex + 1]
      : null;

  async function handleNavigate(newDate: string) {
    if (newDate === date) return;

    if (isDirtyRef.current) {
      await saveSlots(date, Array.from(selectedSlots), false);
    }

    if (onNavigateDate) {
      onNavigateDate(newDate);
    }
  }

  async function handleSaveAndNext() {
    const success = await saveSlots(date, Array.from(selectedSlots), false);
    if (success && nextDate && onNavigateDate) {
      onNavigateDate(nextDate);
    }
  }

  const totalPossible = effectiveSlots.length || 1;
  const percentSelected = Math.round(
    (selectedSlots.size / totalPossible) * 100,
  );

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric" },
  );

  // Header Content (Title, Days strip, Counter, Progress Bar)
  const HeaderComponent = (
    <div className="border-b bg-muted/20 px-4 pt-3 pb-3 sm:px-6 sm:pt-6 sm:pb-4">
      {allDates.length > 1 && (
        <div className="mb-2.5 flex items-center justify-between gap-1 sm:mb-3 sm:gap-2">
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => prevDate && handleNavigate(prevDate)}
            disabled={!prevDate || isSaving}
            className="size-8 touch-manipulation rounded-full"
            title="Previous Day"
          >
            <ChevronLeft className="size-4" />
          </Button>

          {/* Day selection pills */}
          <div className="scrollbar-none flex flex-1 items-center justify-center gap-1.5 overflow-x-auto py-1">
            {allDates.map((d) => {
              const dObj = new Date(d + "T00:00:00");
              const dayName = dObj.toLocaleDateString("en-US", {
                weekday: "short",
              });
              const dayNum = dObj.getDate();
              const isCurrent = d === date;
              const hasSlots =
                (availabilityMap?.get(d)?.size ?? 0) > 0 ||
                (isCurrent && selectedSlots.size > 0);

              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => handleNavigate(d)}
                  className={cn(
                    "relative flex min-w-10 touch-manipulation flex-col items-center rounded-xl px-2 py-1.5 text-xs font-medium transition-all active:scale-95",
                    isCurrent
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground",
                  )}
                >
                  <span className="text-[10px] font-semibold uppercase">
                    {dayName}
                  </span>
                  <span className="text-sm font-bold">{dayNum}</span>
                  {hasSlots && (
                    <span
                      className={cn(
                        "absolute top-1 right-1 size-1.5 rounded-full ring-1 ring-background",
                        isCurrent ? "bg-white" : "bg-emerald-500",
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            size="icon-sm"
            onClick={() => nextDate && handleNavigate(nextDate)}
            disabled={!nextDate || isSaving}
            className="size-8 touch-manipulation rounded-full"
            title="Next Day"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-heading text-lg font-bold tracking-tight sm:text-xl">
            {formattedDate}
          </h2>
          <Badge
            variant="secondary"
            className={cn(
              "shrink-0 gap-1 text-xs font-semibold transition-colors",
              selectedSlots.size > 0
                ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-400"
                : "text-muted-foreground",
            )}
          >
            <CalendarCheck2 className="size-3.5" />
            {selectedSlots.size} {selectedSlots.size === 1 ? "slot" : "slots"} (
            {selectedSlots.size}h)
          </Badge>
        </div>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Tap slots to mark your availability. Swipe down or use buttons to
          save.
        </p>
      </div>

      {/* Progress / Density bar */}
      <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-emerald-500 transition-all duration-300"
          style={{ width: `${percentSelected}%` }}
        />
      </div>
    </div>
  );

  // Common Slots Grid Body (Clean, unified chronological grid)
  const BodyComponent = (
    <div className="space-y-4 px-4 pt-3 pb-8 select-none sm:space-y-5 sm:px-6 sm:pb-6">
      {/* Single Unified Grid of All Slots */}
      <div className="grid grid-cols-2 gap-2">
        {effectiveSlots.map((slot) => {
          const isSelected = selectedSlots.has(slot);
          const endTime = getSlotEndTime(slot);

          return (
            <div
              key={slot}
              onPointerDown={(e) => handleSlotPointerDown(slot, e)}
              onPointerEnter={() => handleSlotPointerEnter(slot)}
              className={cn(
                "group relative flex min-h-[56px] cursor-pointer touch-manipulation items-center justify-between rounded-2xl border p-3 transition-all duration-150 active:scale-[0.97]",
                isSelected
                  ? "border-emerald-500/70 bg-emerald-500/15 shadow-sm ring-1 ring-emerald-500/30 dark:bg-emerald-500/20"
                  : "border-border/80 bg-card hover:border-primary/40 hover:bg-muted/30",
              )}
            >
              <div className="space-y-0.5">
                <p
                  className={cn(
                    "text-sm font-semibold tracking-tight",
                    isSelected
                      ? "font-bold text-emerald-800 dark:text-emerald-300"
                      : "text-foreground",
                  )}
                >
                  {formatTime(slot)}
                </p>
                <p className="text-[11px] text-muted-foreground">
                  to {formatTime(endTime)}
                </p>
              </div>

              <div
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full transition-all",
                  isSelected
                    ? "bg-emerald-500 text-white shadow-xs"
                    : "border border-border/80 text-transparent group-hover:border-primary/40",
                )}
              >
                <Check className="size-3.5 stroke-[3]" />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Dedicated Error Banner visible directly above action buttons
  const ErrorBanner = error ? (
    <div className="flex w-full items-center gap-2.5 rounded-xl border border-destructive/20 bg-destructive/10 px-3.5 py-2.5 text-xs font-medium text-destructive shadow-xs animate-in fade-in slide-in-from-bottom-2">
      <AlertCircle className="size-4 shrink-0 stroke-[2.2]" />
      <span className="flex-1 text-left leading-tight">{error}</span>
    </div>
  ) : null;

  // Common Action Buttons
  const ActionButtons = (
    <div className="flex w-full items-center justify-between gap-2">
      {isMobile ? (
        <DrawerClose asChild>
          <Button
            variant="ghost"
            size="sm"
            className="min-h-[44px] touch-manipulation rounded-xl px-3 text-xs font-semibold sm:min-h-[36px] sm:text-sm"
          >
            Close
          </Button>
        </DrawerClose>
      ) : (
        <DialogClose
          render={
            <Button
              variant="ghost"
              size="sm"
              className="min-h-[36px] rounded-xl px-3 text-xs sm:text-sm"
            >
              Cancel
            </Button>
          }
        />
      )}

      <div className="flex items-center gap-2">
        {nextDate && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSaveAndNext}
            disabled={isSaving}
            className="min-h-[44px] touch-manipulation rounded-xl px-3 text-xs font-semibold sm:min-h-[36px] sm:text-sm"
          >
            Save & Next →
          </Button>
        )}

        <Button
          onClick={handleSaveClick}
          disabled={isSaving}
          size="sm"
          className="min-h-[44px] touch-manipulation rounded-xl px-3.5 text-xs font-semibold shadow-sm sm:min-h-[36px] sm:text-sm"
        >
          {isSaving ? "Saving..." : "Save Availability"}
        </Button>
      </div>
    </div>
  );

  if (!mounted) {
    return null;
  }

  // Mobile Native Experience: Bottom Sheet Drawer
  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent className="flex max-h-[88vh] flex-col rounded-t-3xl border-t bg-card p-0 shadow-2xl">
          <DrawerHeader className="sr-only">
            <DrawerTitle>{formattedDate}</DrawerTitle>
            <DrawerDescription>Choose your free time slots</DrawerDescription>
          </DrawerHeader>

          {HeaderComponent}

          {/* Scrollable body */}
          <div className="flex-1 overflow-y-auto overscroll-contain">
            {BodyComponent}
          </div>

          {/* Sticky thumb-accessible bottom footer with safe area clearance */}
          <DrawerFooter className="flex flex-col gap-2.5 border-t bg-card/98 px-4 pt-3 pb-[max(1.75rem,calc(env(safe-area-inset-bottom,0px)+1.25rem))] backdrop-blur sm:px-6 sm:py-4">
            {ErrorBanner}
            {ActionButtons}
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  // Desktop Experience: Centered Dialog
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] w-full max-w-xl overflow-hidden p-0 sm:max-w-xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{formattedDate}</DialogTitle>
          <DialogDescription>Choose your free time slots</DialogDescription>
        </DialogHeader>

        {HeaderComponent}

        <div className="max-h-[50vh] overflow-y-auto">{BodyComponent}</div>

        <DialogFooter className="flex-col sm:flex-col gap-2.5 border-t bg-muted/20 px-6 py-3">
          {ErrorBanner}
          {ActionButtons}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
