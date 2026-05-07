# Sidebar Nav Badges Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add actionable-count badges to Orders (admin + super-admin), Purchases (admin), and Purchase Orders (super-admin) sidebar nav links.

**Architecture:** Thin COUNT-only Supabase queries → server action wrappers → React Query hooks → called at layout top level → badge counts threaded into the nav render loop via a `Record<href, count>` map. A shared `NavBadge` component renders the pill and auto-hides in icon-collapsed sidebar mode via Tailwind's `group-data-[collapsible=icon]:hidden`.

**Tech Stack:** Next.js App Router, Supabase, TanStack React Query, Clerk, Tailwind CSS, shadcn/ui Sidebar

---

## File Map

| File | Change |
|---|---|
| `lib/supabase/queries/orderTickets.ts` | Add 2 count functions |
| `lib/supabase/actions/orderTicketActions.ts` | Add 2 action wrappers |
| `lib/hooks/queries/useOrderTickets.ts` | Add 2 keys + 2 hooks |
| `lib/supabase/actions/purchaseOrderActions.ts` | Add 1 count action |
| `lib/hooks/queries/usePurchaseOrders.ts` | Add 1 key + 1 hook |
| `components/admin/shared/NavBadge.tsx` | Create badge component |
| `app/(dashboard)/admin/layout.tsx` | Call hooks, render badges |
| `app/(dashboard)/super-admin/layout.tsx` | Call hooks, render badges |

---

### Task 1: Add count query functions to orderTickets.ts

**Files:**
- Modify: `lib/supabase/queries/orderTickets.ts`

- [ ] **Step 1: Append the two count functions at the end of the file**

Open `lib/supabase/queries/orderTickets.ts`. Scroll past the last function. Add:

```ts
// ─── getActiveTicketCountForLocation ─────────────────────────────────────────

export async function getActiveTicketCountForLocation(
    locationId: string,
): Promise<number> {
    const supabase = createServerSupabaseClient();

    const { count, error } = await supabase
        .from("order_tickets")
        .select("id", { count: "exact", head: true })
        .eq("requesting_location_id", locationId)
        .in("status", ["submitted", "processing", "fulfilled"]);

    if (error) throw error;
    return count ?? 0;
}

// ─── getActiveTicketCount ─────────────────────────────────────────────────────

export async function getActiveTicketCount(
    organizationId: string,
): Promise<number> {
    const supabase = createServerSupabaseClient();

    const { count, error } = await supabase
        .from("order_tickets")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .in("status", ["submitted", "processing", "fulfilled"]);

    if (error) throw error;
    return count ?? 0;
}
```

- [ ] **Step 2: Lint check**

```bash
npm run lint -- --max-warnings=0 lib/supabase/queries/orderTickets.ts
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/queries/orderTickets.ts
git commit -m "feat: add getActiveTicketCount query functions for sidebar badges"
```

---

### Task 2: Add server action wrappers to orderTicketActions.ts

**Files:**
- Modify: `lib/supabase/actions/orderTicketActions.ts`

- [ ] **Step 1: Add the two new imports**

In `lib/supabase/actions/orderTicketActions.ts`, find the existing import block:

```ts
import {
	getTicketsByLocation,
	getAllTickets,
	getTicketById,
	getPendingTicketCount,
	getRemainderTickets,
	getAutoApprovedTickets,
	getTicketsWithDiscrepancies,
	getTicketItemCosts,
	type TicketFilters,
} from "@/lib/supabase/queries/orderTickets";
```

Replace it with:

```ts
import {
	getTicketsByLocation,
	getAllTickets,
	getTicketById,
	getPendingTicketCount,
	getRemainderTickets,
	getAutoApprovedTickets,
	getTicketsWithDiscrepancies,
	getTicketItemCosts,
	getActiveTicketCountForLocation,
	getActiveTicketCount,
	type TicketFilters,
} from "@/lib/supabase/queries/orderTickets";
```

- [ ] **Step 2: Append the two action wrappers at the end of the file**

```ts
export async function getActiveTicketCountForLocationAction(
	locationId: string,
) {
	return getActiveTicketCountForLocation(locationId);
}

export async function getActiveTicketCountAction(organizationId: string) {
	return getActiveTicketCount(organizationId);
}
```

