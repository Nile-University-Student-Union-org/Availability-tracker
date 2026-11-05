"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { NusuLogo } from "@/components/nusu-logo";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  DashboardSquare02Icon,
  Logout02Icon,
  Calendar03Icon,
  ArrowDown01Icon,
} from "@hugeicons/core-free-icons";
import { cn } from "@/lib/utils";
import { StatusPill } from "@/components/status-pill";
import { ThemeToggle } from "@/components/theme-toggle";
import { SignOutDialog } from "@/components/auth/sign-out-dialog";
import { buttonVariants } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/lib/notify";

export interface NavbarProps {
  initialUser?: {
    name?: string | null;
    email?: string | null;
    image?: string | null;
    role?: string | null;
  } | null;
  initialIsAdmin?: boolean;
}

function initials(name?: string | null, email?: string | null) {
  const words = name?.trim().split(/\s+/).filter(Boolean) ?? [];
  if (words.length) return (words[0][0] + (words[1]?.[0] ?? "")).toUpperCase();
  return email?.slice(0, 2).toUpperCase() ?? "SU";
}

/** Floating pill bar: brand, centred links on a pill that follows hover, account menu. Same shape as TournamentWeb's AppNav. */
export function Navbar({
  initialUser,
  initialIsAdmin = false,
}: NavbarProps = {}) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const currentUser = session?.user ?? initialUser;
  const currentEmail = currentUser?.email?.toLowerCase();
  const isSpecialAdmin = currentEmail === "admin@nu.edu.eg";
  const userRole = (currentUser as Record<string, unknown> | undefined)?.role;
  const isAdmin = Boolean(
    initialIsAdmin ||
    isSpecialAdmin ||
    userRole === "admin" ||
    userRole === "super-admin",
  );

  const [open, setOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const [signOutOpen, setSignOutOpen] = React.useState(false);
  const shell = React.useRef<HTMLDivElement>(null);
  const toggle = React.useRef<HTMLButtonElement>(null);
  const nav = React.useRef<HTMLElement>(null);
  const [pill, setPill] = React.useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);

  const showPill = React.useCallback((link: HTMLAnchorElement | null) => {
    setPill(
      link
        ? {
            x: link.offsetLeft,
            y: link.offsetTop,
            width: link.offsetWidth,
            height: link.offsetHeight,
          }
        : null,
    );
  }, []);
  const activeLink = () =>
    nav.current?.querySelector<HTMLAnchorElement>('a[aria-current="page"]') ??
    null;

  // admin@nu.edu.eg can't mark availability, so it only gets the admin link
  const links: {
    label: string;
    href: string;
    icon: Parameters<typeof HugeiconsIcon>[0]["icon"];
  }[] = [];
  if (currentUser && !isSpecialAdmin)
    links.push({
      label: "Availability polls",
      href: "/polls",
      icon: Calendar03Icon,
    });
  if (isAdmin)
    links.push({
      label: "Admin Panel",
      href: "/admin",
      icon: DashboardSquare02Icon,
    });

  const isActive = (href: string) =>
    href === "/polls"
      ? pathname.startsWith("/polls") || pathname === "/"
      : pathname.startsWith(href);

  React.useEffect(() => {
    if (sessionStorage.getItem("nusu_password_reset_success")) {
      sessionStorage.removeItem("nusu_password_reset_success");
      toast.success("Password has been reset successfully!", {
        description: "Your new password is now active for future logins.",
        duration: 6000,
      });
    }
  }, []);

  React.useEffect(() => {
    if (isAdmin) router.prefetch("/admin");
  }, [isAdmin, router]);

  React.useLayoutEffect(() => {
    const element = nav.current;
    if (!element) return;
    let mounted = true;
    const measure = () => {
      if (mounted) showPill(activeLink());
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    void document.fonts.ready.then(measure);
    return () => {
      mounted = false;
      observer.disconnect();
    };
  }, [links.length, pathname, open, showPill]);

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => setOpen(false), [pathname]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        toggle.current?.focus();
      }
    };
    const onOutside = (event: PointerEvent) => {
      if (
        event.target instanceof Node &&
        !shell.current?.contains(event.target)
      )
        setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, [open]);

  const avatar = initials(currentUser?.name, currentUser?.email);

  return (
    <>
      <div
        className={cn("nav-backdrop", open && "open")}
        aria-hidden="true"
        onClick={() => setOpen(false)}
      />
      <div className="navbar-shell" ref={shell}>
        <header
          className={cn(
            "site-header",
            open && "menu-open",
            scrolled && "scrolled",
          )}
        >
          <Link
            href={isSpecialAdmin ? "/admin" : "/"}
            className="site-brand"
            aria-label="Nile University Student Union"
          >
            <NusuLogo size="sm" showText className="max-[767px]:hidden" />
            <NusuLogo
              size="sm"
              showText={false}
              className="min-[768px]:hidden"
            />
          </Link>

          <div id="main-navigation" className="nav-collapse">
            <div className="nav-collapse-inner">
              {links.length > 0 && (
                <nav
                  ref={nav}
                  aria-label="Main navigation"
                  onPointerOver={(event) => {
                    if (event.target instanceof Element) {
                      const link = event.target.closest("a");
                      if (link) showPill(link);
                    }
                  }}
                  onPointerLeave={() => showPill(activeLink())}
                  onFocus={(event) => {
                    if (event.target instanceof HTMLAnchorElement)
                      showPill(event.target);
                  }}
                  onBlur={(event) => {
                    if (!event.currentTarget.contains(event.relatedTarget))
                      showPill(activeLink());
                  }}
                >
                  <span
                    className="nav-pill"
                    aria-hidden="true"
                    style={
                      pill
                        ? {
                            width: pill.width,
                            height: pill.height,
                            transform: `translate(${pill.x}px, ${pill.y}px)`,
                          }
                        : { opacity: 0 }
                    }
                  />
                  {links.map((link) => {
                    const active = isActive(link.href);
                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        aria-current={active ? "page" : undefined}
                        className={cn("nav-link", active && "active")}
                        onClick={() => setOpen(false)}
                      >
                        <HugeiconsIcon
                          icon={link.icon}
                          size={18}
                          strokeWidth={2}
                          className="nav-symbol"
                        />
                        {link.label}
                      </Link>
                    );
                  })}
                </nav>
              )}

              {currentUser && (
                <div className="mobile-account">
                  <p className="truncate px-3.5 py-2 text-xs text-muted-foreground">
                    {currentUser.email}
                  </p>
                  <button
                    type="button"
                    className="nav-link nav-signout w-full"
                    onClick={() => {
                      setOpen(false);
                      setSignOutOpen(true);
                    }}
                  >
                    <HugeiconsIcon
                      icon={Logout02Icon}
                      size={18}
                      strokeWidth={2}
                      className="nav-symbol"
                    />
                    Sign out
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="account-actions">
            <ThemeToggle />
            {currentUser ? (
              <DropdownMenu>
                <DropdownMenuTrigger
                  className="account-trigger"
                  aria-label={`${avatar}, account menu`}
                >
                  <span className="account-avatar">{avatar}</span>
                  <HugeiconsIcon
                    icon={ArrowDown01Icon}
                    size={14}
                    className="text-muted-foreground"
                  />
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-[272px] p-1.5">
                  <div className="flex items-center gap-3 p-2.5">
                    <span className="account-avatar" aria-hidden="true">
                      {avatar}
                    </span>
                    <div className="grid min-w-0">
                      <strong className="truncate text-sm font-semibold text-foreground">
                        {currentUser.name || currentEmail?.split("@")[0]}
                      </strong>
                      <span className="truncate text-xs text-muted-foreground">
                        {currentUser.email}
                      </span>
                    </div>
                  </div>
                  <DropdownMenuSeparator />
                  {links.map((link) => (
                    <DropdownMenuItem
                      key={link.href}
                      className="min-h-11 gap-2.5"
                      onClick={() => router.push(link.href)}
                    >
                      <HugeiconsIcon icon={link.icon} size={16} />
                      {link.label}
                    </DropdownMenuItem>
                  ))}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    variant="destructive"
                    className="min-h-11 gap-2.5"
                    onClick={() => setSignOutOpen(true)}
                  >
                    <HugeiconsIcon icon={Logout02Icon} size={16} />
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Link
                href="/auth?mode=signin"
                className={cn(
                  buttonVariants({ variant: "default" }),
                  "min-h-11",
                )}
              >
                Sign in
              </Link>
            )}
          </div>

          {currentUser && (
            <button
              ref={toggle}
              type="button"
              className="nav-toggle"
              aria-label={open ? "Close menu" : "Open menu"}
              aria-expanded={open}
              aria-controls="main-navigation"
              onClick={() => setOpen(!open)}
            >
              <span aria-hidden="true">
                <span />
                <span />
                <span />
              </span>
            </button>
          )}
          <StatusPill />
        </header>
      </div>

      <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
    </>
  );
}
