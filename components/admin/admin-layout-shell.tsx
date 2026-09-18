"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
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
} from "@/components/ui/sidebar";
import { HugeiconsIcon } from "@hugeicons/react";
import {
  Calendar03Icon,
  Clock01Icon,
  Shield01Icon,
  UserGroupIcon,
  Home01Icon,
  Logout02Icon,
  ArrowRight01Icon,
} from "@hugeicons/core-free-icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SignOutDialog } from "@/components/auth/sign-out-dialog";
import dynamic from "next/dynamic";
import {
  AnalyticsDashboard,
  type AnalyticsData,
} from "@/components/admin/analytics-dashboard";
import type { SemesterAnalyticsData } from "@/lib/semester-analytics";
import type { ScheduleConfigData } from "@/components/admin/schedule-config-panel";
import type { AdminUserInfo } from "@/lib/admin";
import { NusuLogo } from "@/components/nusu-logo";

const SemesterAnalyticsPanel = dynamic(
  () =>
    import("@/components/admin/semester-analytics-panel").then(
      (m) => m.SemesterAnalyticsPanel,
    ),
  {
    loading: () => (
      <div className="flex h-40 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  },
);

const ScheduleConfigPanel = dynamic(
  () =>
    import("@/components/admin/schedule-config-panel").then(
      (m) => m.ScheduleConfigPanel,
    ),
  {
    loading: () => (
      <div className="flex h-40 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  },
);

const AdminUsersPanel = dynamic(
  () =>
    import("@/components/admin/admin-users-panel").then(
      (m) => m.AdminUsersPanel,
    ),
  {
    loading: () => (
      <div className="flex h-40 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  },
);

const AdminMembersPanel = dynamic(
  () =>
    import("@/components/admin/admin-members-panel").then(
      (m) => m.AdminMembersPanel,
    ),
  {
    loading: () => (
      <div className="flex h-40 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  },
);

export type AdminTab =
  | "specific-analytics"
  | "semester-analytics"
  | "analytics"
  | "schedule"
  | "admins"
  | "members";

interface AdminLayoutShellProps {
  session: {
    user: {
      id: string;
      name: string;
      email: string;
      image?: string | null;
      committee?: string | null;
      role?: string | null;
    };
  };
  analytics: AnalyticsData;
  semesterAnalytics: SemesterAnalyticsData;
  dateRangeLabel: string;
  initialTab?: AdminTab;
  initialConfig?: ScheduleConfigData | null;
  initialAdmins?: AdminUserInfo[];
}

export function AdminLayoutShell({
  session,
  analytics,
  semesterAnalytics,
  dateRangeLabel,
  initialTab = "specific-analytics",
  initialConfig = null,
  initialAdmins = [],
}: AdminLayoutShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = (searchParams.get("tab") as AdminTab) || initialTab;
  const [activeTab, setActiveTab] = React.useState<AdminTab>(tabParam);

  React.useEffect(() => {
    const qTab = searchParams.get("tab") as AdminTab;
    if (
      qTab &&
      [
        "specific-analytics",
        "semester-analytics",
        "analytics",
        "schedule",
        "admins",
        "members",
      ].includes(qTab)
    ) {
      setActiveTab(qTab);
    }
  }, [searchParams]);

  const setTab = (tab: AdminTab) => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tab);
    window.history.replaceState({}, "", url.toString());
  };

  const [signOutOpen, setSignOutOpen] = React.useState(false);

  function handleSignOut() {
    setSignOutOpen(true);
  }

  const getInitials = (name?: string, email?: string) => {
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return email?.slice(0, 2).toUpperCase() ?? "AD";
  };

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
                      tooltip="Specific Date Analytics"
                      isActive={
                        activeTab === "specific-analytics" ||
                        activeTab === "analytics"
                      }
                      onClick={() => setTab("specific-analytics")}
                      className="cursor-pointer font-medium"
                    >
                      <HugeiconsIcon
                        icon={Calendar03Icon}
                        size={16}
                        strokeWidth={2}
                      />
                      <span>Specific Date Analytics</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Semester Availability Analytics"
                      isActive={activeTab === "semester-analytics"}
                      onClick={() => setTab("semester-analytics")}
                      className="cursor-pointer font-medium"
                    >
                      <HugeiconsIcon
                        icon={Clock01Icon}
                        size={16}
                        strokeWidth={2}
                        className="text-emerald-500"
                      />
                      <span>Semester Analytics</span>
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
              <SidebarGroupLabel>Members & Access</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Registered Union Members"
                      isActive={activeTab === "members"}
                      onClick={() => setTab("members")}
                      className="cursor-pointer font-medium"
                    >
                      <HugeiconsIcon
                        icon={UserGroupIcon}
                        size={16}
                        strokeWidth={2}
                      />
                      <span>Members Directory</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

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
            <div className="flex items-center gap-3 px-2 py-2">
              <Avatar className="size-9 ring-1 ring-border">
                {session.user.image && (
                  <AvatarImage
                    src={session.user.image}
                    alt={session.user.name}
                  />
                )}
                <AvatarFallback className="bg-primary/10 font-heading text-xs font-bold text-primary">
                  {getInitials(session.user.name, session.user.email)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-semibold leading-none">
                  {session.user.name}
                </p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {session.user.email}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleSignOut}
                className="size-8 cursor-pointer rounded-lg text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                title="Sign out of Admin Console"
              >
                <HugeiconsIcon icon={Logout02Icon} size={15} />
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        {/* Inset Main Layout Container */}
        <SidebarInset className="flex min-w-0 flex-1 flex-col bg-background/50">
          {/* Top Navbar */}
          <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="cursor-pointer" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Admin Console
                </span>
                <span>/</span>
                <span className="capitalize">
                  {activeTab === "analytics" && "Availability Analytics"}
                  {activeTab === "schedule" && "Schedule Configuration"}
                  {activeTab === "admins" && "Admin Access & Roles"}
                  {activeTab === "members" && "Members Directory"}
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
                  {(activeTab === "specific-analytics" ||
                    activeTab === "analytics") &&
                    "Specific Date Analytics"}
                  {activeTab === "semester-analytics" &&
                    "Semester Availability Analytics"}
                  {activeTab === "schedule" && "Schedule Configuration"}
                  {activeTab === "admins" && "Administrator Management"}
                  {activeTab === "members" && "Union Members Directory"}
                </h1>
                <p className="mt-1 text-xs text-muted-foreground sm:text-sm">
                  {(activeTab === "specific-analytics" ||
                    activeTab === "analytics") &&
                    `Campaign heatmap and member booking analytics · ${dateRangeLabel}`}
                  {activeTab === "semester-analytics" &&
                    "Standing weekly timetable heatmap and Golden Slot meeting recommendations."}
                  {activeTab === "schedule" &&
                    "Configure availability mode toggles, active date boundaries, and slot intervals."}
                  {activeTab === "admins" &&
                    "Authorize university emails with administrative privileges to manage the Union Tracker."}
                  {activeTab === "members" &&
                    "Directory of all registered Union members. Copy student IDs, reset member passwords, or delete accounts."}
                </p>
              </div>
            </div>

            {/* Dynamic Tab Body */}
            <div>
              {(activeTab === "specific-analytics" ||
                activeTab === "analytics") && (
                <AnalyticsDashboard data={analytics} />
              )}
              {activeTab === "semester-analytics" && (
                <SemesterAnalyticsPanel initialData={semesterAnalytics} />
              )}
              {activeTab === "schedule" && (
                <div className="max-w-2xl">
                  <ScheduleConfigPanel initialConfig={initialConfig} />
                </div>
              )}
              {activeTab === "admins" && (
                <div className="max-w-3xl">
                  <AdminUsersPanel initialAdmins={initialAdmins} />
                </div>
              )}
              {activeTab === "members" && (
                <AdminMembersPanel
                  currentUserId={session.user.id}
                  currentUserEmail={session.user.email}
                />
              )}
            </div>
          </main>
        </SidebarInset>

        {/* Confirmation Popup for Sign Out */}
        <SignOutDialog open={signOutOpen} onOpenChange={setSignOutOpen} />
      </div>
    </SidebarProvider>
  );
}
