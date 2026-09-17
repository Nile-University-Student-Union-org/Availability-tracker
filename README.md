# SU Availability Tracker

A focused web app that lets students and staff mark their availability across a target week (Apr 19–23, 2026). Each person picks their free 1-hour slots; an admin panel shows who is available when and identifies the best meeting times.

## Features

- Google OAuth sign-in — no passwords, no manual account creation
- Interactive weekly calendar — click any highlighted day, toggle time slots (8:30 AM – 5:30 PM)
- Persistent storage — slots are saved to PostgreSQL and shown on every page load
- Admin analytics panel — heatmap, best meeting times, daily participation bars, full participant list
- Dark / light mode toggle
- Responsive layout

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 15 (App Router, Server Components) |
| Auth | better-auth + Google OAuth + Prisma adapter |
| Database | PostgreSQL via Prisma ORM |
| UI | shadcn/ui (base-ui) + Tailwind CSS v4 |
| Icons | Hugeicons |

---

## 🎨 Brand & Color Palettes (Light & Dark Mode)

The design system is grounded in Nile University Student Union (NUSU) brand colors, pairing deep Nile Navy tones with high-visibility Availability Emerald and vibrant Nile Cyan accents. Both palettes use high-fidelity OKLCH color spaces for perceptual uniformity and WCAG AAA compliance.

### ☀️ Light Mode Palette

| Token | OKLCH Value | Approx. Hex | Role & Usage |
| --- | --- | --- | --- |
| `--background` | `oklch(0.985 0.005 240)` | `#F8FAFC` | Page background canvas (soft Nile porcelain) |
| `--foreground` | `oklch(0.145 0.03 250)` | `#0F172A` | Primary text and headings (deep navy slate) |
| `--card` | `oklch(1 0 0)` | `#FFFFFF` | Surface cards, dialogs, and popover menus |
| `--card-foreground` | `oklch(0.145 0.03 250)` | `#0F172A` | Card body copy and titles |
| `--primary` | `oklch(0.50 0.16 200)` | `#0284C7` | Primary buttons, interactive links, active focus rings |
| `--primary-foreground` | `oklch(0.99 0.002 240)` | `#FFFFFF` | Text on primary buttons (crisp white) |
| `--secondary` | `oklch(0.95 0.01 240)` | `#F1F5F9` | Secondary buttons, subtle pills, tags |
| `--secondary-foreground` | `oklch(0.20 0.03 250)` | `#1E293B` | Text on secondary elements |
| `--muted` | `oklch(0.95 0.01 240)` | `#F1F5F9` | Disabled states, hover fills, track backgrounds |
| `--muted-foreground` | `oklch(0.50 0.025 240)` | `#64748B` | Subtitles, placeholders, helper text |
| `--border` / `--input` | `oklch(0.90 0.008 240)` | `#E2E8F0` | Card borders, table dividers, input borders |
| `--ring` | `oklch(0.50 0.16 200)` | `#0284C7` | Focus ring highlights |
| **Availability Emerald** | `oklch(0.65 0.16 160)` | `#10B981` | Active slot cards, checkmarks, heatmap peak density |

---

### 🌙 Dark Mode Palette

| Token | OKLCH Value | Approx. Hex | Role & Usage |
| --- | --- | --- | --- |
| `--background` | `oklch(0.14 0.025 250)` | `#0D1424` | Deep Nile Midnight Navy background |
| `--foreground` | `oklch(0.97 0.008 240)` | `#F1F5F9` | High-contrast body text and headings |
| `--card` | `oklch(0.185 0.028 250)` | `#151F38` | Elevated Nile Slate cards, modals, popovers |
| `--card-foreground` | `oklch(0.97 0.008 240)` | `#F1F5F9` | Text inside cards and popovers |
| `--primary` | `oklch(0.70 0.15 198)` | `#38BDF8` | Luminous Nile Cyan interactive buttons & highlights |
| `--primary-foreground` | `oklch(0.12 0.03 250)` | `#090E1A` | Deep contrast text on primary buttons |
| `--secondary` | `oklch(0.23 0.025 250)` | `#1C2744` | Secondary button surfaces, subtle chips |
| `--secondary-foreground` | `oklch(0.92 0.01 240)` | `#E2E8F0` | Text on secondary elements |
| `--muted` | `oklch(0.22 0.022 250)` | `#1A243F` | Muted backgrounds, unselected slot cells |
| `--muted-foreground` | `oklch(0.70 0.02 245)` | `#94A3B8` | Clear, readable secondary text and IDs |
| `--border` / `--input` | `oklch(0.28 0.025 250)` | `#233256` | Card dividers, input outlines, crisp boundaries |
| `--ring` | `oklch(0.70 0.15 198)` | `#38BDF8` | Glowing focus outlines and active halos |
| **Availability Emerald** | `oklch(0.75 0.16 160)` | `#34D399` | Luminous emerald slots, checkmarks, heatmap peak |

---

## Getting Started

### Prerequisites

