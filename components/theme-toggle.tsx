"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"
import { HugeiconsIcon } from "@hugeicons/react"
import { Moon02Icon, Sun03Icon } from "@hugeicons/core-free-icons"
import { executeThemeTransition } from "@/components/theme-beam"
import { cn } from "@/lib/utils"

export function ThemeToggle() {
  const [mounted, setMounted] = useState(false)
  const [isToggling, setIsToggling] = useState(false)
  const { resolvedTheme, setTheme } = useTheme()

  useEffect(() => {
    setMounted(true)
  }, [])

  function handleToggle() {
    const nextTheme = resolvedTheme === "dark" ? "light" : "dark"

    setIsToggling(true)
    setTimeout(() => setIsToggling(false), 440)

    executeThemeTransition(nextTheme, setTheme)
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className={cn(
        "relative size-9 cursor-pointer rounded-full text-muted-foreground transition-all duration-300 hover:text-foreground touch-manipulation select-none",
        "focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2",
        "active:scale-90",
        isToggling &&
          "ring-4 ring-emerald-500/25 ring-offset-2 ring-offset-background"
      )}
      onClick={handleToggle}
      aria-label="Toggle theme with light beam"
      title={
        mounted
          ? `Switch to ${resolvedTheme === "dark" ? "Light" : "Dark"} Mode`
          : "Toggle theme"
      }
    >
      {mounted ? (
        <div className="relative flex size-4.5 items-center justify-center overflow-hidden">
          {/* Sun icon (visible in dark mode) */}
          <HugeiconsIcon
            icon={Sun03Icon}
            className={cn(
              "size-4.5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              resolvedTheme === "dark"
                ? "scale-100 rotate-0 text-amber-400 opacity-100"
                : "absolute scale-0 -rotate-90 opacity-0"
            )}
            strokeWidth={1.75}
          />
          {/* Moon icon (visible in light mode) */}
          <HugeiconsIcon
            icon={Moon02Icon}
            className={cn(
              "size-4.5 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
              resolvedTheme === "light"
                ? "scale-100 rotate-0 text-sky-600 opacity-100"
                : "absolute scale-0 rotate-90 opacity-0"
            )}
            strokeWidth={1.75}
          />
        </div>
      ) : (
        <span className="size-4.5" />
      )}
    </Button>
  )
}
