export type WeeklySlot = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
};

export const DAY_OF_WEEK_MAP = [
  { day: 0, label: "Sunday", short: "Sun" },
  { day: 1, label: "Monday", short: "Mon" },
  { day: 2, label: "Tuesday", short: "Tue" },
  { day: 3, label: "Wednesday", short: "Wed" },
  { day: 4, label: "Thursday", short: "Thu" },
  { day: 5, label: "Friday", short: "Fri" },
  { day: 6, label: "Saturday", short: "Sat" },
] as const;

export function toMinutes(time: string): number {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

export function fromMinutes(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

export function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return (
    [hours ? `${hours}h` : "", remainder ? `${remainder}m` : ""]
      .filter(Boolean)
      .join(" ") || "0m"
  );
}

export function formatTimeSlot(time: string): string {
  const [h, m] = time.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

const TIME_PATTERN = /^(?:[01]\d|2[0-3]):[0-5]\d$/;

export function generateSlots(
  dayOfWeek: number,
  from: string,
  to: string,
  lengthMin: number,
  breakMin = 0,
): WeeklySlot[] {
  if (
    !TIME_PATTERN.test(from) ||
    !TIME_PATTERN.test(to) ||
    !Number.isInteger(lengthMin) ||
    lengthMin < 5 ||
    !Number.isInteger(breakMin) ||
    breakMin < 0
  )
    return [];
  const slots: WeeklySlot[] = [];
  for (
    let start = toMinutes(from);
    start + lengthMin <= toMinutes(to);
    start += lengthMin + breakMin
  ) {
    slots.push({
      dayOfWeek,
      startTime: fromMinutes(start),
      endTime: fromMinutes(start + lengthMin),
    });
  }
  return slots;
}

export function sortSlots(slots: WeeklySlot[]): WeeklySlot[] {
  return [...slots].sort(
    (a, b) =>
      a.dayOfWeek - b.dayOfWeek || a.startTime.localeCompare(b.startTime),
  );
}

export function validateWeeklySlots(
  days: number[],
  slots: WeeklySlot[],
): string | null {
  if (!Array.isArray(days) || days.length === 0)
    return "Choose at least one open day.";
  if (
    days.some((day) => !Number.isInteger(day) || day < 0 || day > 6) ||
    new Set(days).size !== days.length
  ) {
    return "Open days must be unique days from Sunday to Saturday.";
  }
  if (!Array.isArray(slots)) return "Weekly slots must be a list.";
  for (const slot of slots) {
    const label =
      DAY_OF_WEEK_MAP[slot?.dayOfWeek]?.label ?? `Day ${slot?.dayOfWeek}`;
    if (!slot || !days.includes(slot.dayOfWeek))
      return `${label} is not an open day.`;
    if (!TIME_PATTERN.test(slot.startTime) || !TIME_PATTERN.test(slot.endTime))
      return `${label}: use valid HH:mm start and end times.`;
    if (toMinutes(slot.endTime) <= toMinutes(slot.startTime))
      return `${label}: end time must be after start time (no crossing midnight).`;
    if (toMinutes(slot.endTime) - toMinutes(slot.startTime) < 5)
      return `${label}: slots must be at least 5 minutes long.`;
  }
  for (const day of days) {
    const label = DAY_OF_WEEK_MAP[day].label;
    const daySlots = sortSlots(slots.filter((slot) => slot.dayOfWeek === day));
    if (daySlots.length === 0) return `${label}: add at least one slot.`;
    if (daySlots.length > 96) return `${label}: use at most 96 slots.`;
    for (let i = 1; i < daySlots.length; i++) {
      if (daySlots[i].startTime < daySlots[i - 1].endTime)
        return `${label}: slots must not overlap or have duplicate start times.`;
    }
  }
  return null;
}

export function legacyWeeklySchedule(
  includeSaturday = false,
  timeSlots: string[] = [],
) {
  const weeklyDays = includeSaturday ? [0, 1, 2, 3, 4, 6] : [0, 1, 2, 3, 4];
  const starts = timeSlots.length
    ? timeSlots
    : Array.from({ length: 9 }, (_, i) => fromMinutes(510 + i * 60));
  return {
    weeklyDays,
    weeklySlots: weeklyDays.flatMap((dayOfWeek) =>
      starts.map((startTime) => ({
        dayOfWeek,
        startTime,
        endTime: fromMinutes((toMinutes(startTime) + 60) % 1440),
      })),
    ),
  };
}