- [ ] **Step 3: Lint check**

```bash
npm run lint -- --max-warnings=0 lib/supabase/actions/orderTicketActions.ts
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/actions/orderTicketActions.ts
git commit -m "feat: add active ticket count server actions for sidebar badges"
```

---

### Task 3: Add query keys and hooks to useOrderTickets.ts

**Files:**
- Modify: `lib/hooks/queries/useOrderTickets.ts`

- [ ] **Step 1: Add the new imports at the top of the import block**

In `lib/hooks/queries/useOrderTickets.ts`, find:

```ts
import {
	getTicketsByLocationAction,
	getAllTicketsAction,
	getTicketByIdAction,
	getPendingTicketCountAction,
	getRemainderTicketsAction,
	getAutoApprovedTicketsAction,
	getTicketsWithDiscrepanciesAction,
	getTicketItemCostsAction,
} from "@/lib/supabase/actions/orderTicketActions";
```

Replace with:

```ts
import {
	getTicketsByLocationAction,
	getAllTicketsAction,
	getTicketByIdAction,
	getPendingTicketCountAction,
	getRemainderTicketsAction,
	getAutoApprovedTicketsAction,
	getTicketsWithDiscrepanciesAction,
	getTicketItemCostsAction,
	getActiveTicketCountForLocationAction,
	getActiveTicketCountAction,
} from "@/lib/supabase/actions/orderTicketActions";
```

- [ ] **Step 2: Add two new keys to the ticketKeys factory**

Find the `ticketKeys` object:

```ts
export const ticketKeys = {
	all:            ["tickets"] as const,
	lists:          ()                                             => [...ticketKeys.all, "list"] as const,
	byLocation:     (locationId: string, filters?: TicketFilters) => [...ticketKeys.lists(), "location", locationId, filters] as const,
	allTickets:     (orgId: string, filters?: TicketFilters)      => [...ticketKeys.lists(), "all", orgId, filters] as const,
	detail:         (id: string)                                  => [...ticketKeys.all, "detail", id] as const,
	pendingCount:   (orgId: string)                               => [...ticketKeys.all, "pending-count", orgId] as const,
	remainder:      (parentId: string)                            => [...ticketKeys.all, "remainder", parentId] as const,
	autoApproved:   (orgId: string, daysBack: number)             => [...ticketKeys.all, "auto-approved", orgId, daysBack] as const,
	discrepancies:  (orgId: string)                               => [...ticketKeys.all, "discrepancies", orgId] as const,
};
```

Replace with:

```ts
export const ticketKeys = {
	all:                    ["tickets"] as const,
	lists:                  ()                                             => [...ticketKeys.all, "list"] as const,
	byLocation:             (locationId: string, filters?: TicketFilters) => [...ticketKeys.lists(), "location", locationId, filters] as const,
	allTickets:             (orgId: string, filters?: TicketFilters)      => [...ticketKeys.lists(), "all", orgId, filters] as const,
	detail:                 (id: string)                                  => [...ticketKeys.all, "detail", id] as const,
	pendingCount:           (orgId: string)                               => [...ticketKeys.all, "pending-count", orgId] as const,
	remainder:              (parentId: string)                            => [...ticketKeys.all, "remainder", parentId] as const,
	autoApproved:           (orgId: string, daysBack: number)             => [...ticketKeys.all, "auto-approved", orgId, daysBack] as const,
	discrepancies:          (orgId: string)                               => [...ticketKeys.all, "discrepancies", orgId] as const,
	activeCountForLocation: (locationId: string)                          => [...ticketKeys.all, "active-count-location", locationId] as const,
	activeCount:            (orgId: string)                               => [...ticketKeys.all, "active-count", orgId] as const,
};
```

- [ ] **Step 3: Append the two new hooks at the end of the file**

