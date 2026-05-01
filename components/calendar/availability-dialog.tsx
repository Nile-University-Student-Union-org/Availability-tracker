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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { HugeiconsIcon } from "@hugeicons/react";
import { Delete02Icon, PlusSignIcon } from "@hugeicons/core-free-icons";

function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

interface AvailabilityDialogProps {
  date: string;
  initialSlots: string[];
  memberName: string;
  memberEmail: string;
  slotMode: "fixed" | "free";
  timeSlots: string[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSaved: (date: string, slots: string[]) => void;
}

export function AvailabilityDialog({
  date,
  initialSlots,
  memberName,
  memberEmail,
  slotMode,
  timeSlots,
  open,
  onOpenChange,
  onSaved,
}: AvailabilityDialogProps) {
  const [selectedSlots, setSelectedSlots] = useState<Set<string>>(
    new Set(initialSlots),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freeTimeInput, setFreeTimeInput] = useState("");

  // Reset to the persisted state each time the dialog opens (or for a different date)
  useEffect(() => {
    if (open) {
      setSelectedSlots(new Set(initialSlots));
      setError(null);
      setFreeTimeInput("");
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

  function addFreeSlot() {
    if (!freeTimeInput) return;
    const normalized =
      freeTimeInput.length === 5 ? freeTimeInput : `0${freeTimeInput}`;
    if (!/^\d{2}:\d{2}$/.test(normalized)) return;
    setError(null);
    setSelectedSlots((prev) => new Set(prev).add(normalized));
    setFreeTimeInput("");
  }

  function removeFreeSlot(slot: string) {
    setSelectedSlots((prev) => {
      const next = new Set(prev);
      next.delete(slot);
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
        body: JSON.stringify({
          date,
          slots: Array.from(selectedSlots),
          memberName,
          memberEmail,
        }),
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
            {slotMode === "fixed"
              ? "Select the time slots when you are free."
              : "Add the times when you are available."}
          </DialogDescription>
        </DialogHeader>

        {slotMode === "fixed" ? (
          <div className="grid grid-cols-2 gap-2">
            {timeSlots.map((slot) => (
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
                {formatTime(slot)}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-3">
            {/* Free mode: add times manually */}
            <div className="flex items-end gap-2">
              <div className="flex-1 space-y-2">
                <Label htmlFor="free-time">Add a Time</Label>
                <Input
                  id="free-time"
                  type="time"
                  value={freeTimeInput}
                  onChange={(e) => setFreeTimeInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") addFreeSlot();
                  }}
                />
              </div>
              <Button
                onClick={addFreeSlot}
                size="sm"
                disabled={!freeTimeInput}
                className="rounded-2xl"
              >
                <HugeiconsIcon icon={PlusSignIcon} className="size-4" />
                Add
              </Button>
            </div>

            {selectedSlots.size > 0 ? (
              <div className="flex flex-wrap gap-2">
                {Array.from(selectedSlots)
                  .sort()
                  .map((slot) => (
                    <div
                      key={slot}
                      className="flex items-center gap-1.5 rounded-xl border border-primary/30 bg-primary/10 py-1.5 pr-1.5 pl-3 text-sm font-medium text-primary"
                    >
                      {formatTime(slot)}
                      <button
                        onClick={() => removeFreeSlot(slot)}
                        className="rounded-lg p-0.5 opacity-60 transition-opacity hover:bg-destructive/10 hover:text-destructive hover:opacity-100"
                      >
                        <HugeiconsIcon
                          icon={Delete02Icon}
                          className="size-3.5"
                          strokeWidth={2}
                        />
                      </button>
                    </div>
                  ))}
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed px-4 py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  No times added yet. Use the field above to add your available
                  times.
                </p>
              </div>
            )}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
