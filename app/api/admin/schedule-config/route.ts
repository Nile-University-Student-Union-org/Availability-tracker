import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isAdminEmail, isSuperAdmin } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { validateWeeklySlots, sortSlots, type WeeklySlot } from "@/lib/weekly-slots";
export const dynamic = "force-dynamic";
export async function PUT(request: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session || !(await isAdminEmail(session.user.email))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!isSuperAdmin(session.user.email)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  try {
    const b = await request.json();
    const start = new Date(`${b.startDate}T00:00:00.000Z`), end = new Date(`${b.endDate}T00:00:00.000Z`);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
    if (!["fixed", "free"].includes(b.slotMode)) return NextResponse.json({ error: "Invalid slot mode" }, { status: 400 });
    if (!Array.isArray(b.weeklyDays) || !Array.isArray(b.weeklySlots)) return NextResponse.json({ error: "Provide open days and weekly slots." }, { status: 400 });
    const timeSlots: string[] = Array.isArray(b.timeSlots) ? Array.from(new Set<string>((b.timeSlots as unknown[]).filter((s): s is string => typeof s === "string" && /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(s)))) : [];
    const dateActive = b.dateScheduleActive ?? true, weeklyActive = b.weeklyScheduleActive ?? true;
    const weeklySlots: WeeklySlot[] = b.weeklySlots.filter((s: WeeklySlot) => b.weeklyDays.includes(s.dayOfWeek));
    const error = weeklyActive ? validateWeeklySlots(b.weeklyDays, weeklySlots) : null;
    if (error) return NextResponse.json({ error }, { status: 400 });
    await prisma.$transaction(async tx => {
      await tx.poll.update({ where: { id: "legacy-date" }, data: { name: b.dateScheduleTitle?.trim() || "Specific Date Availability", active: dateActive, startDate: start, endDate: end, slotMode: b.slotMode } });
      await tx.poll.update({ where: { id: "legacy-weekly" }, data: { name: b.weeklyScheduleTitle?.trim() || "Semester Availability", active: weeklyActive, weeklyDays: [...b.weeklyDays].sort((a: number,b: number) => a-b) } });
      await tx.pollTimeSlot.deleteMany({ where: { pollId: "legacy-date" } });
      if (timeSlots.length) await tx.pollTimeSlot.createMany({ data: timeSlots.map(startTime => ({ pollId: "legacy-date", startTime })) });
      await tx.pollWeeklySlot.deleteMany({ where: { pollId: "legacy-weekly" } });
      if (weeklyActive) await tx.pollWeeklySlot.createMany({ data: sortSlots(weeklySlots).map(slot => ({ pollId: "legacy-weekly", ...slot })) });
      await tx.availability.deleteMany({ where: { pollId: "legacy-date", OR: [{ date: { lt: start } }, { date: { gt: end } }], ...(b.slotMode === "fixed" ? { startTime: { notIn: timeSlots } } : {}) } });
      if (weeklyActive) await tx.recurringAvailability.deleteMany({ where: { pollId: "legacy-weekly", NOT: { OR: weeklySlots.map(({ dayOfWeek, startTime }) => ({ dayOfWeek, startTime })) } } });
    });
    revalidatePath("/admin"); revalidatePath("/polls");
    return NextResponse.json({ success: true });
  } catch (e) {
    console.error("PUT /api/admin/schedule-config failed:", e);
    return NextResponse.json({ error: "Failed to update legacy polls" }, { status: 500 });
  }
}
