"use client"

import * as React from "react"
import { useState, useMemo } from "react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Clock, Check, ChevronDown } from "lucide-react"

interface TimePickerProps {
  value: string // "HH:mm" e.g. "08:30"
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  id?: string
}

function parseHHmm(timeStr: string): {
  hour12: number
  minute: number
  period: "AM" | "PM"
} {
  if (!timeStr || !timeStr.includes(":")) {
    return { hour12: 9, minute: 0, period: "AM" }
  }
  const [hStr, mStr] = timeStr.split(":")
  const h = Number(hStr) || 0
  const m = Number(mStr) || 0
  const period = h >= 12 ? "PM" : "AM"
  const hour12 = h % 12 || 12
  return { hour12, minute: m, period }
}

function toHHmm(hour12: number, minute: number, period: "AM" | "PM"): string {
  let h = hour12 % 12
  if (period === "PM") h += 12
  return `${String(h).padStart(2, "0")}:${String(minute).padStart(2, "0")}`
}

function formatDisplay(timeStr: string): string {
  if (!timeStr) return ""
  const { hour12, minute, period } = parseHHmm(timeStr)
  return `${hour12}:${String(minute).padStart(2, "0")} ${period}`
}

const COMMON_PRESETS = [
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
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
]

export function TimePicker({
  value,
  onChange,
  placeholder = "Select time...",
  className,
  id,
}: TimePickerProps) {
  const [open, setOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<"presets" | "custom">("presets")

  const { hour12, minute, period } = useMemo(() => parseHHmm(value), [value])

  const [selectedHour, setSelectedHour] = useState(hour12)
  const [selectedMinute, setSelectedMinute] = useState(minute)
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(period)

  React.useEffect(() => {
    if (value) {
      const parsed = parseHHmm(value)
      setSelectedHour(parsed.hour12)
      setSelectedMinute(parsed.minute)
      setSelectedPeriod(parsed.period)
    }
  }, [value])

  function handleSelectPreset(preset: string) {
    onChange(preset)
    setOpen(false)
  }

  function handleApplyCustom() {
    const formatted = toHHmm(selectedHour, selectedMinute, selectedPeriod)
    onChange(formatted)
    setOpen(false)
  }

  const hours = [8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6, 7]
  const minutes = [0, 15, 30, 45]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        id={id}
        type="button"
        className={cn(
          "flex h-9 w-full items-center justify-between rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground shadow-xs transition-colors hover:border-primary/50 focus:border-primary focus:outline-hidden",
          !value && "text-muted-foreground",
          className
        )}
      >
        <div className="flex items-center gap-2">
          <Clock className="size-4 shrink-0 text-primary" />
          <span
            className={cn(
              "font-medium",
              !value && "font-normal text-muted-foreground"
            )}
          >
            {value ? formatDisplay(value) : placeholder}
          </span>
        </div>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground/70" />
      </PopoverTrigger>

      <PopoverContent align="start" className="w-80 rounded-2xl p-3 shadow-xl">
        <div className="space-y-3">
          {/* Header tabs */}
          <div className="flex items-center justify-between border-b pb-2">
            <div className="flex gap-1">
              <button
                type="button"
                onClick={() => setActiveTab("presets")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                  activeTab === "presets"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Quick Slots
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("custom")}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-semibold transition-colors",
                  activeTab === "custom"
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Custom Time
              </button>
            </div>
            {value && (
              <span className="text-[11px] font-medium text-muted-foreground">
                Current: {formatDisplay(value)}
              </span>
            )}
          </div>

          {/* Quick Presets Tab */}
          {activeTab === "presets" ? (
            <div className="space-y-2">
              <p className="text-[11px] font-medium text-muted-foreground">
                Popular meeting hours:
              </p>
              <div className="grid max-h-48 grid-cols-4 gap-1.5 overflow-y-auto pr-1">
                {COMMON_PRESETS.map((preset) => {
                  const isSelected = value === preset
                  return (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className={cn(
                        "rounded-lg border px-2 py-1.5 text-center text-xs font-medium transition-all",
                        isSelected
                          ? "border-emerald-500 bg-emerald-500/15 font-semibold text-emerald-700 dark:text-emerald-300"
                          : "border-border hover:border-primary/40 hover:bg-muted"
                      )}
                    >
                      {formatDisplay(preset)}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : (
            /* Custom Time Selector Tab */
            <div className="space-y-3 pt-1">
              <div className="grid grid-cols-3 gap-2 text-center">
                {/* Hours column */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Hour
                  </span>
                  <div className="grid max-h-36 grid-cols-2 gap-1 overflow-y-auto pr-0.5">
                    {hours.map((h) => (
                      <button
                        key={h}
                        type="button"
                        onClick={() => setSelectedHour(h)}
                        className={cn(
                          "rounded-md py-1 text-xs font-medium transition-colors",
                          selectedHour === h
                            ? "bg-primary font-semibold text-primary-foreground"
                            : "bg-muted/40 text-foreground hover:bg-muted"
                        )}
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Minutes column */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Minute
                  </span>
                  <div className="space-y-1">
                    {minutes.map((m) => (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedMinute(m)}
                        className={cn(
                          "w-full rounded-md py-1 text-xs font-medium transition-colors",
                          selectedMinute === m
                            ? "bg-primary font-semibold text-primary-foreground"
                            : "bg-muted/40 text-foreground hover:bg-muted"
                        )}
                      >
                        :{String(m).padStart(2, "0")}
                      </button>
                    ))}
                  </div>
                </div>

                {/* AM / PM column */}
                <div className="space-y-1">
                  <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                    Period
                  </span>
                  <div className="space-y-1">
                    {(["AM", "PM"] as const).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setSelectedPeriod(p)}
                        className={cn(
                          "w-full rounded-md py-2 text-xs font-semibold transition-colors",
                          selectedPeriod === p
                            ? "bg-primary text-primary-foreground shadow-xs"
                            : "bg-muted/40 text-foreground hover:bg-muted"
                        )}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Set time button */}
              <Button
                type="button"
                size="sm"
                onClick={handleApplyCustom}
                className="w-full rounded-xl"
              >
                <Check className="mr-1.5 size-3.5" />
                Select {selectedHour}:{String(selectedMinute).padStart(2, "0")}{" "}
                {selectedPeriod}
              </Button>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
