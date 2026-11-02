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
  Briefcase01Icon,
  InboxIcon,
} from "@hugeicons/core-free-icons";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-pill";
import { SignOutDialog } from "@/components/auth/sign-out-dialog";
import dynamic from "next/dynamic";
import {
  AnalyticsDashboard,
  type AnalyticsData,
} from "@/components/admin/analytics-dashboard";
import type { SemesterAnalyticsData } from "@/lib/semester-analytics";
import type { PollViewer } from "@/components/admin/polls-panel";
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

const PollsPanel = dynamic(
  () => import("@/components/admin/polls-panel").then((m) => m.PollsPanel),
  {
    loading: () => (
      <div className="flex h-40 items-center justify-center">
        <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    ),
  },
);

const PollRequestsPanel = dynamic(
  () =>
    import("@/components/admin/poll-requests-panel").then(
      (m) => m.PollRequestsPanel,
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

const AdminCommitteesPanel = dynamic(
  () =>
    import("@/components/admin/admin-committees-panel").then(
      (m) => m.AdminCommitteesPanel,
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
  | "polls"
  | "requests"
  | "admins"
  | "members"
  | "committees";

const ADMIN_TABS: AdminTab[] = [
  "specific-analytics",
  "semester-analytics",
  "analytics",
  "polls",
  "requests",
  "admins",
  "members",
  "committees",
];

/** Reads ?tab=, keeping old "schedule" links working */
function parseTab(value: string | null): AdminTab | null {
  if (value === "schedule") return "polls";
  return ADMIN_TABS.includes(value as AdminTab) ? (value as AdminTab) : null;
}

export type AnalyticsPollOption = { id: string; name: string };

/** Switches which poll an analytics tab shows; the server reloads the data */
function PollPicker({
  tab,
  polls,
  value,
}: {
  tab: AdminTab;
  polls: AnalyticsPollOption[];
  value: string | null;
}) {
  const router = useRouter();
  if (polls.length < 2) return null;
  return (
    <Select
      value={value}
      items={polls.map((p) => ({ value: p.id, label: p.name }))}
      onValueChange={(id) => id && router.push(`/admin?tab=${tab}&poll=${id}`)}
    >
      <SelectTrigger
        aria-label="Poll"
        className="mb-5 min-h-[44px] w-full max-w-sm bg-background/60 text-sm font-semibold"
      >
        <SelectValue placeholder="Choose a poll" />
      </SelectTrigger>
      <SelectContent>
        {polls.map((p) => (
          <SelectItem key={p.id} value={p.id} className="text-sm">
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function NoPolls() {
  return (
    <div className="rounded-3xl border border-dashed border-border px-6 py-14 text-center text-sm text-muted-foreground">
      No polls of this type you can see results for yet.
    </div>
  );
}

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
  initialTab?: AdminTab;
  initialAdmins?: AdminUserInfo[];
  viewer: PollViewer;
  committees: string[];
  pendingCount: number;
  datePolls: AnalyticsPollOption[];
  weeklyPolls: AnalyticsPollOption[];
  datePollId: string | null;
  weeklyPollId: string | null;
}

export function AdminLayoutShell({
  session,
  analytics,
  semesterAnalytics,
  initialTab = "specific-analytics",
  initialAdmins = [],
  viewer,
  committees,
  pendingCount: initialPendingCount,
  datePolls,
  weeklyPolls,
  datePollId,
  weeklyPollId,
}: AdminLayoutShellProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = parseTab(searchParams.get("tab")) ?? initialTab;
  const [activeTab, setActiveTab] = React.useState<AdminTab>(tabParam);
  const [pendingCount, setPendingCount] = React.useState(initialPendingCount);

  React.useEffect(() => {
    setPendingCount(initialPendingCount);
  }, [initialPendingCount]);

  React.useEffect(() => {
    const qTab = parseTab(searchParams.get("tab"));
    if (qTab) setActiveTab(qTab);
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
                      tooltip="Polls"
                      isActive={activeTab === "polls"}
                      onClick={() => setTab("polls")}
                      className="cursor-pointer font-medium"
                    >
                      <HugeiconsIcon
                        icon={Calendar03Icon}
                        size={16}
                        strokeWidth={2}
                      />
                      <span>Polls</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

                  {viewer.isSuperAdmin && (
                    <SidebarMenuItem>
                      <SidebarMenuButton
                        tooltip={
                          pendingCount
                            ? `Requests (${pendingCount} waiting)`
                            : "Requests"
                        }
                        isActive={activeTab === "requests"}
                        onClick={() => setTab("requests")}
                        className="cursor-pointer font-medium"
                      >
                        <HugeiconsIcon
                          icon={InboxIcon}
                          size={16}
                          strokeWidth={2}
                        />
                        <span>Requests</span>
                        {pendingCount > 0 && (
                          <span
                            aria-label={`${pendingCount} waiting`}
                            className="ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[11px] font-bold tabular-nums text-amber-950 group-data-[collapsible=icon]:hidden"
                          >
                            {pendingCount}
                          </span>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )}
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

                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Manage Committees"
                      isActive={activeTab === "committees"}
                      onClick={() => setTab("committees")}
                      className="cursor-pointer font-medium"
                    >
                      <HugeiconsIcon
                        icon={Briefcase01Icon}
                        size={16}
                        strokeWidth={2}
                      />
                      <span>Committees</span>
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
          <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
            <div className="flex items-center gap-3">
              <SidebarTrigger className="cursor-pointer" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Admin Console
                </span>
                <span>/</span>
                <span className="capitalize">
                  {(activeTab === "analytics" ||
                    activeTab === "specific-analytics") &&
                    "Specific Date Analytics"}
                  {activeTab === "semester-analytics" && "Semester Analytics"}
                  {activeTab === "polls" && "Polls"}
                  {activeTab === "requests" && "Requests"}
                  {activeTab === "admins" && "Admin Access & Roles"}
                  {activeTab === "members" && "Members Directory"}
                  {activeTab === "committees" && "Committees Management"}
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
            <StatusPill />
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
                  {activeTab === "polls" && "Polls"}
                  {activeTab === "requests" && "Poll Requests"}
                  {activeTab === "admins" && "Administrator Management"}
                  {activeTab === "members" && "Union Members Directory"}
                  {activeTab === "committees" && "Union Committees Management"}
                </h1>
              </div>
            </div>

            {/* Dynamic Tab Body */}
            <div>
              {(activeTab === "specific-analytics" ||
                activeTab === "analytics") &&
                (datePollId ? (
                  <>
                    <PollPicker
                      tab="specific-analytics"
                      polls={datePolls}
                      value={datePollId}
                    />
                    <AnalyticsDashboard
                      key={datePollId}
                      data={analytics}
                      pollId={datePollId}
                    />
                  </>
                ) : (
                  <NoPolls />
                ))}
              {activeTab === "semester-analytics" &&
                (weeklyPollId ? (
                  <>
                    <PollPicker
                      tab="semester-analytics"
                      polls={weeklyPolls}
                      value={weeklyPollId}
                    />
                    <SemesterAnalyticsPanel
                      key={weeklyPollId}
                      initialData={semesterAnalytics}
                      pollId={weeklyPollId}
                    />
                  </>
                ) : (
                  <NoPolls />
                ))}
              {activeTab === "polls" && (
                <div className="max-w-2xl">
                  <PollsPanel viewer={viewer} committees={committees} />
                </div>
              )}
              {activeTab === "requests" && viewer.isSuperAdmin && (
                <div className="max-w-2xl">
                  <PollRequestsPanel onCountChange={setPendingCount} />
                </div>
              )}
              {activeTab === "admins" && (
                <div className="max-w-3xl">
                  <AdminUsersPanel
                    initialAdmins={initialAdmins}
                    canManage={viewer.isSuperAdmin}
                  />
                </div>
              )}
              {activeTab === "members" && (
                <AdminMembersPanel
                  currentUserId={session.user.id}
                  currentUserEmail={session.user.email}
                />
              )}
              {activeTab === "committees" && (
                <AdminCommitteesPanel canManage={viewer.isSuperAdmin} />
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