```ts
// ─── useActiveTicketCountForLocation ─────────────────────────────────────────

export function useActiveTicketCountForLocation(locationId: string | undefined) {
	return useQuery({
		queryKey:             ticketKeys.activeCountForLocation(locationId ?? ""),
		queryFn:              () => getActiveTicketCountForLocationAction(locationId!),
		enabled:              !!locationId,
		staleTime:            30_000,
		refetchOnWindowFocus: true,
	});
}

// ─── useActiveTicketCount ─────────────────────────────────────────────────────

export function useActiveTicketCount(orgId: string | undefined) {
	return useQuery({
		queryKey:             ticketKeys.activeCount(orgId ?? ""),
		queryFn:              () => getActiveTicketCountAction(orgId!),
		enabled:              !!orgId,
		staleTime:            30_000,
		refetchOnWindowFocus: true,
	});
}
```

- [ ] **Step 4: Lint check**

```bash
npm run lint -- --max-warnings=0 lib/hooks/queries/useOrderTickets.ts
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/queries/useOrderTickets.ts
git commit -m "feat: add useActiveTicketCount hooks for sidebar badges"
```

---

### Task 4: Add actionable PO count action to purchaseOrderActions.ts

**Files:**
- Modify: `lib/supabase/actions/purchaseOrderActions.ts`

- [ ] **Step 1: Append the count action at the end of the file**

Open `lib/supabase/actions/purchaseOrderActions.ts`. Scroll to the end (after `receivePurchaseOrderAction`). Add:

```ts
// ─── Counts ───────────────────────────────────────────────────────────────────

export async function getActionablePOCountAction(
	organizationId: string,
): Promise<number> {
	const supabase = createServiceRoleClient();
	const { count, error } = await supabase
		.from('purchase_orders')
		.select('id', { count: 'exact', head: true })
		.eq('organization_id', organizationId)
		.eq('status', 'arrived');

	if (error) throw new Error(error.message);
	return count ?? 0;
}
```

Note: `createServiceRoleClient` is already imported at the top of this file.

- [ ] **Step 2: Lint check**

```bash
npm run lint -- --max-warnings=0 lib/supabase/actions/purchaseOrderActions.ts
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/actions/purchaseOrderActions.ts
git commit -m "feat: add getActionablePOCountAction for sidebar badge"
```

---

### Task 5: Add useActionablePOCount hook to usePurchaseOrders.ts

**Files:**
- Modify: `lib/hooks/queries/usePurchaseOrders.ts`

- [ ] **Step 1: Add the new import**

Find the existing import block:

```ts
import {
    getPurchaseOrdersAction,
    getPurchaseOrderByIdAction,
    getItemCostHistoryAction,
    getWarehouseLocationsAction,
    createPurchaseOrderAction,
    updatePurchaseOrderAction,
    updatePurchaseOrderStatusAction,
    deletePurchaseOrderAction,
    upsertPurchaseOrderItemsAction,
    deletePurchaseOrderItemAction,
    recalculatePoCostsAction,
    receivePurchaseOrderAction,
} from '@/lib/supabase/actions/purchaseOrderActions';
```

Replace with:

```ts
import {
    getPurchaseOrdersAction,
    getPurchaseOrderByIdAction,
    getItemCostHistoryAction,
    getWarehouseLocationsAction,
    createPurchaseOrderAction,
    updatePurchaseOrderAction,
    updatePurchaseOrderStatusAction,
    deletePurchaseOrderAction,
    upsertPurchaseOrderItemsAction,
    deletePurchaseOrderItemAction,
    recalculatePoCostsAction,
    receivePurchaseOrderAction,
    getActionablePOCountAction,
} from '@/lib/supabase/actions/purchaseOrderActions';
```

- [ ] **Step 2: Add `actionableCount` to the purchaseOrderKeys factory**

Find:

```ts
export const purchaseOrderKeys = {
    all:        (orgId: string)                  => ['purchaseOrders', orgId] as const,
    detail:     (id: string)                     => ['purchaseOrders', 'detail', id] as const,
    costs:      (orgId: string, itemId?: number) => ['itemCostHistory', orgId, itemId] as const,
    warehouses: (orgId: string)                  => ['warehouseLocations', orgId] as const,
};
```

Replace with:

```ts
export const purchaseOrderKeys = {
    all:            (orgId: string)                  => ['purchaseOrders', orgId] as const,
    detail:         (id: string)                     => ['purchaseOrders', 'detail', id] as const,
    costs:          (orgId: string, itemId?: number) => ['itemCostHistory', orgId, itemId] as const,
    warehouses:     (orgId: string)                  => ['warehouseLocations', orgId] as const,
    actionableCount:(orgId: string)                  => ['purchaseOrders', 'actionable-count', orgId] as const,
};
```

