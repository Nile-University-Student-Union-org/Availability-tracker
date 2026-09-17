"use client"

import { useEffect, useState } from "react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export const THEME_BEAM_EVENT = "nusu-theme-beam"

export function triggerThemeBeam(
  targetTheme: "light" | "dark",
  alreadySwitched = false
) {
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent(THEME_BEAM_EVENT, {
        detail: { targetTheme, alreadySwitched },
      })
    )
  }
}

export function ThemeBeam() {
  const { setTheme } = useTheme()
  const [active, setActive] = useState(false)
  const [beamTheme, setBeamTheme] = useState<"light" | "dark">("dark")

  useEffect(() => {
    function handleBeamEvent(e: Event) {
      const customEvent = e as CustomEvent<{
        targetTheme: "light" | "dark"
        alreadySwitched?: boolean
      }>
      const targetTheme = customEvent.detail?.targetTheme ?? "dark"
      const alreadySwitched = customEvent.detail?.alreadySwitched ?? false

      // Respect prefers-reduced-motion
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
        if (!alreadySwitched) setTheme(targetTheme)
        return
      }

      setBeamTheme(targetTheme)
      setActive(true)

      // Add smooth transition class to html root
      document.documentElement.classList.add("theme-transitioning")

      // Switch theme exactly when the beam hits the center of the viewport (if not already handled by ViewTransition)
      const switchTimer = !alreadySwitched
        ? setTimeout(() => {
            setTheme(targetTheme)
          }, 310)
        : undefined

      // Complete beam animation
      const cleanupTimer = setTimeout(() => {
        setActive(false)
        document.documentElement.classList.remove("theme-transitioning")
      }, 820)

      return () => {
        if (switchTimer) clearTimeout(switchTimer)
        clearTimeout(cleanupTimer)
      }
    }

    window.addEventListener(THEME_BEAM_EVENT, handleBeamEvent)
    return () => {
      window.removeEventListener(THEME_BEAM_EVENT, handleBeamEvent)
      document.documentElement.classList.remove("theme-transitioning")
    }
  }, [setTheme])

  if (!active) return null

  const isGoingDark = beamTheme === "dark"

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 z-[99999] overflow-hidden select-none"
    >
      {/* Ambient flash wave that illuminates the viewport */}
      <div
        className={cn(
          "animate-beam-flash pointer-events-none absolute inset-0 transition-opacity",
          isGoingDark
            ? "bg-gradient-to-r from-emerald-500/10 via-sky-400/20 to-indigo-500/10 backdrop-blur-[0.5px]"
            : "bg-gradient-to-r from-amber-400/20 via-yellow-300/25 to-emerald-400/15 backdrop-blur-[0.5px]"
        )}
      />

      {/* Sweeping photon laser beam */}
      <div className="animate-beam-sweep pointer-events-none absolute -top-[60vh] -bottom-[60vh] flex w-[280px] items-center justify-center sm:w-[360px]">
        {/* Deep diffuse aura glow */}
        <div
          className={cn(
            "absolute inset-0 opacity-75 blur-3xl",
            isGoingDark
              ? "bg-gradient-to-r from-transparent via-cyan-400/40 via-emerald-400/60 to-transparent"
              : "bg-gradient-to-r from-transparent via-amber-400/50 via-emerald-400/50 to-transparent"
          )}
        />

        {/* Medium beam blade */}
        <div
          className={cn(
            "relative h-full w-[160px] opacity-95 blur-md sm:w-[200px]",
            isGoingDark
              ? "bg-gradient-to-r from-transparent via-emerald-400/30 via-sky-300/80 via-white to-transparent"
              : "bg-gradient-to-r from-transparent via-amber-300/80 via-emerald-400/30 via-white to-transparent"
          )}
        />

        {/* Ultra-intense central razor laser filament */}
        <div
          className={cn(
            "absolute h-full w-1 rounded-full bg-white sm:w-1.5",
            isGoingDark
              ? "shadow-[0_0_15px_#ffffff,0_0_35px_#38bdf8,0_0_70px_#10b981]"
              : "shadow-[0_0_15px_#ffffff,0_0_35px_#f59e0b,0_0_70px_#10b981]"
          )}
        />
      </div>
    </div>
  )
}
