import type { Metadata } from "next";
import Link from "next/link";
import { NusuLogo } from "@/components/nusu-logo";

export const metadata: Metadata = {
  title: "404 — Page Not Found",
};

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex max-w-sm flex-col items-center gap-6">
        <NusuLogo
          size="default"
          href="/"
          className="opacity-75 transition-opacity hover:opacity-100"
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
          className="inline-flex h-11 min-h-[44px] items-center justify-center rounded-2xl bg-primary px-6 text-sm font-semibold text-primary-foreground shadow-xs transition-transform touch-manipulation active:scale-[0.98] hover:opacity-90"
        >
          Go to home
        </Link>
      </div>
    </main>
  );
}
