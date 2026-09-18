export default function AdminLoading() {
  return (
    <div className="flex min-h-svh w-full bg-background">
      {/* Fake sidebar container for desktop layout symmetry */}
      <div className="hidden w-64 border-r border-border/80 bg-sidebar lg:block">
        <div className="flex h-14 items-center border-b border-sidebar-border px-5">
          <div className="h-5 w-28 animate-pulse rounded-md bg-muted/60" />
        </div>
        <div className="space-y-2 p-4">
          <div className="h-9 w-full animate-pulse rounded-xl bg-muted/50" />
          <div className="h-9 w-full animate-pulse rounded-xl bg-muted/40" />
          <div className="h-9 w-full animate-pulse rounded-xl bg-muted/30" />
        </div>
      </div>

      <div className="flex flex-1 flex-col">
        {/* Top Header Placeholder */}
        <header className="flex h-14 items-center justify-between border-b border-border/80 px-4 sm:px-6">
          <div className="h-4 w-32 animate-pulse rounded-md bg-muted/60" />
          <div className="flex items-center gap-2">
            <div className="size-8 animate-pulse rounded-full bg-muted/60" />
            <div className="size-8 animate-pulse rounded-full bg-muted/60" />
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
            <div className="inline-flex items-center gap-1 self-start rounded-xl border border-border/80 bg-muted/60 p-1 sm:self-auto">
              <span className="rounded-lg bg-background px-3 py-1.5 text-xs font-semibold shadow-xs">
                Analytics
              </span>
              <span className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                Schedule
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
                <div className="h-3 w-16 animate-pulse rounded-md bg-muted/60" />
                <div className="h-7 w-20 animate-pulse rounded-md bg-muted/70" />
              </div>
            ))}
          </div>

          {/* Matrix Card Shell */}
          <div className="mt-6 flex min-h-[300px] flex-col items-center justify-center rounded-3xl border border-border/70 bg-card p-8 shadow-2xs">
            <div className="size-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            <p className="mt-3 text-xs font-medium text-muted-foreground">
              Synchronizing heatmap matrix...
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
