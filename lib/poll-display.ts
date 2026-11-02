import { DAY_OF_WEEK_MAP } from "@/lib/weekly-slots";

export type PollType = "date" | "weekly";

export const POLL_TYPE_LABEL: Record<PollType, string> = {
  date: "Specific dates",
  weekly: "Semester timetable",
};

const dayShort = (day: number) =>
  DAY_OF_WEEK_MAP.find((d) => d.day === day)?.short ?? "";

function formatDay(iso: string) {
  return new Date(`${iso.slice(0, 10)}T00:00:00Z`).toLocaleDateString(
    "en-GB",
    { day: "numeric", month: "short", timeZone: "UTC" },
  );
}

/** One line describing when a poll runs */
export function pollSummary(poll: {
  type: PollType;
  startDate: string | null;
  endDate: string | null;
  weeklyDays: number[];
}) {
  if (poll.type === "date") {
    if (!poll.startDate || !poll.endDate) return "No dates set";
    const start = formatDay(poll.startDate);
    const end = formatDay(poll.endDate);
    return start === end ? start : `${start} – ${end}`;
  }
  const days = [...poll.weeklyDays].sort((a, b) => a - b).map(dayShort);
  return days.length ? days.join(" · ") : "No days set";
}
