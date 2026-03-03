# Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js (App Router, Turbopack) |
| Auth | Clerk (`@clerk/nextjs`) with organization roles |
| Database | Supabase (PostgreSQL) with Row-Level Security |
| Data Fetching | TanStack React Query |
| State Management | Zustand (persisted stores) |
| UI | shadcn/ui + Tailwind CSS + Framer Motion |
| Email | React Email + Resend |
| Language | TypeScript (strict mode) |

## Project Structure

```
app/
  (home)/              Public pages (menu, about, catering, join-us, checkout)
  (auth)/sign-in/      Clerk sign-in
  (dashboard)/
    admin/             Admin dashboard (inventory, items, categories, locations, users, settings)
    employee/          Employee dashboard (activity, profile, storage-spaces)
  actions/             Server actions (Google reviews, notification processing)

components/            Shared components (40+)
  ui/                  shadcn primitives (Button, Dialog, Tabs, etc.)

lib/
  supabase/
    client.ts          Browser Supabase client (anon key)
    server.ts          Server Supabase client (Clerk auth token)
    queries/           Raw Supabase query functions by domain
    mutations/         Supabase mutation functions
    subscriptions.ts   Realtime subscriptions (currently commented out)
    types.ts           Database TypeScript types
  hooks/queries/       React Query hooks wrapping Supabase queries
  stores/              Zustand stores (adminStore)
  services/            Email notification services
  locations.ts         Location constants
  utils.ts             Shared utilities

email/                 React Email templates
hooks/                 App-level hooks (use-mobile)
utils/                 Cart utilities, TanStack provider

supabase/
  migrations/          SQL migration files
  functions/           Supabase Edge Functions
    clerk-webhooks/        Dev webhook handler
    clerk-webhooks-prod/   Prod webhook handler
    send-low-stock-alert/  Immediate low stock email
    send-low-stock-digest/ Batched low stock digest
    send-daily-summary/    Daily inventory summary

middleware.ts          Clerk auth + role-based route protection
```

## Data Layer Pattern

The app follows a three-layer pattern for all data operations:

```
Supabase Queries (lib/supabase/queries/*.ts)
        |
        v
React Query Hooks (lib/hooks/queries/use*.ts)
        |
        v
Components (consume hooks directly)
```

1. **Supabase queries** — Raw functions that call `supabase.from(...)`. Located in `lib/supabase/queries/` organized by domain (inventory, items, locations, categories, employees, users, etc.).

2. **React Query hooks** — Wrap Supabase queries with `useQuery` / `useMutation`. Handle caching, stale times, and cache invalidation on mutations. Located in `lib/hooks/queries/`.

3. **Components** — Import and call hooks directly. No intermediate service layer.

### Client vs Server Supabase

| Client | File | Usage |
|--------|------|-------|
| Browser | `lib/supabase/client.ts` | Client components. Uses `NEXT_PUBLIC_SUPABASE_ANON_KEY`. RLS policies enforce access. |
| Server | `lib/supabase/server.ts` | Server components and actions. Calls `auth().getToken()` to attach Clerk auth token as `accessToken`. |

## State Management

The admin dashboard uses a Zustand store (`lib/stores/adminStore.ts`) persisted to localStorage under the key `admin-store`.

**Persisted state:**
- `selectedLocationId` — Currently selected location for multi-location filtering
- `filters` — Category, status, search query
- `viewMode` — `'grid'` or `'list'` preference
- `cachedLocations` and `cachedItems` — Offline data cache

**Transient state (not persisted):**
- `sidebarOpen` — Sidebar collapse state
- `mobileSheetOpen` — Mobile nav state

## Key Conventions

- **Path alias**: `@/*` maps to project root (e.g., `@/lib/supabase/client`)
- **UI components**: shadcn/ui from `@/components/ui/`
- **Multi-location**: Most queries filter by `locationId`
- **Organization scoping**: Queries require `organizationId` for multi-tenancy
- **Bulk operations**: Dedicated bulk functions for inventory, items, and users
- **Audit logging**: Every inventory change creates an `inventory_logs` entry
