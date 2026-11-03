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
  Shield01Icon,
  UserGroupIcon,
  Home01Icon,
  Logout02Icon,
  ArrowRight01Icon,
  Briefcase01Icon,
  InboxIcon,
  DashboardSquare01Icon,
} from "@hugeicons/core-free-icons";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { StatusPill } from "@/components/status-pill";
import { SignOutDialog } from "@/components/auth/sign-out-dialog";
import dynamic from "next/dynamic";
import type { AdminPoll, PollViewer } from "@/components/admin/poll-badges";
import { AdminOverview } from "@/components/admin/admin-overview";
import type { AdminUserInfo } from "@/lib/admin";
import { NusuLogo } from "@/components/nusu-logo";

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
  | "overview"
  | "polls"
  | "requests"
  | "admins"
  | "members"
  | "committees";

const ADMIN_TABS: AdminTab[] = [
  "overview",
  "polls",
  "requests",
  "admins",
  "members",
  "committees",
];

// Old links: the schedule page and the per-type analytics pages now live in Polls
const LEGACY_TABS: Record<string, AdminTab> = {
  schedule: "polls",
  analytics: "polls",
  "specific-analytics": "polls",
  "semester-analytics": "polls",
};

function parseTab(value: string | null): AdminTab | null {
  if (value && LEGACY_TABS[value]) return LEGACY_TABS[value];
  return ADMIN_TABS.includes(value as AdminTab) ? (value as AdminTab) : null;
}

const TAB_TITLES: Record<AdminTab, string> = {
  overview: "Overview",
  polls: "Polls",
  requests: "Poll Requests",
  admins: "Administrator Management",
  members: "Union Members Directory",
  committees: "Union Committees Management",
};

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
  initialTab?: AdminTab;
  initialAdmins?: AdminUserInfo[];
  viewer: PollViewer;
  committees: string[];
  pendingCount: number;
  /** Visible polls with response counts, for the overview */
  overviewPolls: AdminPoll[];
}

export function AdminLayoutShell({
  session,
  initialTab = "overview",
  initialAdmins = [],
  viewer,
  committees,
  pendingCount: initialPendingCount,
  overviewPolls,
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

  /** Switch section; extra params (a poll to open) replace the old ones */
  // Bumped on every navigation so a section reopens at its start (e.g. Polls list)
  const [navKey, setNavKey] = React.useState(0);
  const setTab = (tab: AdminTab, params: Record<string, string> = {}) => {
    setActiveTab(tab);
    setNavKey((k) => k + 1);
    const url = new URL(window.location.href);
    url.search = "";
    url.searchParams.set("tab", tab);
    for (const [key, value] of Object.entries(params))
      url.searchParams.set(key, value);
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
                  onClick={() => setTab("overview")}
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
              <SidebarGroupLabel>Workspace</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      tooltip="Overview"
                      isActive={activeTab === "overview"}
                      onClick={() => setTab("overview")}
                      className="cursor-pointer font-medium"
                    >
                      <HugeiconsIcon
                        icon={DashboardSquare01Icon}
                        size={16}
                        strokeWidth={2}
                      />
                      <span>Overview</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>

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
              <SidebarTrigger className="size-11 cursor-pointer touch-manipulation md:size-8" />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-semibold text-foreground">
                  Admin Console
                </span>
                <span>/</span>
                <span>
                  {TAB_TITLES[activeTab].replace(/^Union | Management$/g, "")}
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
                  {TAB_TITLES[activeTab]}
                </h1>
              </div>
            </div>

            {/* Dynamic Tab Body */}
            <div>
              {activeTab === "overview" && (
                <AdminOverview
                  viewer={viewer}
                  polls={overviewPolls}
                  pendingCount={pendingCount}
                  onOpenPoll={(id, view) =>
                    setTab("polls", {
                      poll: id,
                      ...(view === "settings" ? { view } : {}),
                    })
                  }
                  onOpenRequests={() => setTab("requests")}
                  onNewPoll={() => setTab("polls", { new: "1" })}
                />
              )}
              {activeTab === "polls" && (
                <PollsPanel
                  key={navKey}
                  viewer={viewer}
                  committees={committees}
                />
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
                  viewer={viewer}
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
