// ─── Helpers ──────────────────────────────────────────────────────────────────

export function formatTime(time: string): string {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${suffix}`;
}

export function formatDayShort(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
}

export function formatDayFull(date: string): string {
  const d = new Date(date + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

export function getInitials(
  name?: string | null,
  email?: string | null,
): string {
  if (name) {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return email?.slice(0, 2).toUpperCase() ?? "?";
}

/** Returns Tailwind classes for a heatmap cell based on its fill ratio. */
export function cellStyle(count: number, max: number): string {
  if (count === 0) return "bg-muted/50 text-muted-foreground/30";
  const ratio = count / Math.max(max, 1);
  if (ratio <= 0.25)
    return "bg-emerald-500/20 text-emerald-700 dark:text-emerald-400";
  if (ratio <= 0.5)
    return "bg-emerald-500/40 text-emerald-800 dark:text-emerald-300";
  if (ratio <= 0.75)
    return "bg-emerald-500/65 text-emerald-900 dark:text-white";
  return "bg-emerald-600 text-white";
}