- [ ] **Step 3: Append the hook at the end of the file**

```ts
// ─── useActionablePOCount ─────────────────────────────────────────────────────

export function useActionablePOCount(orgId: string | undefined) {
    return useQuery({
        queryKey:             purchaseOrderKeys.actionableCount(orgId ?? ''),
        queryFn:              () => getActionablePOCountAction(orgId!),
        enabled:              !!orgId,
        staleTime:            30_000,
        refetchOnWindowFocus: true,
    });
}
```

- [ ] **Step 4: Lint check**

```bash
npm run lint -- --max-warnings=0 lib/hooks/queries/usePurchaseOrders.ts
```

Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add lib/hooks/queries/usePurchaseOrders.ts
git commit -m "feat: add useActionablePOCount hook for sidebar badge"
```

---

### Task 6: Create the shared NavBadge component

**Files:**
- Create: `components/admin/shared/NavBadge.tsx`

- [ ] **Step 1: Create the file**

```tsx
export function NavBadge({ count }: { count: number }) {
    if (count <= 0) return null;
    return (
        <span className="ml-auto flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white group-data-[collapsible=icon]:hidden">
            {count > 99 ? "99+" : count}
        </span>
    );
}
```

The `group-data-[collapsible=icon]:hidden` class hides the badge automatically when the sidebar collapses to icon mode — no JS needed.

- [ ] **Step 2: Lint check**

```bash
npm run lint -- --max-warnings=0 components/admin/shared/NavBadge.tsx
```

Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add components/admin/shared/NavBadge.tsx
git commit -m "feat: add NavBadge component for sidebar nav links"
```

---

### Task 7: Wire badges into the admin layout

**Files:**
- Modify: `app/(dashboard)/admin/layout.tsx`

- [ ] **Step 1: Add the two new imports at the top of the file**

Find the existing imports block near the top of `app/(dashboard)/admin/layout.tsx`. After the existing Clerk/shadcn/etc. imports, add:

```tsx
import { useActiveTicketCountForLocation } from "@/lib/hooks/queries/useOrderTickets";
import { useInventoryUpdateRequests } from "@/lib/hooks/queries/useInventoryUpdateRequests";
import { NavBadge } from "@/components/admin/shared/NavBadge";
```

- [ ] **Step 2: Add badge count hooks inside AdminLayout**

In `AdminLayout`, find the existing hook calls at the top of the component:

```tsx
const pathname = usePathname();
const { user } = useUser();
```

Add after them:

```tsx
const { selectedLocationId } = useAdminStore();
const { data: orderCount }      = useActiveTicketCountForLocation(selectedLocationId ?? undefined);
const { data: pendingRequests } = useInventoryUpdateRequests("pending");

const badgeCounts: Record<string, number> = {
    "/admin/orders":    orderCount ?? 0,
    "/admin/purchases": pendingRequests?.length ?? 0,
};
```

Note: `useAdminStore` is already imported at the top of this file. `useInventoryUpdateRequests` reads the org ID internally via `useOrganization()` — no need to pass it explicitly.

- [ ] **Step 3: Update the nav render loop to include badges**

Find the nav render loop in `AdminLayout`:

```tsx
{navigation.map((item) => {
    const isActive =
        pathname === item.href ||
        pathname?.startsWith(
            item.href + "/",
        );
    return (
        <SidebarMenuItem
            key={item.name}
        >
            <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.name}
            >
                <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>
                        {item.name}
                    </span>
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
})}
```

Replace with:

```tsx
{navigation.map((item) => {
    const isActive =
        pathname === item.href ||
        pathname?.startsWith(
            item.href + "/",
        );
    return (
        <SidebarMenuItem
            key={item.name}
        >
            <SidebarMenuButton
                asChild
                isActive={isActive}
                tooltip={item.name}
            >
                <Link href={item.href}>
                    <item.icon className="h-4 w-4" />
                    <span>
                        {item.name}
                    </span>
                    <NavBadge count={badgeCounts[item.href] ?? 0} />
                </Link>
            </SidebarMenuButton>
        </SidebarMenuItem>
    );
})}
```

