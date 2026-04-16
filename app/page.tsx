import type { Metadata } from "next"
import { AvailabilityCalendar } from "@/components/calendar/availability-calendar";
import { Navbar } from "@/components/navbar/navbar";

export const metadata: Metadata = {
  title: "Mark Availability",
};

export default function Page() {
  return (
    <div className="min-h-svh bg-background">
      <Navbar />
      <main className="container mx-auto flex max-w-lg flex-col items-center gap-6 px-4 pt-22 pb-8">
        <div className="text-center">
          <h1 className="font-heading text-2xl font-semibold tracking-tight">
            Mark Your Availability
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Click a highlighted day to set your free slots.
          </p>
        </div>
        <AvailabilityCalendar />
      </main>
    </div>
  );
}
