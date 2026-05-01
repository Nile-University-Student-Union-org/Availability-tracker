"use client"

import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { authClient } from "@/lib/auth-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { HugeiconsIcon } from "@hugeicons/react"
import { Logout02Icon } from "@hugeicons/core-free-icons"
import { ThemeToggle } from "@/components/theme-toggle"

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return email?.slice(0, 2).toUpperCase() ?? "?"
}

export function Navbar() {
  const router = useRouter()
  const { data: session } = authClient.useSession()

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/auth") },
    })
  }

  return (
    <header className="fixed top-0 z-50 w-full border-b bg-background/80 backdrop-blur">
      <nav className="container mx-auto flex h-14 items-center justify-between px-4">
        <Link href="/" className="flex items-center">
          <Image
            src="/logo.svg"
            alt="SU Logo"
            width={40}
            height={52}
            priority
          />
        </Link>

        <div className="flex items-center gap-1">
          <ThemeToggle />

          {session ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="cursor-pointer rounded-full ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <Avatar>
                  <AvatarImage
                    src={session.user.image ?? undefined}
                    referrerPolicy="no-referrer"
                  />
                  <AvatarFallback>
                    {getInitials(session.user.name, session.user.email)}
                  </AvatarFallback>
                </Avatar>
              </DropdownMenuTrigger>

              <DropdownMenuContent align="end">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>
                    <p className="font-medium">{session.user.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {session.user.email}
                    </p>
                  </DropdownMenuLabel>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} variant="destructive">
                  <HugeiconsIcon icon={Logout02Icon} />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Link
              href="/auth"
              className="inline-flex h-8 items-center rounded-md border border-input bg-background px-3 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground"
            >
              Admin sign in
            </Link>
          )}
        </div>
      </nav>
    </header>
  )
}
