"use client"

import * as React from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  Calendar03Icon,
  Clock01Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons"
import { Lock } from "lucide-react"
import { ScheduleModeTabs } from "@/components/schedule-mode-tabs"

interface ScheduleInactiveNoticeProps {
  currentMode: "specific" | "weekly"
  dateScheduleActive?: boolean
  weeklyScheduleActive?: boolean
}

export function ScheduleInactiveNotice({
  currentMode,
  dateScheduleActive = false,
  weeklyScheduleActive = false,
}: ScheduleInactiveNoticeProps) {
  const isSpecific = currentMode === "specific"
  const title = isSpecific
    ? "Specific Date Submissions Closed"
    : "Semester Availability Submissions Closed"

  const description = isSpecific
    ? "The Nile University Student Union is not currently collecting inputs for specific date polls."
    : "The Nile University Student Union is not currently collecting inputs for semester recurring availability."

  const alternativeActive = isSpecific ? weeklyScheduleActive : dateScheduleActive
  const alternativeHref = isSpecific ? "/weekly" : "/specific"
  const alternativeLabel = isSpecific ? "Semester Availability" : "Specific Date"
  const AlternativeIcon = isSpecific ? Clock01Icon : Calendar03Icon

  const bothClosed = !dateScheduleActive && !weeklyScheduleActive

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-6">
      <ScheduleModeTabs
        dateScheduleActive={dateScheduleActive}
        weeklyScheduleActive={weeklyScheduleActive}
      />

      <div className="w-full rounded-3xl border border-border/70 bg-card/70 p-8 text-center shadow-lg backdrop-blur-xl sm:p-10">
        <div className="mx-auto mb-4 flex size-14 items-center justify-center rounded-2xl bg-amber-500/10 text-amber-500 ring-1 ring-amber-500/20">
          <Lock className="size-7" />
        </div>

        <Badge
          variant="outline"
          className="mb-3 border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-600 dark:text-amber-400"
        >
          Option Inactive
        </Badge>

        <h2 className="font-heading text-xl font-bold tracking-tight sm:text-2xl">
          {bothClosed ? "All Availability Polls Closed" : title}
        </h2>

        <p className="mx-auto mt-2 max-w-md text-xs leading-relaxed text-muted-foreground sm:text-sm">
          {bothClosed
            ? "The Student Union is not accepting availability responses for either Specific Date polls or Semester Availability at this time. Please check back later or reach out to your committee lead."
            : description}
        </p>

        {alternativeActive && (
          <div className="mt-8 flex flex-col items-center gap-3 pt-4 border-t border-border/60">
            <span className="text-xs text-muted-foreground">
              Looking to submit your availability?
            </span>
            <Link
              href={alternativeHref}
              className="w-full sm:w-auto min-h-[48px] px-6 py-2.5 inline-flex items-center justify-center gap-2 rounded-xl bg-[#0F3056] text-white hover:bg-[#0F3056]/90 shadow-md font-semibold dark:bg-primary dark:text-primary-foreground dark:hover:bg-primary/90 transition-all select-none cursor-pointer active:scale-[0.98]"
            >
              <HugeiconsIcon icon={AlternativeIcon} size={18} />
              <span>Go to {alternativeLabel}</span>
              <HugeiconsIcon icon={ArrowRight01Icon} size={16} />
            </Link>
          </div>
        )}
      </div>
    </div>
  )
}
