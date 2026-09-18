"use client";

import * as React from "react";
import {
  DayPicker,
  getDefaultClassNames,
  type DayButton,
  type Locale,
} from "react-day-picker";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowDownIcon,
} from "@hugeicons/core-free-icons";

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = "label",
  locale,
  formatters,
  components,
  ...props
}: React.ComponentProps<typeof DayPicker>) {
  const defaultClassNames = getDefaultClassNames();

  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        "group/calendar bg-background p-3 [--cell-radius:var(--radius-4xl)] [--cell-size:--spacing(8)] in-data-[slot=card-content]:bg-transparent in-data-[slot=popover-content]:bg-transparent",
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className,
      )}
      captionLayout={captionLayout}
      locale={locale}
      formatters={{
        formatMonthDropdown: (date) =>
          date.toLocaleString(locale?.code, { month: "short" }),
        ...formatters,
      }}
      classNames={{
        root: cn(defaultClassNames.root),
        months: cn(
          "relative flex flex-col gap-4 md:flex-row justify-center",
          defaultClassNames.months,
        ),
        month: cn("flex w-full flex-col gap-3", defaultClassNames.month),
        nav: cn(
          "absolute inset-x-0 top-0 flex w-full items-center justify-between pointer-events-none px-1",
          defaultClassNames.nav,
        ),
        button_previous: cn(
          "pointer-events-auto size-8 rounded-full bg-muted/50 hover:bg-muted text-foreground transition-all duration-150 active:scale-90 flex items-center justify-center cursor-pointer border border-border/40 shadow-2xs",
          defaultClassNames.button_previous,
        ),
        button_next: cn(
          "pointer-events-auto size-8 rounded-full bg-muted/50 hover:bg-muted text-foreground transition-all duration-150 active:scale-90 flex items-center justify-center cursor-pointer border border-border/40 shadow-2xs",
          defaultClassNames.button_next,
        ),
        month_caption: cn(
          "flex h-8 w-full items-center justify-center font-heading text-sm font-bold tracking-tight text-foreground select-none",
          defaultClassNames.month_caption,
        ),
        dropdowns: cn(
          "flex h-(--cell-size) w-full items-center justify-center gap-1.5 text-sm font-medium",
          defaultClassNames.dropdowns,
        ),
        dropdown_root: cn(
          "relative rounded-(--cell-radius)",
          defaultClassNames.dropdown_root,
        ),
        dropdown: cn(
          "absolute inset-0 bg-popover opacity-0",
          defaultClassNames.dropdown,
        ),
        caption_label: cn(
          "font-heading text-sm font-bold tracking-tight select-none",
          captionLayout === "label"
            ? "text-sm"
            : "flex items-center gap-1 rounded-(--cell-radius) text-sm [&>svg]:size-3.5 [&>svg]:text-muted-foreground",
          defaultClassNames.caption_label,
        ),
        month_grid: cn("w-full flex flex-col", defaultClassNames.month_grid),
        weekdays: cn(
          "flex w-full border-b border-border/40 pb-1.5 mb-1 items-center",
          defaultClassNames.weekdays,
        ),
        weekday: cn(
          "flex-1 rounded-(--cell-radius) text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider select-none text-center",
          defaultClassNames.weekday,
        ),
        weeks: cn("w-full flex flex-col gap-1.5", defaultClassNames.weeks),
        week: cn("flex w-full items-center", defaultClassNames.week),
        week_number_header: cn(
          "w-(--cell-size) select-none",
          defaultClassNames.week_number_header,
        ),
        week_number: cn(
          "text-[0.8rem] text-muted-foreground select-none",
          defaultClassNames.week_number,
        ),
        day: cn(
          "group/day relative flex-1 h-10 sm:h-11 flex items-center justify-center rounded-(--cell-radius) p-0 text-center select-none",
          defaultClassNames.day,
        ),
        range_start: cn(
          "relative isolate z-0 bg-transparent [&:has([data-range-start=true][data-range-end=true])]:after:hidden after:absolute after:inset-y-1 after:right-0 after:w-1/2 after:bg-[#0F3056]/10 dark:after:bg-emerald-500/15 after:z-[-1]",
          defaultClassNames.range_start,
        ),
        range_middle: cn(
          "relative isolate z-0 bg-transparent after:absolute after:inset-y-1 after:inset-x-0 after:bg-[#0F3056]/10 dark:after:bg-emerald-500/15 first:after:rounded-l-full last:after:rounded-r-full after:z-[-1]",
          defaultClassNames.range_middle,
        ),
        range_end: cn(
          "relative isolate z-0 bg-transparent [&:has([data-range-start=true][data-range-end=true])]:after:hidden after:absolute after:inset-y-1 after:left-0 after:w-1/2 after:bg-[#0F3056]/10 dark:after:bg-emerald-500/15 after:z-[-1]",
          defaultClassNames.range_end,
        ),
        today: cn("font-semibold", defaultClassNames.today),
        outside: cn(
          "text-muted-foreground/35 aria-selected:text-muted-foreground/40",
          defaultClassNames.outside,
        ),
        disabled: cn(
          "text-muted-foreground/30 opacity-40 cursor-not-allowed pointer-events-none",
          defaultClassNames.disabled,
        ),
        hidden: cn("invisible", defaultClassNames.hidden),
        ...classNames,
      }}
      components={{
        Root: ({ className, rootRef, ...props }) => {
          return (
            <div
              data-slot="calendar"
              ref={rootRef}
              className={cn(className)}
              {...props}
            />
          );
        },
        Chevron: ({ className, orientation, ...props }) => {
          if (orientation === "left") {
            return (
              <HugeiconsIcon
                icon={ArrowLeftIcon}
                strokeWidth={2.25}
                className={cn("size-3.5", className)}
                {...props}
              />
            );
          }

          if (orientation === "right") {
            return (
              <HugeiconsIcon
                icon={ArrowRightIcon}
                strokeWidth={2.25}
                className={cn("size-3.5", className)}
                {...props}
              />
            );
          }

          return (
            <HugeiconsIcon
              icon={ArrowDownIcon}
              strokeWidth={2.25}
              className={cn("size-3.5", className)}
              {...props}
            />
          );
        },
        DayButton: ({ ...props }) => (
          <CalendarDayButton locale={locale} {...props} />
        ),
        WeekNumber: ({ children, ...props }) => {
          return (
            <td {...props}>
              <div className="flex size-(--cell-size) items-center justify-center text-center">
                {children}
              </div>
            </td>
          );
        },
        ...components,
      }}
      {...props}
    />
  );
}

