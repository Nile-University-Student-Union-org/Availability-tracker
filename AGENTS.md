# AGENTS.md — Nile University Student Union (NUSU) Availability Tracker

This document serves as the operational guide and behavioral protocol for AI pair programming agents working on this repository.

---

## 1. Project Overview & Tech Stack

- **Application**: Nile University Student Union (NUSU) Member Availability Tracker & Meeting Scheduler.
- **Framework**: Next.js 16 (App Router, Server Components, Turbopack, React 19).
- **Styling**: Tailwind CSS v4 (`@tailwindcss/postcss`), shadcn/ui (Base UI primitives + Vaul Drawer), HugeIcons, and Lucide React.
- **Database & Persistence**:
  - PostgreSQL 17 Alpine via Docker (`nusu-postgres` container on port 5432)
  - Dedicated database: `availability_tracker`
  - Prisma ORM 6 (`prisma/schema.prisma` with `@prisma/client`)
- **Authentication**: Better Auth (`lib/auth.ts`, `lib/auth-client.ts`) with Email/Password & Google OAuth support.
- **Package Manager**: `pnpm`.

---

## 2. Session Lifecycle Automation (MANDATORY RULES)

### Command: `terminate`
Whenever the user says **"terminate"** (or requests to end/wrap up the session):
1. **Stop Development Server**:
   Terminate any running background dev server process (`pnpm dev`).
2. **Generate / Update `handoff.md`**:
   Write or update `handoff.md` at the project root (`d:\SU\Availability-tracker\handoff.md`) containing:
   - Summary of work completed in the session
   - Current system status (PostgreSQL database, dev server, builds, typecheck)
   - Modified files and key architectural/design decisions
   - Immediate next steps and pending tasks for the next session
3. **Sign-off**:
   Provide a concise confirmation message that the dev server has been stopped and `handoff.md` is ready for the next session.

### Command: `start`
Whenever the user says **"start"** (or begins a new session):
1. **Read Handoff**:
   Inspect `handoff.md` at the project root to load the context and pending items from the previous session.
2. **Verify Database Service**:
   Check that PostgreSQL is accessible on port 5432 (or verify container `nusu-postgres` is running via `docker ps`).
3. **Start Development Server**:
   Execute `pnpm dev` via `run_command` (as a background daemon process with `IsDaemon: true`) to ensure the local dev server is active on `http://localhost:3000/`.
4. **Provide Quick Recap**:
   Deliver a very quick, bulleted recap:
   - Summary of what was accomplished in the last session
   - Status of services (PostgreSQL and Next.js dev server on `http://localhost:3000`)
   - Suggested next priorities

---

## 3. Brand & Design System Guidelines

- **NUSU Brand & Theme Colors**:
  - **Deep Nile Navy / Background**: Clean dark & light modes via `next-themes`
  - **Availability Emerald**: `emerald-500` / `emerald-600` (Used for active marked slots, checkmarks, density matrix heatmap)
  - **Interactive Primary**: Soft primary highlights with glowing rings and micro-animations
- **Mobile-First Invariants**:
  - **No Centered Modals on Mobile**: Slot selection on mobile (`< 768px`) MUST use a swipeable bottom sheet drawer (`components/ui/drawer.tsx` via Vaul) with native pull handles, smooth momentum, and sticky bottom action buttons.
  - **No Native `--:-- --` Time Inputs**: Never use browser-native `<input type="time">`. Always use the custom `TimePicker` (`components/ui/time-picker.tsx`) with quick slot presets and segmented custom hour/minute/period selectors.
  - **Thumb-Friendly Touch Targets**: All interactive slot cards and navigation buttons on mobile MUST have at least `min-h-[44px]` (or `min-h-[56px]` for slot cards) and `touch-manipulation active:scale-[0.97]`.
  - **Full Interval Display**: Time cards must display full start-to-end ranges (e.g. `08:30 AM → 09:30 AM`) rather than just start times.

---

## 4. Key Developer Commands

- **Development Server**: `pnpm dev` (runs on `http://localhost:3000/`)
- **Type Checking**: `pnpm typecheck` (`tsc --noEmit`)
- **Linting**: `pnpm lint` (`eslint`)
- **Code Formatting**: `pnpm format` (`prettier --write "**/*.{ts,tsx}"`)
- **Production Build**: `pnpm build` (`prisma generate && next build`)
- **Database Operations**:
  - Sync Schema: `pnpm prisma:push`
  - Deploy Migrations: `pnpm prisma:migrate:deploy`
  - Generate Client: `pnpm prisma:generate`
  - Database GUI: `pnpm prisma:studio`
  - Seed Default Schedule: `pnpm prisma:seed`
- **Admin Setup Endpoint**:
  - `http://localhost:3000/api/setup-admin` (initializes or resets admin: `admin@nu.edu.eg` / `***REMOVED***`)
