"use client";

import { useEffect, useState } from "react";
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
  TIME_SLOT_LABELS,
  TIME_SLOTS,
} from "@/components/calendar/constants";
import { cn } from "@/lib/utils";

interface AvailabilityDialogProps {
  date: string;
  initialSlots: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (date: string, slots: string[]) => void;
}

export function AvailabilityDialog({
  date,
  initialSlots,
  open,
  onOpenChange,
  onSaved,
}: AvailabilityDialogProps) {
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(
    new Set(initialSlots),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Reset to the persisted state each time the dialog opens (or for a different date)
  useEffect(() => {
    if (open) {
      setSelectedSlots(new Set(initialSlots));
      setError(null);
    }
    // initialSlots intentionally omitted — snapshot at open time
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, date]);

  function toggleSlot(slot: string) {
    setError(null);
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      if (next.has(slot)) next.delete(slot);
      else next.add(slot);
      return next;
    });
  }

  async function handleSave() {
    if (selectedSlots.size === 0) {
      setError("Please select at least one time slot.");
      return;
    }
    setIsSaving(true);
    try {
      const res = await fetch("/api/availability", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date, slots: Array.from(selectedSlots) }),
      });
      if (!res.ok) throw new Error("Failed to save");
      onSaved(date, Array.from(selectedSlots));
      onOpenChange(false);
    } catch {
      setError("Failed to save. Please try again.");
    } finally {
      setIsSaving(false);
    }
  }

  const formattedDate = new Date(date + "T00:00:00").toLocaleDateString(
    "en-US",
    { weekday: "long", month: "long", day: "numeric" },
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="font-heading text-lg">
            {formattedDate}
          </DialogTitle>
          <DialogDescription>
            Select the time slots when you are free.
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2">
          {TIME_SLOTS.map((slot) => (
            <button
              key={slot}
              onClick={() => toggleSlot(slot)}
              className={cn(
                "rounded-2xl border px-4 py-3 text-sm font-medium transition-all duration-150",
                selectedSlots.has(slot)
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary/8 hover:text-primary",
              )}
            >
              {TIME_SLOT_LABELS[slot]}
            </button>
          ))}
        </div>

        {error && (
          <p className="text-sm text-destructive">{error}</p>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving…" : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
