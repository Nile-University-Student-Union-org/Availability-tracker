import { Skeleton } from "@/components/ui/skeleton";

export default function AdminLoading() {
  return (
    <div className="flex min-h-svh w-full bg-background">
      {/* Fake sidebar container for desktop layout symmetry */}
      <div className="hidden w-64 border-r border-border/80 bg-sidebar lg:block">
        <div className="flex h-14 items-center border-b border-sidebar-border px-5">
          <Skeleton className="h-5 w-28 rounded-full" />
        </div>
        <div className="space-y-2 p-4">
          <Skeleton className="h-9 w-full rounded-full" />
          <Skeleton className="h-9 w-full rounded-full" />
          <Skeleton className="h-9 w-full rounded-full" />
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {/* Top Header Placeholder */}
        <header className="flex h-14 items-center justify-between border-b border-border/80 px-4 sm:px-6">
          <Skeleton className="h-4 w-32 rounded-full" />
          <div className="flex items-center gap-2">
            <Skeleton className="size-8 rounded-full" />
            <Skeleton className="size-8 rounded-full" />
          </div>
        </header>

        {/* Main Content Area */}
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
          {/* Header Banner */}
          <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
            <div>
              <p className="mb-1.5 text-[11px] font-semibold tracking-[0.25em] text-primary uppercase">
                NUSU Administration
              </p>
              <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Availability Analytics
              </h1>
              <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                Loading schedule analytics and member bookings...
              </p>
            </div>

            {/* Navigation Tabs Pill Switcher Placeholder */}
            <div className="inline-flex items-center gap-1 self-start rounded-full glass p-1 sm:self-auto">
              <span className="glass-lens rounded-full px-3 py-1.5 text-xs font-semibold text-(--glass-nile-fg)">
                Analytics
              </span>
              <span className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                Polls
              </span>
              <span className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                Admins
              </span>
            </div>
          </div>

          {/* Metric Cards Shell */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div
                key={i}
                className="flex h-24 flex-col justify-between rounded-3xl border border-border/70 bg-card p-4 shadow-2xs"
              >
                <Skeleton className="h-3 w-16 rounded-full" />
                <Skeleton className="h-7 w-20 rounded-md" />
              </div>
            ))}
          </div>

          {/* Matrix Card Shell */}
          <div
            aria-busy="true"
            className="mt-6 flex min-h-[300px] flex-col justify-between rounded-3xl border border-border/70 bg-card p-6 shadow-2xs"
          >
            <div className="flex items-center justify-between pb-4 border-b border-border/50">
              <Skeleton className="h-5 w-40 rounded-full" />
              <div className="flex gap-2">
                <Skeleton className="h-8 w-20 rounded-full" />
                <Skeleton className="h-8 w-24 rounded-full" />
              </div>
            </div>
            <div className="space-y-3 py-4">
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-10 w-full rounded-2xl" />
              <Skeleton className="h-10 w-full rounded-2xl" />
            </div>
            <div className="flex items-center justify-between pt-2">
              <Skeleton className="h-4 w-32 rounded-full" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
