# Sidebar Nav Badges — Design Spec

**Date:** 2026-05-04  
**Status:** Approved

## Overview

Add numerical badges to specific sidebar nav links to surface actionable item counts without requiring the user to navigate into each section first.

## Badges Summary

| Sidebar | Nav item | Counts | Statuses / filter |
|---|---|---|---|
| Admin | Orders | Tickets for admin's **selected location** | `submitted`, `processing`, `fulfilled` |
| Admin | Purchases | Inventory update requests org-wide | `pending` |
| Super-admin | Orders | All org tickets | `submitted`, `processing`, `fulfilled` |
| Super-admin | Purchase Orders | POs org-wide | `arrived` |

## Data Layer

### New query functions

**`lib/supabase/queries/orderTickets.ts`**

```ts
// Count in-flight tickets for a specific location (admin view)
getActiveTicketCountForLocation(locationId: string): Promise<number>
// .eq("requesting_location_id", locationId)
// .in("status", ["submitted", "processing", "fulfilled"])
// COUNT only — select("id", { count: "exact", head: true })

// Count in-flight tickets org-wide (super-admin view)
getActiveTicketCount(organizationId: string): Promise<number>
// .eq("organization_id", organizationId)
// .in("status", ["submitted", "processing", "fulfilled"])
// COUNT only
```

**`lib/supabase/queries/purchaseOrders.ts`**

```ts
// Count POs that need warehouse receiving action
getActionablePOCount(organizationId: string): Promise<number>
// .eq("organization_id", organizationId)
// .eq("status", "arrived")
// COUNT only
```

### New server actions

**`lib/supabase/actions/orderTicketActions.ts`**

- `getActiveTicketCountForLocationAction(locationId)` — wraps `getActiveTicketCountForLocation`
- `getActiveTicketCountAction(orgId)` — wraps `getActiveTicketCount`

**`lib/supabase/actions/purchaseOrderActions.ts`** (file already exists — add to it)

- `getActionablePOCountAction(orgId)` — uses `createServiceRoleClient()` directly (matching existing PO action pattern; no separate query function in `purchaseOrders.ts` needed)

### New React Query hooks

**`lib/hooks/queries/useOrderTickets.ts`**

```ts
useActiveTicketCountForLocation(locationId: string | undefined)
// queryKey: ticketKeys.activeCountForLocation(locationId)
// staleTime: 30_000, refetchOnWindowFocus: true

useActiveTicketCount(orgId: string | undefined)
// queryKey: ticketKeys.activeCount(orgId)
// staleTime: 30_000, refetchOnWindowFocus: true
```

**`lib/hooks/queries/usePurchaseOrders.ts`**

```ts
useActionablePOCount(orgId: string | undefined)
// queryKey: ["purchase-orders", "actionable-count", orgId]
// staleTime: 30_000, refetchOnWindowFocus: true
```

**Admin Purchases badge** — no new hook needed. Reuse existing `useInventoryUpdateRequests("pending")` and derive `data?.length`. This hook is already present in the inventory panel on the same page, so it hits the React Query cache rather than making a duplicate network call.

## Layout Changes

### Admin layout (`app/(dashboard)/admin/layout.tsx`)

At the top of `AdminLayout`:

```ts
const { organization } = useOrganization();  // add import
const { selectedLocationId } = useAdminStore();
const { data: orderCount } = useActiveTicketCountForLocation(selectedLocationId);
const { data: pendingRequests } = useInventoryUpdateRequests("pending");

const badgeCounts: Record<string, number> = {
    "/admin/orders":    orderCount ?? 0,
    "/admin/purchases": pendingRequests?.length ?? 0,
};
```

In the nav render loop, after `<span>{item.name}</span>`, conditionally render:

```tsx
{(badgeCounts[item.href] ?? 0) > 0 && (
    <NavBadge count={badgeCounts[item.href]} />
)}
```

Badge is **not rendered** when sidebar is icon-collapsed (`state === "collapsed"`).

### Super-admin layout (`app/(dashboard)/super-admin/layout.tsx`)

At the top of `SuperAdminLayout`:

```ts
const { organization } = useOrganization();
const orgId = organization?.id;
const { data: orderCount } = useActiveTicketCount(orgId);
const { data: poCount }    = useActionablePOCount(orgId);

const badgeCounts: Record<string, number> = {
    "/super-admin/orders":           orderCount ?? 0,
    "/super-admin/purchase-orders":  poCount ?? 0,
};
```

Same badge render pattern in the nav loop. Also needs to handle the `navigation.filter(item => item.name !== "Dashboard").map(...)` loop where Orders and Purchase Orders are rendered.

## Badge Component

A small inline `NavBadge` component (defined in the layout file or extracted to `components/admin/shared/NavBadge.tsx` if reused across both layouts):

```tsx
function NavBadge({ count }: { count: number }) {
    return (
        <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
        </span>
    );
}
```

- Hidden when count is 0 (not rendered at all)
- Hidden when sidebar is icon-collapsed (caller checks `state !== "collapsed"` before rendering)
- Caps display at `99+`

## Query Key Extensions

Add to `ticketKeys` in `useOrderTickets.ts`:

```ts
activeCountForLocation: (locationId: string) =>
    [...ticketKeys.all, "active-count-location", locationId] as const,
activeCount: (orgId: string) =>
    [...ticketKeys.all, "active-count", orgId] as const,
```

## Files Touched

1. `lib/supabase/queries/orderTickets.ts` — 2 new functions
2. `lib/supabase/queries/purchaseOrders.ts` — 1 new function
3. `lib/supabase/actions/orderTicketActions.ts` — 2 new action wrappers
4. `lib/supabase/actions/purchaseOrderActions.ts` — 1 new action wrapper (create file if absent)
5. `lib/hooks/queries/useOrderTickets.ts` — 2 new hooks + query key entries
6. `lib/hooks/queries/usePurchaseOrders.ts` — 1 new hook
7. `app/(dashboard)/admin/layout.tsx` — call hooks, badge render in nav loop
8. `app/(dashboard)/super-admin/layout.tsx` — call hooks, badge render in nav loop
9. `components/admin/shared/NavBadge.tsx` — shared badge component (optional extraction)

## Constraints

- All count queries use `head: true` — zero row data transferred
- Badges are suppressed in icon-collapsed sidebar mode to avoid visual clutter
- `staleTime: 30_000` with `refetchOnWindowFocus: true` keeps counts reasonably fresh without hammering the DB
- No changes to RLS or database schema required
