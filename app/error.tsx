"use client"

import * as React from "react"
import Link from "next/link"
import { NusuLogo } from "@/components/nusu-logo"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { RefreshIcon, Home01Icon } from "@hugeicons/core-free-icons"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  React.useEffect(() => {
    console.error("Application error:", error)
  }, [error])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center bg-background px-6 text-center">
      <div className="relative flex w-full max-w-md flex-col items-center gap-6 rounded-3xl border bg-card/80 p-8 shadow-sm backdrop-blur-xs">
        <NusuLogo size="default" />

        <div className="space-y-2">
          <h1 className="font-heading text-xl font-bold tracking-tight text-foreground sm:text-2xl">
            Something went wrong
          </h1>
          <p className="text-xs text-muted-foreground sm:text-sm">
            An unexpected error occurred while loading this page. Our team has
            been notified.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2.5 sm:flex-row">
          <Button
            onClick={() => reset()}
            className="flex-1 rounded-xl"
            variant="default"
          >
            <HugeiconsIcon icon={RefreshIcon} className="mr-1.5 size-4" />
            Try again
          </Button>

          <Button
            render={<Link href="/" />}
            variant="outline"
            className="flex-1 rounded-xl"
          >
            <HugeiconsIcon icon={Home01Icon} className="mr-1.5 size-4" />
            Return Home
          </Button>
        </div>
      </div>
    </div>
  )
}