- [ ] **Step 4: Lint check**

```bash
npm run lint -- --max-warnings=0 "app/(dashboard)/admin/layout.tsx"
```

Expected: no errors.

- [ ] **Step 5: Visual check**

Run `npm run dev` and open `http://localhost:3000/admin`. Confirm:
- Orders badge shows a red pill when there are in-flight tickets for the selected location.
- Purchases badge shows a red pill when there are pending employee update requests.
- Both badges disappear when the sidebar is collapsed to icon mode.
- No badge renders when count is 0.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/admin/layout.tsx"
git commit -m "feat: add Orders and Purchases badge counts to admin sidebar"
```

---

### Task 8: Wire badges into the super-admin layout

**Files:**
- Modify: `app/(dashboard)/super-admin/layout.tsx`

- [ ] **Step 1: Add new imports**

In `app/(dashboard)/super-admin/layout.tsx`, find the existing Clerk import:

```tsx
import { useUser } from "@clerk/nextjs";
```

Replace with:

```tsx
import { useUser, useOrganization } from "@clerk/nextjs";
```

Then add after the other named imports (shadcn, etc.):

```tsx
import { useActiveTicketCount } from "@/lib/hooks/queries/useOrderTickets";
import { useActionablePOCount } from "@/lib/hooks/queries/usePurchaseOrders";
import { NavBadge } from "@/components/admin/shared/NavBadge";
```

- [ ] **Step 2: Add badge count hooks inside SuperAdminLayout**

In `SuperAdminLayout`, find:

```tsx
const pathname = usePathname();
const { user } = useUser();
```

Add after them:

```tsx
const { organization } = useOrganization();
const orgId = organization?.id;
const { data: orderCount } = useActiveTicketCount(orgId);
const { data: poCount }    = useActionablePOCount(orgId);

const badgeCounts: Record<string, number> = {
    "/super-admin/orders":          orderCount ?? 0,
    "/super-admin/purchase-orders": poCount ?? 0,
};
```

- [ ] **Step 3: Update the nav render loop to include badges**

Find the nav render loop in `SuperAdminLayout` (the one after the CollapsibleNavGroups):

```tsx
{navigation
    .filter(
        (item) =>
            item.name !== "Dashboard",
    )
    .map((item) => {
        const isActive =
            pathname === item.href ||
            pathname?.startsWith(
                item.href + "/",
            );
        return (
            <SidebarMenuItem
                key={item.name}
            >
                <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.name}
                >
                    <Link
                        href={item.href}
                    >
                        <item.icon className="h-4 w-4" />
                        <span>
                            {item.name}
                        </span>
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    })}
```

Replace with:

```tsx
{navigation
    .filter(
        (item) =>
            item.name !== "Dashboard",
    )
    .map((item) => {
        const isActive =
            pathname === item.href ||
            pathname?.startsWith(
                item.href + "/",
            );
        return (
            <SidebarMenuItem
                key={item.name}
            >
                <SidebarMenuButton
                    asChild
                    isActive={isActive}
                    tooltip={item.name}
                >
                    <Link
                        href={item.href}
                    >
                        <item.icon className="h-4 w-4" />
                        <span>
                            {item.name}
                        </span>
                        <NavBadge count={badgeCounts[item.href] ?? 0} />
                    </Link>
                </SidebarMenuButton>
            </SidebarMenuItem>
        );
    })}
```

- [ ] **Step 4: Lint check**

```bash
npm run lint -- --max-warnings=0 "app/(dashboard)/super-admin/layout.tsx"
```

Expected: no errors.

- [ ] **Step 5: Visual check**

Open `http://localhost:3000/super-admin`. Confirm:
- Orders badge shows a red pill when there are in-flight tickets org-wide.
- Purchase Orders badge shows a red pill when there are POs with status `arrived`.
- Both badges disappear in icon-collapsed sidebar mode.
- No badge renders when count is 0.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/super-admin/layout.tsx"
git commit -m "feat: add Orders and Purchase Orders badge counts to super-admin sidebar"
```
