import { Spinner } from "@/components/ui/spinner"
import { NusuLogo } from "@/components/nusu-logo"

export default function Loading() {
  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-4">
      <div className="flex flex-col items-center gap-4">
        <NusuLogo size="default" className="animate-pulse opacity-80" />
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Spinner className="size-4 text-primary" />
          <span>Loading Availability Tracker...</span>
        </div>
      </div>
    </div>
  )
}
