import type { Metadata } from "next"
import Image from "next/image"
import Link from "next/link"

export const metadata: Metadata = {
  title: "404 — Page Not Found",
}

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-6">
        <Image
          src="/logo.svg"
          alt="SU Logo"
          width={48}
          height={62}
          priority
          className="opacity-40"
        />

        <div className="space-y-2">
          <p className="text-8xl font-bold tracking-tighter text-muted-foreground/30">
            404
          </p>
          <h1 className="text-xl font-semibold tracking-tight">
            Page not found
          </h1>
          <p className="text-sm text-muted-foreground">
            The page you are looking for does not exist or you do not have
            permission to view it.
          </p>
        </div>

        <Link
          href="/"
          className="inline-flex h-9 items-center justify-center rounded-4xl bg-primary px-5 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90"
        >
          Go to home
        </Link>
      </div>
    </main>
  )
}
