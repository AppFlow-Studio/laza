# Authentication

## Overview

Laza uses [Clerk](https://clerk.com) for authentication with organization-based roles. Users are synced to Supabase via webhooks, and Row-Level Security (RLS) policies enforce data access at the database level.

## Roles

| Clerk Role | App Role | Access |
|------------|----------|--------|
| `admin` | Admin | Full access to `/admin/*` routes and all data |
| `member` | Employee | Access to `/employee/*` routes and assigned location data |

Roles are read from Clerk session claims at `sessionClaims.o.rol`.

## Middleware Route Protection

The middleware (`middleware.ts`) uses `clerkMiddleware` to enforce access:

### Protected Routes

| Route Pattern | Required Role | Behavior |
|---------------|---------------|----------|
| `/admin/*` | `admin` | 403 if wrong role, redirect to `/sign-in` if unauthenticated |
| `/employee/*` | `member` or `admin` | 403 if wrong role, redirect to `/sign-in` if unauthenticated |

### Public Routes

These routes are accessible without authentication:

- `/`, `/menu(.*)`, `/about`, `/catering`, `/join-us`
- `/sign-in(.*)`, `/sign-up(.*)`
- `/privacy-policy`, `/terms-conditions`

### Auto-Redirect

When a logged-in user visits `/`:

- **Admins** are redirected to `/admin`
- **Members** are redirected to `/employee`

Other public pages remain accessible to all users regardless of login status.

## Clerk Webhooks

Clerk webhooks sync user and organization data to Supabase. There are two edge function versions:

- **Dev**: `supabase/functions/clerk-webhooks/index.ts`
- **Prod**: `supabase/functions/clerk-webhooks-prod/index.ts`

Both verify the Clerk signature using `CLERK_WEBHOOK_SECRET`.

### Handled Events

| Event | Action |
|-------|--------|
| `user.created` | Insert user record in `users` table (id, email, name, avatar, role, location) |
| `user.updated` | Update user record with new metadata |
| `user.deleted` | Soft delete (sets `is_active = false`) |
| `organization.created` | Insert org record in `organizations` table |
| `organization.updated` | Update org name and timestamp |
| `organizationMembership.created` | Create member record in `members` table. Prod also syncs role + location to `users` |
| `organizationMembership.updated` | Update member record |
| `organizationInvitation.accepted` | Update `org_invites` status to `'accepted'` with timestamp |
| `organizationInvitation.revoked` | Update `org_invites` status to `'cancelled'` |

### Prod vs Dev Difference

The prod webhook more thoroughly syncs membership metadata (role, assigned location) to the user record during `organizationMembership.created`. The dev version relies on separate `user.updated` events.

## Supabase Auth Integration

### Browser Client (`lib/supabase/client.ts`)

Used in client components. Creates a Supabase client with the anon key (`NEXT_PUBLIC_SUPABASE_ANON_KEY`). RLS policies enforce row-level security based on the authenticated user.

### Server Client (`lib/supabase/server.ts`)

Used in server components and actions. Calls `auth().getToken()` to get the Clerk auth token and passes it as `accessToken` to the Supabase client for server-side operations with proper auth context.

## Invitation Flow

1. Admin creates invitation via Clerk API (sets role + optional location)
2. Invitation record created in `org_invites` table with status `'pending'`
3. Clerk sends invitation email
4. User accepts invitation -> `organizationInvitation.accepted` webhook fires
5. User record created/updated via `user.created` / `organizationMembership.created` webhooks
6. User can now log in and access their role-appropriate dashboard

## Security Patterns

- **RLS**: All Supabase tables enforce organization and location-level access
- **Soft deletes**: Users are marked inactive rather than hard-deleted (preserves audit trail)
- **Metadata sync**: Webhooks keep Supabase user records in sync with Clerk
- **Multi-tenancy**: Organization ID scoping on all queries prevents cross-tenant data access
