"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInset,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
} from "@/components/ui/sidebar"
import { HugeiconsIcon } from "@hugeicons/react"
import {
  DashboardSquare02Icon,
  Calendar03Icon,
  Shield01Icon,
  Home01Icon,
  Logout02Icon,
  ArrowRight01Icon,
  UserGroupIcon,
} from "@hugeicons/core-free-icons"
import { ThemeToggle } from "@/components/theme-toggle"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { authClient } from "@/lib/auth-client"
import {
  AnalyticsDashboard,
  type AnalyticsData,
} from "@/components/admin/analytics-dashboard"
import { ScheduleConfigPanel } from "@/components/admin/schedule-config-panel"
import { AdminUsersPanel } from "@/components/admin/admin-users-panel"
import { NusuLogo } from "@/components/nusu-logo"
import { cn } from "@/lib/utils"

export type AdminTab = "analytics" | "schedule" | "admins"

interface AdminLayoutShellProps {
  session: {
    user: {
      id: string
      name: string
      email: string
      image?: string | null
      committee?: string | null
      role?: string | null
    }
  }
  analytics: AnalyticsData
  dateRangeLabel: string
  initialTab?: AdminTab
}

export function AdminLayoutShell({
  session,
  analytics,
  dateRangeLabel,
  initialTab = "analytics",
}: AdminLayoutShellProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const tabParam = (searchParams.get("tab") as AdminTab) || initialTab
  const [activeTab, setActiveTab] = React.useState<AdminTab>(tabParam)

  React.useEffect(() => {
    const qTab = searchParams.get("tab") as AdminTab
    if (qTab && ["analytics", "schedule", "admins"].includes(qTab)) {
      setActiveTab(qTab)
    }
  }, [searchParams])

  const setTab = (tab: AdminTab) => {
    setActiveTab(tab)
    const url = new URL(window.location.href)
    url.searchParams.set("tab", tab)
    window.history.replaceState({}, "", url.toString())
  }

  async function handleSignOut() {
    await authClient.signOut({
      fetchOptions: { onSuccess: () => router.push("/auth") },
    })
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/)
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
    }
    return email?.slice(0, 2).toUpperCase() ?? "AD"
  }

  return (
    <SidebarProvider>
      <div className="flex min-h-svh w-full bg-background">
        <Sidebar variant="inset" collapsible="icon">
          {/* Sidebar Header with NUSU Brand Emblem */}
          <SidebarHeader>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  size="lg"
                  tooltip="NUSU Admin Console"
                  onClick={() => setTab("analytics")}
                  className="cursor-pointer"
                >
                  <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#0F3056] to-[#018BCE] text-white shadow-xs">
                    <NusuLogo
                      size="sm"
                      showText={false}
                      className="size-5 brightness-0 invert"
                    />
                  </div>
                  <div className="flex min-w-0 flex-col gap-0.5 leading-none">
                    <span className="text-[11px] font-bold tracking-[0.25em] text-[#0F3056] uppercase dark:text-white">
                      NUSU
                    </span>
                    <span className="text-[8px] font-semibold tracking-[0.3em] text-[#018BCE] uppercase">
                      Admin Console
                    </span>
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarHeader>

          {/* Navigation Groups */}
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel>Availability & Intelligence</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Availability Analytics"
                      isActive={activeTab === "analytics"}
                      onClick={() => setTab("analytics")}
                      className="cursor-pointer font-medium"
                    >
                      <HugeiconsIcon
                        icon={DashboardSquare02Icon}
                        size={16}
                        strokeWidth={2}
                      />
                      <span>Analytics Dashboard</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Schedule Settings</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Schedule Configuration"
                      isActive={activeTab === "schedule"}
                      onClick={() => setTab("schedule")}
                      className="cursor-pointer font-medium"
                    >
                      <HugeiconsIcon
                        icon={Calendar03Icon}
                        size={16}
                        strokeWidth={2}
                      />
                      <span>Schedule Config</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel>Access & Permissions</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Admin Access & Roles"
                      isActive={activeTab === "admins"}
                      onClick={() => setTab("admins")}
                      className="cursor-pointer font-medium"
                    >
                      <HugeiconsIcon
                        icon={Shield01Icon}
                        size={16}
                        strokeWidth={2}
                      />
                      <span>Admin Management</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup className="mt-auto">
              <SidebarGroupLabel>Quick Links</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="View Live Calendar"
                      onClick={() => router.push("/")}
                      className="cursor-pointer"
                    >
                      <HugeiconsIcon
                        icon={Home01Icon}
                        size={16}
                        strokeWidth={2}
                      />
                      <span>Member Calendar</span>
                      <HugeiconsIcon
                        icon={ArrowRight01Icon}
                        size={13}
                        className="ml-auto opacity-50"
                      />
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          {/* Sidebar Footer with User Details */}
          <SidebarFooter>
            <SidebarSeparator />
            <SidebarMenu>
              <SidebarMenuItem>
                <div className="flex items-center justify-between rounded-xl border border-border/60 bg-card/60 p-2">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <Avatar className="size-8 shrink-0 ring-1 ring-primary/20">
                      <AvatarImage src={session.user.image ?? undefined} />
                      <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                        {getInitials(session.user.name, session.user.email)}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex min-w-0 flex-col">
                      <span className="truncate text-xs leading-tight font-semibold">
                        {session.user.name}
                      </span>
                      <span className="text-[10px] font-semibold tracking-wider text-primary uppercase">
                        Administrator
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSignOut}
                    className="size-7 rounded-lg p-0 text-destructive hover:bg-destructive/10"
                    title="Sign out"
                  >
                    <HugeiconsIcon icon={Logout02Icon} size={14} />
                  </Button>
                </div>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarFooter>
        </Sidebar>

        {/* Sidebar Inset: Header Bar + Dynamic Page Content */}
        <SidebarInset>
          {/* Top Bar Header */}
          <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger />
              <div className="h-4 w-px bg-border" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Admin Console
                </span>
                <span>/</span>
                <span className="capitalize">
                  {activeTab === "analytics" && "Availability Analytics"}
                  {activeTab === "schedule" && "Schedule Configuration"}
                  {activeTab === "admins" && "Admin Access & Roles"}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <ThemeToggle />
              <Link
                href="/"
                className="hidden items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold transition-colors hover:bg-secondary/80 sm:inline-flex"
              >
                <HugeiconsIcon icon={Home01Icon} size={13} />
                <span>Live Schedule</span>
              </Link>
            </div>
          </header>

          {/* Main Content Area */}
          <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-8 sm:py-8">
            {/* Header Banner */}
            <div className="mb-8 flex flex-col justify-between gap-4 border-b border-border pb-5 sm:flex-row sm:items-end">
              <div>
                <p className="mb-1.5 text-[11px] font-semibold tracking-[0.25em] text-primary uppercase">
                  NUSU Administration
                </p>
                <h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                  {activeTab === "analytics" && "Availability Analytics"}
                  {activeTab === "schedule" && "Schedule Configuration"}
                  {activeTab === "admins" && "Administrator Management"}
                </h1>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  {activeTab === "analytics" &&
                    `Comprehensive heatmap and member booking analytics · ${dateRangeLabel}`}
                  {activeTab === "schedule" &&
                    "Configure active calendar date boundaries, slot intervals, and booking modes."}
                  {activeTab === "admins" &&
                    "Authorize university emails with administrative privileges to manage the Union Tracker."}
                </p>
              </div>

              {/* Navigation Tabs Pill Switcher */}
              <div className="inline-flex items-center gap-1 self-start rounded-xl border border-border/80 bg-muted/60 p-1 sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTab("analytics")}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    activeTab === "analytics"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Analytics
                </button>
                <button
                  type="button"
                  onClick={() => setTab("schedule")}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    activeTab === "schedule"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Schedule
                </button>
                <button
                  type="button"
                  onClick={() => setTab("admins")}
                  className={cn(
                    "cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-all",
                    activeTab === "admins"
                      ? "bg-background text-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Admins
                </button>
              </div>
            </div>

            {/* Dynamic Tab Body */}
            <div>
              {activeTab === "analytics" && (
                <AnalyticsDashboard data={analytics} />
              )}
              {activeTab === "schedule" && (
                <div className="max-w-2xl">
                  <ScheduleConfigPanel />
                </div>
              )}
              {activeTab === "admins" && (
                <div className="max-w-3xl">
                  <AdminUsersPanel />
                </div>
              )}
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}
