import { redirect } from "next/navigation";
import { getCachedSession } from "@/lib/session";
import { getScheduleConfig } from "@/lib/schedule";

export const dynamic = "force-dynamic";

export default async function RootDispatcherPage() {
  let session = null;
  let config = null;

  try {
    [session, config] = await Promise.all([
      getCachedSession(),
      getScheduleConfig(),
    ]);
  } catch (err: unknown) {
    const error = err as { digest?: string };
    if (
      error?.digest?.startsWith("NEXT_REDIRECT") ||
      error?.digest === "DYNAMIC_SERVER_USAGE"
    ) {
      throw err;
    }
    console.error("Session lookup failed on /:", err);
    redirect("/auth?mode=signin&callbackUrl=/");
  }

  if (!session) {
    redirect("/auth?mode=signin&callbackUrl=/");
  }

  // admin@nu.edu.eg is restricted strictly to the Admin Panel
  if (session.user.email === "admin@nu.edu.eg") {
    redirect("/admin");
  }
  const isDateActive = config?.dateScheduleActive ?? true;
  const isWeeklyActive = config?.weeklyScheduleActive ?? true;

  // Smart routing: prefer Specific Date if active, otherwise Semester Availability
  if (isDateActive) {
    redirect("/specific");
  } else if (isWeeklyActive) {
    redirect("/weekly");
  } else {
    // Both inactive: route to /specific to render the closed submissions notice
    redirect("/specific");
  }
}
