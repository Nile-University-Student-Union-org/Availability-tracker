"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { authClient } from "@/lib/auth-client";
import { NusuLogo } from "@/components/nusu-logo";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare02Icon,
  Logout02Icon,
  Calendar03Icon,
  Clock01Icon,
} from "@hugeicons/core-free-icons";
import { Sun, Moon, Menu, X } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  executeThemeTransition,
  THEME_BEAM_EVENT,
} from "@/components/theme-beam";
import { SignOutDialog } from "@/components/auth/sign-out-dialog";
import { toast } from "sonner";

export interface NavbarProps {
  dateScheduleTitle?: string;
  weeklyScheduleTitle?: string;
  dateScheduleActive?: boolean;
  weeklyScheduleActive?: boolean;
  initialUser?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
  } | null;
  initialIsAdmin?: boolean;
}

let globalAdminCache: { email: string; isAdmin: boolean } | null = null;

export function Navbar({
  dateScheduleTitle,
  weeklyScheduleTitle,
  dateScheduleActive = true,
  weeklyScheduleActive = true,
  initialUser,
  initialIsAdmin = false,
}: NavbarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const currentUser = session?.user ?? initialUser;
  const currentEmail = currentUser?.email?.toLowerCase();
  const isSpecialAdmin = currentEmail === "admin@nu.edu.eg";

  const { theme, resolvedTheme, setTheme } = useTheme();

  const [mounted, setMounted] = React.useState(false);
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const [isScrolled, setIsScrolled] = React.useState(false);
  const [isAdmin, setIsAdmin] = React.useState<boolean>(() => {
    if (initialIsAdmin) return true;
    if (
      currentEmail &&
      globalAdminCache &&
      globalAdminCache.email === currentEmail
    ) {
      return globalAdminCache.isAdmin;
    }
    return false;
  });
  const [signOutOpen, setSignOutOpen] = React.useState(false);

  // Dynamic sliding indicator rects for desktop nav (Apple-grade fluid liquid pill)
  const [activeRect, setActiveRect] = React.useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const [hoveredRect, setHoveredRect] = React.useState<{
    left: number;
    top: number;
    width: number;
    height: number;
  } | null>(null);
  const linkRefs = React.useRef<(HTMLAnchorElement | null)[]>([]);
  const containerRef = React.useRef<HTMLDivElement>(null);

  // Specular caustic sweep state
  const [isSheenActive, setIsSheenActive] = React.useState(false);
  const [sheenKey, setSheenKey] = React.useState(0);
  const sheenTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const triggerSheen = React.useCallback(() => {
    if (sheenTimerRef.current) clearTimeout(sheenTimerRef.current);
    setSheenKey((k) => k + 1);
    setIsSheenActive(true);
    sheenTimerRef.current = setTimeout(() => {
      setIsSheenActive(false);
    }, 780);
  }, []);

  React.useEffect(() => {
    function handleBeam() {
      triggerSheen();
    }
    window.addEventListener(THEME_BEAM_EVENT, handleBeam);
    return () => window.removeEventListener(THEME_BEAM_EVENT, handleBeam);
  }, [triggerSheen]);

  React.useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      const resetSuccess = sessionStorage.getItem(
        "nusu_password_reset_success",
      );
      if (resetSuccess) {
        sessionStorage.removeItem("nusu_password_reset_success");
        toast.success("Password has been reset successfully!", {
          description: "Your new password is now active for future logins.",
          duration: 6000,
        });
      }
    }
  }, []);

  // Admin access check for active session
  React.useEffect(() => {
    if (!currentEmail) {
      setIsAdmin(false);
      return;
    }

    if (isSpecialAdmin) {
      setIsAdmin(true);
      globalAdminCache = { email: currentEmail, isAdmin: true };
      return;
    }

    const userRole = (currentUser as Record<string, unknown> | undefined)?.role;
    if (userRole === "admin" || userRole === "super-admin") {
      setIsAdmin(true);
      globalAdminCache = { email: currentEmail, isAdmin: true };
      return;
    }

    if (globalAdminCache && globalAdminCache.email === currentEmail) {
      setIsAdmin(globalAdminCache.isAdmin);
      return;
    }

    let cancelled = false;
    fetch("/api/admin/check")
      .then((r) => r.json())
      .then((data) => {
        const isAdm = Boolean(data?.isAdmin);
        globalAdminCache = { email: currentEmail, isAdmin: isAdm };
        if (!cancelled) setIsAdmin(isAdm);
      })
      .catch(() => {
        if (!cancelled) setIsAdmin(false);
      });

    return () => {
      cancelled = true;
    };
  }, [currentEmail, isSpecialAdmin, currentUser]);

  // Aggressively prefetch the admin console as soon as user is recognized as admin
  React.useEffect(() => {
    if (isAdmin || isSpecialAdmin) {
      router.prefetch("/admin");
    }
  }, [isAdmin, isSpecialAdmin, router]);

  // Scroll detection
  React.useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    handleScroll();
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Close mobile menu on route change
  React.useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  // Close mobile menu on outside click or Escape key
  React.useEffect(() => {
    if (!mobileOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setMobileOpen(false);
      }
    };
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [mobileOpen]);

  const isDark = mounted && (resolvedTheme === "dark" || theme === "dark");

  const isActiveRoute = React.useCallback(
    (href: string) => {
      if (href === "/specific")
        return pathname === "/specific" || pathname === "/";
      if (href === "/weekly") return pathname.startsWith("/weekly");
      if (href === "/admin") return pathname.startsWith("/admin");
      return pathname === href;
    },
    [pathname],
  );

  // Role-based navigation links
  // - admin@nu.edu.eg: Only "Admin Panel" (cannot mark availability)
  // - Other admins: "Specific Date", "Semester Availability", and "Admin Panel"
  // - Normal authenticated users: "Specific Date" and "Semester Availability"
  const navLinks = React.useMemo<
    {
      label: string;
      href: string;
      icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
    }[]
  >(() => {
    const links: {
      label: string;
      href: string;
      icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
    }[] = [];

    const specificLabel = dateScheduleTitle?.trim() || "Specific Date";
    const weeklyLabel = weeklyScheduleTitle?.trim() || "Semester Availability";

    if (isSpecialAdmin) {
      links.push({
        label: "Admin Panel",
        href: "/admin",
        icon: DashboardSquare02Icon,
      });
    } else if (isAdmin) {
      if (dateScheduleActive) {
        links.push({
          label: specificLabel,
          href: "/specific",
          icon: Calendar03Icon,
        });
      }
      if (weeklyScheduleActive) {
        links.push({
          label: weeklyLabel,
          href: "/weekly",
          icon: Clock01Icon,
        });
      }
      links.push({
        label: "Admin Panel",
        href: "/admin",
        icon: DashboardSquare02Icon,
      });
    } else if (currentUser) {
      if (dateScheduleActive) {
        links.push({
          label: specificLabel,
          href: "/specific",
          icon: Calendar03Icon,
        });
      }
      if (weeklyScheduleActive) {
        links.push({
          label: weeklyLabel,
          href: "/weekly",
          icon: Clock01Icon,
        });
      }
    }
    return links;
  }, [
    dateScheduleTitle,
    weeklyScheduleTitle,
    dateScheduleActive,
    weeklyScheduleActive,
    isSpecialAdmin,
    isAdmin,
    currentUser,
  ]);

  // Synchronize the active indicator position smoothly with zero layout jumps
  const updateActiveRect = React.useCallback(() => {
    const activeIndex = navLinks.findIndex((link) => isActiveRoute(link.href));
    if (activeIndex !== -1) {
      const el = linkRefs.current[activeIndex];
      if (el) {
        setActiveRect({
          left: el.offsetLeft,
          top: el.offsetTop,
          width: el.offsetWidth,
          height: el.offsetHeight,
        });
      }
    } else {
      setActiveRect(null);
    }
  }, [navLinks, isActiveRoute]);

  React.useEffect(() => {
    updateActiveRect();
    window.addEventListener("resize", updateActiveRect);
    return () => window.removeEventListener("resize", updateActiveRect);
  }, [updateActiveRect]);

  const logoHref = isSpecialAdmin ? "/admin" : "/";

  const handleLinkMouseEnter = (index: number) => {
    const activeIndex = navLinks.findIndex((link) => isActiveRoute(link.href));
    if (index === activeIndex) {
      setHoveredRect(null);
      return;
    }
    const el = linkRefs.current[index];
    if (el) {
      setHoveredRect({
        left: el.offsetLeft,
        top: el.offsetTop,
        width: el.offsetWidth,
        height: el.offsetHeight,
      });
    }
  };

  const handleNavMouseLeave = () => {
    setHoveredRect(null);
  };

  const handleThemeToggle = (e?: React.MouseEvent<HTMLButtonElement>) => {
    const nextTheme = isDark ? "light" : "dark";
    executeThemeTransition(nextTheme, setTheme, e);
  };

  function handleSignOut() {
    setSignOutOpen(true);
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
            : "pointer-events-none opacity-0 backdrop-blur-none",
        )}
      />

      <div
        ref={containerRef}
        className={cn(
          "pointer-events-none fixed inset-x-0 z-50 px-3.5 transition-all duration-300 sm:px-6",
          isScrolled ? "top-2 sm:top-3.5" : "top-3 sm:top-5",
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
                : "!bg-white/80 shadow-2xl ring-1 ring-black/10 !backdrop-blur-3xl"),
          )}
        >
          {/* Specular Caustic Glass Refraction Sweep - Permanently mounted in DOM */}
          <div
            aria-hidden="true"
            className={cn(
              "pointer-events-none absolute inset-0 z-20 overflow-hidden rounded-[inherit] transition-opacity duration-300",
              isSheenActive ? "opacity-100" : "opacity-0",
            )}
          >
            <div
              key={`sheen-${sheenKey}`}
              className={cn(
                "pointer-events-none absolute inset-0 h-full w-full",
                isSheenActive ? "animate-specular-sweep" : "opacity-0",
              )}
              style={{
                background: isDark
                  ? "linear-gradient(108deg, transparent 0%, transparent 40%, rgba(1,139,206,0.2) 45%, rgba(45,177,250,0.75) 48.8%, rgba(255,255,255,0.98) 49.85%, #ffffff 50%, rgba(255,255,255,0.98) 50.15%, rgba(45,177,250,0.75) 51.2%, rgba(229,168,35,0.3) 55%, transparent 60%, transparent 100%)"
                  : "linear-gradient(108deg, transparent 0%, transparent 40%, rgba(229,168,35,0.25) 45%, rgba(229,168,35,0.85) 48.8%, rgba(255,255,255,0.98) 49.85%, #ffffff 50%, rgba(255,255,255,0.98) 50.15%, rgba(45,177,250,0.7) 51.2%, rgba(1,139,206,0.2) 55%, transparent 60%, transparent 100%)",
              }}
            />
            <div
              key={`rim-${sheenKey}`}
              className={cn(
                "pointer-events-none absolute inset-0 rounded-[inherit]",
                isSheenActive ? "animate-rim-flash" : "opacity-0",
              )}
              style={{
                boxShadow: "inset 0 1.5px 2px 0 rgba(255,255,255,0.65)",
              }}
            />
          </div>

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
                    : "bg-nusu-navy/[0.04] ring-1 ring-nusu-navy/[0.06]",
                )}
                aria-label="Primary"
              >
                {/* 1. Ghost Hover Pill (Subtle frosted preview on inactive tabs) */}
                {hoveredRect && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute rounded-full transition-all duration-200 ease-[cubic-bezier(0.25,1,0.35,1)]",
                      isDark
                        ? "bg-white/[0.08] ring-1 ring-white/10"
                        : "bg-black/[0.04] ring-1 ring-black/[0.05]",
                    )}
                    style={{
                      left: `${hoveredRect.left}px`,
                      top: `${hoveredRect.top}px`,
                      width: `${hoveredRect.width}px`,
                      height: `${hoveredRect.height}px`,
                    }}
                  />
                )}

                {/* 2. Apple Liquid Active Pill (Glides smoothly between active tabs) */}
                {activeRect && (
                  <span
                    aria-hidden="true"
                    className={cn(
                      "pointer-events-none absolute rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,1,0.35,1)]",
                      isDark
                        ? "bg-white/20 shadow-[0_2px_12px_rgba(255,255,255,0.08),inset_0_1px_1px_rgba(255,255,255,0.25)] ring-1 ring-white/25"
                        : "bg-white shadow-[0_2px_8px_rgba(15,48,86,0.08),inset_0_1px_1px_rgba(255,255,255,0.95)] ring-1 ring-black/[0.06]",
                    )}
                    style={{
                      left: `${activeRect.left}px`,
                      top: `${activeRect.top}px`,
                      width: `${activeRect.width}px`,
                      height: `${activeRect.height}px`,
                    }}
                  />
                )}

                {navLinks.map((link, index) => {
                  const active = isActiveRoute(link.href);
                  return (
                    <Link
                      key={link.href}
                      ref={(el) => {
                        linkRefs.current[index] = el;
                      }}
                      onMouseEnter={() => {
                        handleLinkMouseEnter(index);
                        router.prefetch(link.href);
                      }}
                      onPointerDown={() => router.prefetch(link.href)}
                      href={link.href}
                      prefetch={true}
                      aria-current={active ? "page" : undefined}
                      className={cn(
                        "relative z-10 flex cursor-pointer items-center justify-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors duration-200 select-none",
                        active
                          ? isDark
                            ? "text-white"
                            : "text-nusu-navy"
                          : isDark
                            ? "text-white/70 hover:text-white"
                            : "text-nusu-navy/70 hover:text-nusu-navy",
                      )}
                    >
                      <HugeiconsIcon
                        icon={link.icon}
                        size={14}
                        strokeWidth={2.2}
                        className={cn(
                          "transition-opacity duration-200",
                          active ? "opacity-100" : "opacity-65",
                        )}
                      />
                      <span className="relative z-10 cursor-pointer">
                        {link.label}
                      </span>
                    </Link>
                  );
                })}
              </nav>
            )}

            {/* Action Island: Theme Toggle + Sign out (or Sign in if unauthenticated) */}
            <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
              {/* Theme Toggle Button */}
              <button
                type="button"
                data-theme-toggle
                onClick={handleThemeToggle}
                aria-label={
                  isDark ? "Switch to light mode" : "Switch to dark mode"
                }
                title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                className={cn(
                  "group/theme relative flex size-8 cursor-pointer items-center justify-center rounded-full transition-all duration-300 ease-[cubic-bezier(0.25,1,0.35,1)] select-none active:scale-90 touch-manipulation sm:size-9",
                  isDark
                    ? "bg-white/15 shadow-xs ring-1 ring-white/25 hover:bg-white/25"
                    : "bg-nusu-navy/[0.05] shadow-2xs ring-1 ring-black/[0.06] hover:bg-nusu-navy/10",
                )}
              >
                {isDark ? (
                  <Sun
                    size={15}
                    strokeWidth={2.2}
                    className="text-amber-300 drop-shadow-[0_0_8px_rgba(252,211,77,0.45)] transition-transform duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/theme:rotate-45"
                  />
                ) : (
                  <Moon
                    size={15}
                    strokeWidth={2.2}
                    className="text-nusu-navy transition-transform duration-400 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover/theme:-rotate-12 group-hover/theme:text-nusu-blue"
                  />
                )}
              </button>

              {/* Authenticated Controls: Sign out */}
              {currentUser ? (
                <button
                  type="button"
                  onClick={handleSignOut}
                  aria-label="Sign out of your account"
                  title="Sign out"
                  className={cn(
                    "group relative flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1.5 text-[12.5px] font-semibold transition-all duration-200 select-none active:scale-[0.97] sm:text-[13px]",
                    isDark
                      ? "bg-white/10 text-white/90 ring-1 ring-white/15 hover:bg-red-500/20 hover:text-red-300 hover:ring-red-400/30"
                      : "bg-black/[0.04] text-nusu-navy ring-1 ring-black/[0.06] hover:bg-red-50 hover:text-red-600 hover:ring-red-200",
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
                      : "bg-nusu-navy text-white shadow-[0_4px_14px_rgba(15,48,86,0.22)] hover:bg-nusu-navy-light",
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
                      : "bg-white/60 text-nusu-navy ring-1 ring-black/[0.06] hover:bg-white/90",
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
                          : "scale-100 rotate-0 opacity-100",
                      )}
                    />
                    <X
                      size={16}
                      strokeWidth={2.2}
                      className={cn(
                        "absolute inset-0 size-4 transition-all duration-200 ease-[cubic-bezier(0.16,1,0.3,1)]",
                        mobileOpen
                          ? "scale-100 rotate-0 opacity-100"
                          : "scale-0 rotate-90 opacity-0",
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
                  : "pointer-events-none grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <div
                  className={cn(
                    "mx-3 my-1.5 h-px",
                    isDark ? "bg-white/15" : "bg-nusu-navy/10",
                  )}
                />
                <nav
                  className="flex flex-col gap-1 px-2.5 pb-2.5"
                  aria-label="Mobile Navigation"
                >
                  {navLinks.map((link) => {
                    const active = isActiveRoute(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        prefetch={true}
                        onTouchStart={() => router.prefetch(link.href)}
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
                              : "text-nusu-navy/75 hover:bg-black/[0.04] hover:text-nusu-navy",
                        )}
                      >
                        <HugeiconsIcon
                          icon={link.icon}
                          size={16}
                          strokeWidth={2.2}
                        />
                        <span>{link.label}</span>
                      </Link>
                    );
                  })}
                </nav>
              </div>
            </div>
          )}
        </header>
      </div>

      {/* Confirmation Popup for Sign Out (Responsive Drawer on Mobile, Alert Dialog on Desktop) */}
      <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
    </>
  );
}
