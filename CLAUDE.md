# CLAUDE.md — Laza

## Commands
- `npm run dev` — Start dev server (Next.js with Turbopack)
- `npm run build` — Production build
- `npm run lint` — Run ESLint

## Project Overview
Laza is an inventory management SaaS for a dessert cafe chain. It has a public-facing website (menu, catering, franchise inquiries) and an internal dashboard for managing inventory, storage spaces, employees, and locations across multiple cafe sites.

## Tech Stack
- **Framework**: Next.js (App Router)
- **Auth**: Clerk (`@clerk/nextjs`) with org roles (`admin`, `member`)
- **Database**: Supabase (PostgreSQL)
- **Data fetching**: TanStack React Query
- **State management**: Zustand (persisted stores)
- **UI**: shadcn/ui + Tailwind CSS + Framer Motion
- **Email**: React Email + Resend
- **Language**: TypeScript (strict mode)

## Project Structure
```
app/
  (home)/          — Public pages (menu, about, catering, join-us, checkout)
  (auth)/sign-in/  — Clerk sign-in
  (dashboard)/
    admin/         — Admin dashboard (inventory, items, categories, locations, users, settings)
    employee/      — Employee dashboard (activity, profile, storage-spaces)
  actions/         — Server actions (Google reviews, notification processing)
components/        — Shared components (40+) + components/ui/ (shadcn primitives)
lib/
  supabase/
    client.ts      — Browser Supabase client (anon key)
    server.ts      — Server Supabase client (Clerk auth token)
    queries/       — Raw Supabase query functions (per domain: inventory, items, categories, etc.)
    mutations/     — Supabase mutation functions
    subscriptions.ts — Realtime subscriptions
    types.ts       — Database types
  hooks/queries/   — React Query hooks wrapping Supabase queries (useInventory, useItems, etc.)
  stores/          — Zustand stores (adminStore with location selection, filters, UI state)
  services/        — Email notification services (dailySummary, emailNotifications)
  locations.ts     — Location constants
  utils.ts         — Shared utilities
email/             — React Email templates (order confirmation, low stock alerts, etc.)
hooks/             — App-level hooks (use-mobile)
utils/             — Cart utilities, TanStack provider
supabase/          — Supabase config, migrations, edge functions
middleware.ts      — Clerk auth + role-based route protection
```

## Auth & Routing
- Clerk middleware protects `/admin/*` (role=`admin` only) and `/employee/*` (role=`member` or `admin`)
- Roles come from `sessionClaims.o.rol` (Clerk org roles)
- Logged-in users hitting `/` are auto-redirected to their dashboard based on role
- All other routes are public

## Data Layer Pattern
1. **Supabase queries** (`lib/supabase/queries/*.ts`) — Raw query functions that call `supabase.from(...)`
2. **React Query hooks** (`lib/hooks/queries/use*.ts`) — Wrap Supabase queries with `useQuery`/`useMutation`, handle caching and invalidation
3. **Components** consume hooks directly

Use the browser client (`lib/supabase/client.ts`) in client components. Use `createServerSupabaseClient()` from `lib/supabase/server.ts` in server components/actions (passes Clerk auth token).

## Conventions
- Path alias: `@/*` maps to project root (e.g., `@/lib/supabase/client`)
- UI components use shadcn/ui from `@/components/ui/`
- Inventory is multi-location — most queries filter by `locationId`
- `adminStore` (Zustand, persisted) tracks the selected location, filters, sidebar state, and view mode