function CalendarDayButton({
  className,
  day,
  modifiers,
  locale,
  ...props
}: React.ComponentProps<typeof DayButton> & { locale?: Partial<Locale> }) {
  const defaultClassNames = getDefaultClassNames();

  const ref = React.useRef<HTMLButtonElement>(null);
  React.useEffect(() => {
    if (modifiers.focused) ref.current?.focus();
  }, [modifiers.focused]);

  const isSelectedSingle = Boolean(
    modifiers.selected &&
    !modifiers.range_start &&
    !modifiers.range_end &&
    !modifiers.range_middle,
  );

  const isHasSlots = Boolean(
    (modifiers as Record<string, unknown>).hasSlots && !modifiers.selected,
  );

  const isToday = Boolean(
    modifiers.today && !modifiers.selected && !isHasSlots,
  );

  return (
    <Button
      variant="ghost"
      size="icon"
      data-day={day.date.toLocaleDateString(locale?.code)}
      data-selected-single={isSelectedSingle}
      data-has-slots={isHasSlots}
      data-today={isToday}
      data-range-start={modifiers.range_start}
      data-range-end={modifiers.range_end}
      data-range-middle={modifiers.range_middle}
      className={cn(
        "relative isolate z-10 flex size-9 sm:size-10 items-center justify-center p-0 border-0 leading-none font-medium text-xs rounded-full transition-colors duration-150 cursor-pointer select-none active:scale-90",
        "group-data-[focused=true]/day:relative group-data-[focused=true]/day:z-10 group-data-[focused=true]/day:ring-2 group-data-[focused=true]/day:ring-primary/40",
        "text-foreground hover:bg-[#0F3056]/10 hover:text-[#0F3056] dark:hover:bg-emerald-500/20 dark:hover:text-emerald-300 hover:ring-1 hover:ring-[#0F3056]/20 dark:hover:ring-emerald-400/25",
        "data-[today=true]:bg-muted/80 data-[today=true]:text-foreground data-[today=true]:font-semibold",
        "data-[has-slots=true]:bg-emerald-500/20 data-[has-slots=true]:text-emerald-700 dark:data-[has-slots=true]:text-emerald-400 data-[has-slots=true]:font-semibold data-[has-slots=true]:hover:bg-emerald-500/30",
        "data-[selected-single=true]:bg-[#0F3056] data-[selected-single=true]:text-white data-[selected-single=true]:font-bold data-[selected-single=true]:shadow-sm data-[selected-single=true]:ring-2 data-[selected-single=true]:ring-[#0F3056]/25 data-[selected-single=true]:hover:bg-[#0F3056]/90 dark:data-[selected-single=true]:bg-emerald-500 dark:data-[selected-single=true]:text-neutral-950 dark:data-[selected-single=true]:font-bold dark:data-[selected-single=true]:ring-emerald-400/35 dark:data-[selected-single=true]:shadow-emerald-950/40 dark:data-[selected-single=true]:hover:bg-emerald-400",
        "data-[range-start=true]:bg-[#0F3056] data-[range-start=true]:text-white data-[range-start=true]:font-bold data-[range-start=true]:shadow-sm data-[range-start=true]:ring-2 data-[range-start=true]:ring-[#0F3056]/25 data-[range-start=true]:hover:bg-[#0F3056]/90 dark:data-[range-start=true]:bg-emerald-500 dark:data-[range-start=true]:text-neutral-950 dark:data-[range-start=true]:font-bold dark:data-[range-start=true]:ring-emerald-400/35 dark:data-[range-start=true]:shadow-emerald-950/40 dark:data-[range-start=true]:hover:bg-emerald-400",
        "data-[range-end=true]:bg-[#0F3056] data-[range-end=true]:text-white data-[range-end=true]:font-bold data-[range-end=true]:shadow-sm data-[range-end=true]:ring-2 data-[range-end=true]:ring-[#0F3056]/25 data-[range-end=true]:hover:bg-[#0F3056]/90 dark:data-[range-end=true]:bg-emerald-500 dark:data-[range-end=true]:text-neutral-950 dark:data-[range-end=true]:font-bold dark:data-[range-end=true]:ring-emerald-400/35 dark:data-[range-end=true]:shadow-emerald-950/40 dark:data-[range-end=true]:hover:bg-emerald-400",
        "data-[range-middle=true]:rounded-full data-[range-middle=true]:bg-transparent data-[range-middle=true]:text-[#0F3056] dark:data-[range-middle=true]:text-emerald-300 data-[range-middle=true]:font-semibold data-[range-middle=true]:hover:bg-[#0F3056]/15 dark:data-[range-middle=true]:hover:bg-emerald-500/25 data-[range-middle=true]:hover:text-[#0F3056] dark:data-[range-middle=true]:hover:text-emerald-200",
        defaultClassNames.day_button,
        className,
      )}
      {...props}
    />
  );
}

export { Calendar, CalendarDayButton };
