"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons"

export function ThemeToggle() {
  const [mounted, setMounted] = useState(true)
  const { resolvedTheme, setTheme } = useTheme()
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
