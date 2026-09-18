/**
 * Zero-dependency calendar and CSV export utilities.
 * Supports RFC 5545 iCalendar (.ics) generation, Google Calendar web links,
 * and UTF-8 encoded CSV spreadsheets for student and admin workflows.
 */

export interface CalendarEvent {
  id?: string;
  title: string;
  description?: string;
  location?: string;
  startDate: Date;
  endDate: Date;
}

function formatIcsDate(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

/**
 * Converts a date string ("YYYY-MM-DD") and time ("HH:mm") into Date objects.
 * Defaults to 60-minute duration.
 */
export function slotToDateRange(
  dateStr: string,
  startTime: string,
  durationMinutes = 60,
): { startDate: Date; endDate: Date } {
  const [h, m] = startTime.split(":").map(Number);
  const [year, month, day] = dateStr.split("-").map(Number);
  const startDate = new Date(year, month - 1, day, h, m, 0);
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);
  return { startDate, endDate };
}

/**
 * Generates an RFC 5545 compliant VCALENDAR string.
 */
export function generateIcsContent(events: CalendarEvent[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Nile University Student Union//Availability Tracker//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  const now = formatIcsDate(new Date());

  for (const event of events) {
    const uid = event.id
      ? `${event.id}@nu.edu.eg`
      : `${Date.now()}-${Math.random().toString(36).slice(2)}@nu.edu.eg`;

    lines.push(
      "BEGIN:VEVENT",
      `UID:${uid}`,
      `DTSTAMP:${now}`,
      `DTSTART:${formatIcsDate(event.startDate)}`,
      `DTEND:${formatIcsDate(event.endDate)}`,
      `SUMMARY:${escapeIcsText(event.title)}`,
      event.description
        ? `DESCRIPTION:${escapeIcsText(event.description)}`
        : "",
      event.location
        ? `LOCATION:${escapeIcsText(event.location)}`
        : "LOCATION:Nile University Campus",
      "STATUS:CONFIRMED",
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n");
}

/**
 * Triggers a browser download of an .ics calendar file.
 */
export function downloadIcsFile(
  filename: string,
  events: CalendarEvent[],
): void {
  if (typeof window === "undefined" || events.length === 0) return;

  const content = generateIcsContent(events);
  const blob = new Blob([content], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".ics") ? filename : `${filename}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Builds a direct Google Calendar web intent link.
 */
export function buildGoogleCalendarUrl(event: CalendarEvent): string {
  const start = formatIcsDate(event.startDate);
  const end = formatIcsDate(event.endDate);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${start}/${end}`,
    details: event.description || "",
    location: event.location || "Nile University Campus",
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

/**
 * Escapes a cell for CSV formatting, handling quotes, commas, and newlines.
 */
export function escapeCsvCell(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (
    str.includes(",") ||
    str.includes('"') ||
    str.includes("\n") ||
    str.includes("\r")
  ) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Triggers a browser download of a CSV file with UTF-8 BOM for Excel compatibility.
 */
export function downloadCsvFile(filename: string, csvContent: string): void {
  if (typeof window === "undefined") return;

  const blob = new Blob(["\uFEFF" + csvContent], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
