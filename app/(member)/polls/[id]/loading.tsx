import { Skeleton } from "@/components/ui/skeleton";

export default function PollLoading() {
  return (
    <main
      aria-busy="true"
      aria-label="Loading poll"
      className="container mx-auto flex max-w-xl flex-col items-center gap-6 px-4 pt-28 pb-16"
    >
      {/* Header matching poll page (icon + title) */}
      <div className="flex flex-col items-center gap-3">
        <Skeleton className="size-11 rounded-full" />
        <Skeleton className="h-8 w-56 rounded-xl" />
      </div>

      {/* ~4 slot cards: h-14 (56px) rounded-2xl */}
      <div className="flex w-full flex-col gap-2">
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
        <Skeleton className="h-14 w-full rounded-2xl" />
      </div>
    </main>
  );
}
