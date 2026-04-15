export const WEEK_DATES = [
  "2026-04-19",
  "2026-04-20",
  "2026-04-21",
  "2026-04-22",
  "2026-04-23",
] as const;

export type WeekDate = (typeof WEEK_DATES)[number];

// Parsed as local midnight to avoid UTC offset shifting the calendar date
export const ACTIVE_DATES = WEEK_DATES.map((d) => new Date(d + "T00:00:00"));

export const TIME_SLOTS = [
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
] as const;

export type TimeSlot = (typeof TIME_SLOTS)[number];

export const TIME_SLOT_LABELS: Record<TimeSlot, string> = {
  "08:30": "8:30 AM",
  "09:30": "9:30 AM",
  "10:30": "10:30 AM",
  "11:30": "11:30 AM",
  "12:30": "12:30 PM",
  "13:30": "1:30 PM",
  "14:30": "2:30 PM",
  "15:30": "3:30 PM",
  "16:30": "4:30 PM",
  "17:30": "5:30 PM",
};
