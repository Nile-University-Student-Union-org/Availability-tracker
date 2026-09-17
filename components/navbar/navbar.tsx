"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { useTheme } from "next-themes"
import { authClient } from "@/lib/auth-client"
import { NusuLogo } from "@/components/nusu-logo"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardSquare02Icon,
  Logout02Icon,
  Calendar03Icon,
} from "@hugeicons/core-free-icons"
import { Sun, Moon, Menu, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { executeThemeTransition } from "@/components/theme-beam"

export function Navbar() {
  const pathname = usePathname()
  const router = useRouter()
  const { data: session } = authClient.useSession()
  const { theme, resolvedTheme, setTheme } = useTheme()

  const [mounted, setMounted] = React.useState(false)
  const [mobileOpen, setMobileOpen] = React.useState(false)
  const [isScrolled, setIsScrolled] = React.useState(false)
  const [isAdmin, setIsAdmin] = React.useState(false)

  // Dynamic sliding hover pill indicator for desktop nav
  const [hoveredRect, setHoveredRect] = React.useState<{
    left: number
    top: number
    width: number
    height: number
    opacity: number
  } | null>(null)
  const [clickedIndex, setClickedIndex] = React.useState<number | null>(null)
  const linkRefs = React.useRef<(HTMLAnchorElement | null)[]>([])
  const containerRef = React.useRef<HTMLDivElement>(null)

  // Specular caustic sweep state
  const [isSheenActive, setIsSheenActive] = React.useState(false)
  const [sheenKey, setSheenKey] = React.useState(0)
  const sheenTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const triggerSheen = React.useCallback(() => {
    if (sheenTimerRef.current) clearTimeout(sheenTimerRef.current)
    setSheenKey((k) => k + 1)
    setIsSheenActive(true)
    sheenTimerRef.current = setTimeout(() => {
      setIsSheenActive(false)
    }, 900)
  }, [])

  React.useEffect(() => {
    setMounted(true)
  }, [])

  // Admin access check for active session
  React.useEffect(() => {
    if (!session?.user?.email) {
      setIsAdmin(false)
      return
    }

    if (session.user.email === "admin@nu.edu.eg") {
      setIsAdmin(true)
      return
    }

    const userRole = (session.user as Record<string, unknown>).role
    if (userRole === "admin" || userRole === "super-admin") {
      setIsAdmin(true)
      return
    }

    let cancelled = false
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((data) => {
        if (!cancelled && data?.isAdmin) {
          setIsAdmin(true)
        } else if (!cancelled) {
          setIsAdmin(false)
        }
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false)
      })

    return () => {
      cancelled = true
    }
  }, [session?.user])

  // Scroll detection
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20)
    }
    handleScroll()
    window.addEventListener("scroll", handleScroll, { passive: true })
    return () => window.removeEventListener("scroll", handleScroll)
  }, [])

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Close mobile menu on outside click or Escape key
  React.useEffect(() => {
    if (!mobileOpen) return
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false)
      }
    }
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false)
    }
    document.addEventListener("mousedown", handleClickOutside)
    document.addEventListener("keydown", handleEscape)
    return () => {
      document.removeEventListener("mousedown", handleClickOutside)
      document.removeEventListener("keydown", handleEscape)
    }
  }, [mobileOpen])

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark")
  const isSpecialAdmin = session?.user?.email === "admin@nu.edu.eg"

  // Role-based navigation links
  // - admin@nu.edu.eg: Only "Admin Panel" (cannot mark availability)
  // - Other admins: "Mark Availability" and "Admin Panel"
  // - Normal users: No center nav links (only Logo, Theme Toggle, and Sign out)
  const navLinks: { label: string; href: string; icon: any }[] = []
  if (isSpecialAdmin) {
    navLinks.push({
      label: "Admin Panel",
      href: "/admin",
      icon: DashboardSquare02Icon,
    })
  } else if (isAdmin) {
    navLinks.push(
      {
        label: "Mark Availability",
        href: "/",
        icon: Calendar03Icon,
      },
      {
        label: "Admin Panel",
        href: "/admin",
        icon: DashboardSquare02Icon,
      }
    )
  }

  const logoHref = isSpecialAdmin ? "/admin" : "/"

  const handleLinkMouseEnter = (index: number) => {
    const el = linkRefs.current[index]
    if (el) {
      setHoveredRect({
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
        opacity: 1,
      })
    }
  }

  const handleNavMouseLeave = () => {
    setHoveredRect((prev) => (prev ? { ...prev, opacity: 0 } : null))
  }

  const handleLinkClick = (index: number) => {
    setClickedIndex(index)
    setTimeout(() => {
      setClickedIndex(null)
    }, 450)
  }

  const isActiveRoute = (href: string) => {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  const handleThemeToggle = () => {
    const nextTheme = isDark ? "light" : "dark"
    triggerSheen()
    executeThemeTransition(nextTheme, setTheme)
  }

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/auth?mode=signin") },
    })
  }

  return (
    <>
      {/* Pure Blur Ambient Backdrop Overlay when mobile menu is open (No dark overlay) */}
      <div
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
        className={cn(
          "fixed inset-0 z-40 bg-transparent transition-all duration-300 md:hidden",
          mobileOpen
            ? "pointer-events-auto opacity-100 backdrop-blur-md supports-backdrop-filter:backdrop-blur-xl"
            : "pointer-events-none opacity-0 backdrop-blur-none"
        )}
      />

      <div
        ref={containerRef}
        className={cn(
          "pointer-events-none fixed inset-x-0 z-50 px-3.5 transition-all duration-300 sm:px-6",
          isScrolled ? "top-2 sm:top-3.5" : "top-3 sm:top-5"
        )}
      >
        <header
          className={cn(
            "pointer-events-auto relative mx-auto w-full max-w-[840px] rounded-3xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] sm:rounded-full",
            "backdrop-blur-2xl backdrop-saturate-180",
            "liquid-glass-bar",
            isDark ? "liquid-glass-bar-dark" : "liquid-glass-bar-light",
            isScrolled && "liquid-glass-bar-scrolled scale-[0.99]",
            mobileOpen &&
              (isDark
                ? "!bg-[#0a1120]/80 shadow-2xl ring-1 ring-white/20 !backdrop-blur-3xl"
                : "!bg-white/80 shadow-2xl ring-1 ring-black/10 !backdrop-blur-3xl")
          )}
        >
          {/* Specular Caustic Glass Refraction Sweep */}
          {isSheenActive && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[inherit]"
            >
              <div
                key={`sheen-${sheenKey}`}
                className="animate-specular-sweep pointer-events-none absolute inset-0 h-full w-full"
                style={{
                  background: isDark
                    ? "linear-gradient(108deg, transparent 0%, transparent 40%, rgba(1,139,206,0.2) 45%, rgba(45,177,250,0.75) 48.8%, rgba(255,255,255,0.98) 49.85%, #ffffff 50%, rgba(255,255,255,0.98) 50.15%, rgba(45,177,250,0.75) 51.2%, rgba(229,168,35,0.3) 55%, transparent 60%, transparent 100%)"
                    : "linear-gradient(108deg, transparent 0%, transparent 40%, rgba(229,168,35,0.25) 45%, rgba(229,168,35,0.85) 48.8%, rgba(255,255,255,0.98) 49.85%, #ffffff 50%, rgba(255,255,255,0.98) 50.15%, rgba(45,177,250,0.7) 51.2%, rgba(1,139,206,0.2) 55%, transparent 60%, transparent 100%)",
                }}
              />
              <div
                key={`rim-${sheenKey}`}
                className="animate-rim-flash pointer-events-none absolute inset-0 rounded-[inherit]"
                style={{
                  boxShadow: "inset 0 1.5px 2px 0 rgba(255,255,255,0.65)",
                }}
              />
            </div>
          )}

          {/* Main Navigation Bar */}
          <div className="flex items-center justify-between gap-3 p-1.5 sm:gap-4 sm:p-2">
            {/* Brand Logo */}
            <Link
              href={logoHref}
              className="group flex cursor-pointer items-center gap-2 rounded-full py-1 pr-2 pl-3 transition-transform duration-200 select-none active:scale-95"
              aria-label="Nile University Student Union"
            >
              <NusuLogo size="sm" showText={true} />
            </Link>

            {/* Desktop Nav Links (Visible only for Admins with destinations) */}
            {navLinks.length > 0 && (
              <nav
                onMouseLeave={handleNavMouseLeave}
                className={cn(
                  "relative ml-auto hidden items-center gap-1 rounded-full p-1 transition-colors duration-300 md:flex",
                  isDark
                    ? "bg-white/[0.08] ring-1 ring-white/15"
                    : "bg-nusu-navy/[0.04] ring-1 ring-nusu-navy/[0.06]"
                )}
                aria-label="Primary"
              >
                {hoveredRect && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute rounded-full transition-all duration-300 ease-[cubic-bezier(0.23,1,0.32,1)]",
                      isDark
                        ? "bg-white/15 shadow-[0_2px_12px_rgba(255,255,255,0.08),inset_0_1px_1px_rgba(255,255,255,0.25)] ring-1 ring-white/20"
                        : "bg-white/85 shadow-[0_2px_8px_rgba(15,48,86,0.08),inset_0_1px_1px_rgba(255,255,255,0.95)] ring-1 ring-nusu-navy/10"
                    )}
                    style={{
                      left: `${hoveredRect.left}px`,
                      top: `${hoveredRect.top}px`,
                      width: `${hoveredRect.width}px`,
                      height: `${hoveredRect.height}px`,
                      opacity: hoveredRect.opacity,
                      transform:
                        hoveredRect.opacity === 0 ? "scale(0.95)" : "scale(1)",
                    }}
                  />
                )}

                {navLinks.map((link, index) => {
                  const active = isActiveRoute(link.href)
                  const isClicked = clickedIndex === index
                  return (
                    <Link
                      key={link.href}
                      ref={(el) => {
                        linkRefs.current[index] = el
                      }}
                      onMouseEnter={() => handleLinkMouseEnter(index)}
                      onClick={() => handleLinkClick(index)}
                      href={link.href}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 select-none",
                        active
                          ? isDark
                            ? "bg-white/20 font-bold text-white shadow-[0_2px_12px_rgba(255,255,255,0.08)] ring-1 ring-white/25"
                            : "bg-white font-bold text-nusu-navy shadow-[0_2px_8px_rgba(15,48,86,0.08),inset_0_1px_1px_rgba(255,255,255,0.95)] ring-1 ring-black/[0.06]"
                          : isDark
                            ? "text-white/80 hover:text-white"
                            : "text-nusu-navy/75 hover:text-nusu-navy",
                        isClicked && "animate-nav-click-burst"
                      )}
                    >
                      <HugeiconsIcon
                        icon={link.icon}
                        size={14}
                        strokeWidth={2.2}
                        className="opacity-75"
                      />
                      <span className="relative z-10 cursor-pointer">
                        {link.label}
                      </span>
                    </Link>
                  )
                })}
              </nav>
            )}

            {/* Action Island: Theme Toggle + Sign out (or Sign in if unauthenticated) */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* Theme Toggle Button */}
              <button
                type="button"
                onClick={handleThemeToggle}
                aria-label={
                  isDark ? "Switch to light mode" : "Switch to dark mode"
                }
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className={cn(
                  "group/theme relative flex size-8 cursor-pointer items-center justify-center rounded-full transition-all duration-200 select-none active:scale-90 sm:size-9",
                  isDark
                    ? "bg-white/15 shadow-xs ring-1 ring-white/25 hover:bg-white/25"
                    : "bg-nusu-navy/[0.05] shadow-2xs ring-1 ring-black/[0.06] hover:bg-nusu-navy/10"
                )}
              >
                {isDark ? (
                  <Sun
                    size={15}
                    strokeWidth={2.2}
                    className="text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.45)] transition-transform duration-300 group-hover/theme:rotate-45"
                  />
                ) : (
                  <Moon
                    size={15}
                    strokeWidth={2.2}
                    className="text-nusu-navy transition-transform duration-300 group-hover/theme:-rotate-12 group-hover/theme:text-nusu-blue"
                  />
                )}
              </button>

              {/* Authenticated Controls: Sign out */}
              {session?.user ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign out of your account"
                  title="Sign out"
                  className={cn(
                    "group relative flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-all duration-200 select-none active:scale-[0.97] sm:text-[13px]",
                    isDark
                      ? "bg-white/10 text-white/90 ring-1 ring-white/15 hover:bg-red-500/20 hover:text-red-300 hover:ring-red-400/30"
                      : "bg-black/[0.04] text-nusu-navy ring-1 ring-black/[0.06] hover:bg-red-50 hover:text-red-600 hover:ring-red-200"
                  )}
                >
                  <HugeiconsIcon
                    icon={Logout02Icon}
                    size={14}
                    strokeWidth={2.2}
                    className="text-red-500 transition-transform duration-200 group-hover:-translate-x-0.5"
                  />
                  <span>Sign out</span>
                </button>
              ) : (
                <Link
                  href="/auth?mode=signin"
                  className={cn(
                    "group relative flex cursor-pointer items-center gap-2 rounded-full px-3.5 py-1.5 text-[12.5px] font-semibold transition-all duration-200 select-none active:scale-[0.97] sm:text-[13px]",
                    isDark
                      ? "bg-white text-nusu-navy shadow-[0_4px_16px_rgba(0,0,0,0.35)] hover:bg-white/95"
                      : "bg-nusu-navy text-white shadow-[0_4px_14px_rgba(15,48,86,0.22)] hover:bg-nusu-navy-light"
                  )}
                >
                  <span>Login</span>
                </Link>
              )}

              {/* Mobile Navigation Trigger (Rendered only for Admins with multiple routes on mobile) */}
              {navLinks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setMobileOpen(!mobileOpen)}
                  className={cn(
                    "relative flex size-8 cursor-pointer items-center justify-center rounded-full transition-all duration-200 active:scale-90 md:hidden",
                    isDark
                      ? "bg-white/15 text-white ring-1 ring-white/25 hover:bg-white/25"
                      : "bg-white/60 text-nusu-navy ring-1 ring-black/[0.06] hover:bg-white/90"
                  )}
                  aria-expanded={mobileOpen}
                  aria-label={mobileOpen ? "Close menu" : "Open menu"}
                >
                  <div className="relative size-4">
                    <Menu
                      size={16}
                      strokeWidth={2.2}
                      className={cn(
                        "absolute inset-0 size-4 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        mobileOpen
                          ? "scale-0 -rotate-90 opacity-0"
                          : "scale-100 rotate-0 opacity-100"
                      )}
                    />
                    <X
                      size={16}
                      strokeWidth={2.2}
                      className={cn(
                        "absolute inset-0 size-4 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        mobileOpen
                          ? "scale-100 rotate-0 opacity-100"
                          : "scale-0 rotate-90 opacity-0"
                      )}
                    />
                  </div>
                </button>
              )}
            </div>
          </div>

          {/* Mobile Navigation Dropdown (Only for Admins with multiple tabs on mobile) */}
          {navLinks.length > 0 && (
            <div
              className={cn(
                "grid transition-[grid-template-rows,opacity] duration-250 ease-[cubic-bezier(0.16,1,0.3,1)] md:hidden",
                mobileOpen
                  ? "grid-rows-[1fr] opacity-100"
                  : "pointer-events-none grid-rows-[0fr] opacity-0"
              )}
            >
              <div className="overflow-hidden">
                <div
                  className={cn(
                    "mx-3 my-1.5 h-px",
                    isDark ? "bg-white/15" : "bg-nusu-navy/10"
                  )}
                />
                <nav
                  className="flex flex-col gap-1 px-2.5 pb-2.5"
                  aria-label="Mobile Navigation"
                >
                  {navLinks.map((link) => {
                    const active = isActiveRoute(link.href)
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        onClick={() => setMobileOpen(false)}
                        className={cn(
                          "flex min-h-[44px] items-center gap-2.5 rounded-xl px-3.5 text-[13.5px] font-semibold transition-all duration-200 active:scale-[0.98]",
                          active
                            ? isDark
                              ? "bg-white/20 text-white shadow-xs ring-1 ring-white/20"
                              : "bg-white/95 text-nusu-navy shadow-xs ring-1 ring-black/[0.05]"
                            : isDark
                              ? "text-white/80 hover:bg-white/10 hover:text-white"
                              : "text-nusu-navy/75 hover:bg-black/[0.04] hover:text-nusu-navy"
                        )}
                      >
                        <HugeiconsIcon
                          icon={link.icon}
                          size={16}
                          strokeWidth={2.2}
                        />
                        <span>{link.label}</span>
                      </Link>
                    )
                  })}
                </nav>
              </div>
            </div>
          )}
        </header>
      </div>
    </>
  )
}