- **Node.js** 18 or later
- **pnpm** (`npm install -g pnpm`)
- **PostgreSQL** database — [Supabase](https://supabase.com), [Neon](https://neon.tech), [Railway](https://railway.app), or a local instance
- A **Google Cloud** project with OAuth 2.0 credentials (see below)

### 1. Install dependencies

```bash
pnpm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

Open `.env` and fill in every value.

| Variable | Description |
| --- | --- |
| `BETTER_AUTH_SECRET` | Random secret used to sign session tokens. Generate with `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | Public URL of the app — `http://localhost:3000` in dev, `https://your-domain.com` in production |
| `BETTER_AUTH_TRUSTED_ORIGINS` | Optional comma-separated extra trusted origins for auth requests (custom domains/previews) |
| `DATABASE_URL` | PostgreSQL connection string, e.g. `postgresql://user:pass@host:5432/db` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `ADMIN_EMAILS` | Comma-separated list of admin email addresses, e.g. `alice@example.com, bob@example.com` |

### 3. Set up Google OAuth

1. Go to [Google Cloud Console → Credentials](https://console.cloud.google.com/apis/credentials).
2. Select or create a project.
3. Click **Create Credentials → OAuth 2.0 Client ID**.
4. Set Application type to **Web application**.
5. Under **Authorized redirect URIs**, add:
   - Development: `http://localhost:3000/api/auth/callback/google`
   - Production: `https://your-domain.com/api/auth/callback/google`
6. Copy the **Client ID** and **Client Secret** into `.env`.

### 4. Run database migrations

```bash
pnpm prisma migrate deploy
```

For local development with auto-migration on schema changes:

```bash
pnpm prisma migrate dev
```

### 5. Start the dev server

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). You will be redirected to the sign-in page if you are not authenticated.

### iPhone and in-app browser note

Google OAuth may be blocked inside some iOS in-app browsers (for example WhatsApp/Instagram).  
The app includes an `/open-in-safari` handoff page to guide users into Safari when this happens.

---

## Admin Panel

### Enabling access

Add the Google email addresses of your admins to `.env`:

```env
ADMIN_EMAILS=alice@example.com, bob@example.com
```

Then navigate to `/admin` while signed in with one of those accounts.

### Security model

Every request to `/admin` runs two independent server-side checks before any data is returned:

1. **Session validation** — `auth.api.getSession()` verifies the session token against the database. A forged or tampered cookie is rejected here.
2. **Email authorization** — The verified email is compared against `ADMIN_EMAILS`. This variable lives only on the server and is never sent to the browser.

Requests that fail either check receive a generic **404** response, giving no indication the panel exists.

### Dashboard sections

#### Summary cards

| Card | Description |
| --- | --- |
| Participants | Number of users who have submitted at least one slot |
| Total Selections | Total individual time slots marked across all users |
| Peak Slot | The single slot where the most users are simultaneously free |
| Avg / User | Average number of slots per participant |

#### Availability Matrix

A 10-row × 5-column heatmap — rows are time slots (8:30 AM to 5:30 PM), columns are days (Apr 19–23). Each cell shows how many users are free, colored by density:

| Color | Meaning |
| --- | --- |
| Light green | 1–25% of the maximum user count |
| Medium green | 26–50% |
| Dark green | 51–75% |
| Deep green | 76–100% |

Click any cell to open a detail panel listing exactly which users are available at that time.

#### Best Meeting Times

Top 5 slots ranked by the number of available users. Each entry shows stacked user avatars and the exact count.

#### Daily Participation

Progress bars showing what fraction of participants have marked availability for each day of the week.

#### Participants

Full list of every participant, sorted by total slots, showing:

- Name, email address, and Google profile photo
- Total slot count (badge)
- Per-day breakdown — how many slots they marked each day

---

## Project Structure

```text
next-app/
├── app/
│   ├── admin/              # Admin analytics page (server component)
│   │   └── page.tsx
│   ├── api/
│   │   ├── auth/           # better-auth route handler
│   │   └── availability/   # GET and POST endpoints
│   ├── auth/               # Sign-in page
│   │   └── page.tsx
│   ├── globals.css
│   ├── layout.tsx          # Root layout, metadata, fonts
│   └── page.tsx            # Main availability calendar
├── components/
│   ├── admin/
│   │   └── analytics-dashboard.tsx   # Interactive analytics UI
│   ├── calendar/
│   │   ├── availability-calendar.tsx # Calendar + availability summary
│   │   ├── availability-dialog.tsx   # Time slot selection dialog
│   │   └── constants.ts              # WEEK_DATES, TIME_SLOTS, labels
│   ├── navbar/
│   │   └── navbar.tsx                # Top nav with theme toggle + avatar menu
│   ├── ui/                           # shadcn/ui primitives
│   ├── google-sign-in-button.tsx
│   └── theme-provider.tsx
├── lib/
│   ├── admin.ts            # ADMIN_EMAILS parsing + isAdminEmail()
│   ├── auth.ts             # better-auth server configuration
│   ├── auth-client.ts      # Client-side auth helpers
│   └── prisma.ts           # Prisma singleton (HMR-safe)
├── prisma/
│   └── schema.prisma       # User, Session, Account, Availability models
├── public/
│   └── logo.svg
├── middleware.ts            # Protects all routes except /auth and static files
└── .env.example            # Environment variable reference
```

---

## Database Schema

The `Availability` table stores one record per user per time slot per day:

```prisma
model Availability {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(...)
  date      DateTime @db.Date   // e.g. 2026-04-19
  startTime String              // e.g. "08:30"

  @@unique([userId, date, startTime])
}
```

Saving availability for a day is always an atomic **replace** operation (delete all existing slots for that day, then insert the new set), preventing stale or duplicate data.

---

## Available Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Start development server with Turbopack |
| `pnpm build` | Create production build |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |
| `pnpm prisma studio` | Open Prisma Studio (visual DB browser) |
| `pnpm prisma migrate dev` | Create and apply a new migration |
