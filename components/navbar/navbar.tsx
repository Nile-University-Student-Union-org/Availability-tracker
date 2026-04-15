"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { authClient } from "@/lib/auth-client"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
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
import { Logout02Icon, Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons"

function getInitials(name?: string | null, email?: string | null): string {
  if (name) {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return email?.slice(0, 2).toUpperCase() ?? "?"
}

function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => setMounted(true), [])

  return (
    <Button
      variant="ghost"
      size="icon"
      className="rounded-full text-muted-foreground hover:text-foreground"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      aria-label="Toggle theme"
    >
      {mounted ? (
        <HugeiconsIcon
          icon={resolvedTheme === "dark" ? Sun03Icon : Moon02Icon}
          className="size-4.5"
          strokeWidth={1.5}
        />
      ) : (
        <span className="size-4.5" />
      )}
    </Button>
  )
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

          <DropdownMenu>
            <DropdownMenuTrigger className="cursor-pointer rounded-full ring-offset-background outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Avatar>
                <AvatarImage
                  src={session?.user.image ?? undefined}
                  referrerPolicy="no-referrer"
                />
                <AvatarFallback>
                  {getInitials(session?.user.name, session?.user.email)}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuLabel>
                  <p className="font-medium">{session?.user.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {session?.user.email}
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
        </div>
      </nav>
    </header>
  )
}
