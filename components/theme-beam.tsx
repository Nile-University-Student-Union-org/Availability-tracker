"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export const THEME_BEAM_EVENT = "nusu-theme-beam"

export type ThemeBeamDetail = {
  targetTheme: "light" | "dark"
  alreadySwitched?: boolean
}

/**
 * Dispatches the theme beam custom event across the window.
 */
export function triggerThemeBeam(
  targetTheme: "light" | "dark",
  alreadySwitched = false
) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent<ThemeBeamDetail>(THEME_BEAM_EVENT, {
        detail: { targetTheme, alreadySwitched },
      })
    )
  }
}

/**
 * Universal, high-performance theme transition orchestrator.
 * Combines native GPU-composited View Transitions (where supported) with
 * an optical photon beam sweep at 60/120 FPS on both mobile and desktop.
 */
export function executeThemeTransition(
  targetTheme: "light" | "dark",
  setTheme: (theme: string) => void
) {
  if (typeof window === "undefined") return

  // Accessibility: instant switch under prefers-reduced-motion
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    setTheme(targetTheme)
    return
  }

  const hasViewTransition =
    typeof document !== "undefined" &&
    "startViewTransition" in document

  if (hasViewTransition) {
    // 1. Launch beam simultaneously with the view transition wipe
    triggerThemeBeam(targetTheme, true)

    // 2. Execute GPU-composited view transition
    try {
      ;(
        document as unknown as {
          startViewTransition: (cb: () => void) => { finished: Promise<void> }
        }
      ).startViewTransition(() => {
        setTheme(targetTheme)
      })
    } catch {
      setTheme(targetTheme)
    }
  } else {
    // Fallback: ThemeBeam sweeps across and seamlessly swaps theme at midpoint
    triggerThemeBeam(targetTheme, false)
  }
}

export function ThemeBeam() {
  const { setTheme } = useTheme()
  const [active, setActive] = useState(false)
  const [beamTheme, setBeamTheme] = useState<"light" | "dark">("dark")

  useEffect(() => {
    let switchTimer: ReturnType<typeof setTimeout> | undefined
    let cleanupTimer: ReturnType<typeof setTimeout> | undefined

    function handleBeamEvent(e: Event) {
      const customEvent = e as CustomEvent<ThemeBeamDetail>
      const targetTheme = customEvent.detail?.targetTheme ?? "dark"
      const alreadySwitched = customEvent.detail?.alreadySwitched ?? false

      // Respect prefers-reduced-motion
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        if (!alreadySwitched) setTheme(targetTheme)
        return
      }

      setBeamTheme(targetTheme)
      setActive(true)

      document.documentElement.classList.add("theme-transitioning")

      // In fallback mode, swap the theme exactly as the beam filament passes the viewport center
      if (!alreadySwitched) {
        if (switchTimer) clearTimeout(switchTimer)
        switchTimer = setTimeout(() => {
          setTheme(targetTheme)
        }, 180)
      }

      // Automatically unmount overlay and clean up classes after beam exits
      if (cleanupTimer) clearTimeout(cleanupTimer)
      cleanupTimer = setTimeout(() => {
        setActive(false)
        document.documentElement.classList.remove("theme-transitioning")
      }, 460)
    }

    window.addEventListener(THEME_BEAM_EVENT, handleBeamEvent)
    return () => {
      window.removeEventListener(THEME_BEAM_EVENT, handleBeamEvent)
      if (switchTimer) clearTimeout(switchTimer)
      if (cleanupTimer) clearTimeout(cleanupTimer)
      document.documentElement.classList.remove("theme-transitioning")
    }
  }, [setTheme])

  if (!active) return null

  const isGoingDark = beamTheme === "dark"

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden select-none"
      style={{ contain: "strict" }}
    >
      {/* Weightless ambient flash — pure opacity transition without backdrop filters */}
      <div
        className={cn(
          "animate-beam-flash pointer-events-none absolute inset-0",
          isGoingDark
            ? "bg-gradient-to-br from-sky-500/10 via-emerald-500/5 to-indigo-900/10"
            : "bg-gradient-to-br from-amber-400/12 via-yellow-200/8 to-emerald-400/6"
        )}
      />

      {/* GPU-composited diagonal photon beam wavefront */}
      <div
        className="animate-beam-sweep pointer-events-none absolute -top-[30vh] -bottom-[30vh] flex w-[160px] items-center justify-center sm:w-[260px]"
        style={{ transformOrigin: "center center", WebkitBackfaceVisibility: "hidden" }}
      >
        {/* Soft atmospheric aura glow using pure linear gradient without heavy blurs */}
        <div
          className={cn(
            "absolute inset-0 rounded-full opacity-60",
            isGoingDark
              ? "bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent"
              : "bg-gradient-to-r from-transparent via-amber-400/35 to-transparent"
          )}
        />

        {/* Medium prismatic blade */}
        <div
          className={cn(
            "relative h-full w-[80px] sm:w-[120px] opacity-85",
            isGoingDark
              ? "bg-gradient-to-r from-transparent via-cyan-300/40 via-white/70 to-transparent"
              : "bg-gradient-to-r from-transparent via-amber-200/50 via-white/75 to-transparent"
          )}
        />

        {/* Specular razor laser filament */}
        <div
          className={cn(
            "absolute h-full w-[1.5px] rounded-full bg-white",
            isGoingDark
              ? "shadow-[0_0_8px_#ffffff,0_0_16px_#38bdf8]"
              : "shadow-[0_0_8px_#ffffff,0_0_16px_#fbbf24]"
          )}
        />
      </div>
    </div>
  )
}
