# New Catalog Items Banner — Design Spec

**Date:** 2026-04-28
**Feature:** Show a banner on the super-admin store detail page when catalog items have not yet been assigned to any storage space at that store.

---

## Scope

Six discrete changes only. Nothing outside this list is touched.

1. New query function `getUnassignedItemsForLocation` in `lib/supabase/queries/items.ts`
2. New React Query hook `useUnassignedItemsForLocation` in `lib/hooks/queries/useItems.ts`
3. Cache invalidation added to `useSuperAdminCreateItem` and `useCreateItem` in `lib/hooks/queries/useItems.ts`
4. New component `components/super-admin/stores/NewCatalogItemsBanner.tsx`
5. New component `components/super-admin/stores/AssignNewItemsModal.tsx`
6. Banner wired into `app/(dashboard)/super-admin/stores/[id]/page.tsx`

No other files are modified.

---

## Data Model Context

- `items` table — master catalog; `id` is `number`, `organization_id` is `string`
- `item_locations` table — actual inventory assignments; `item_id: number | null`, `location_id: string | null`, `storage_space_id: string | null`, `current_quantity: number | null`
- An item is **unassigned** for a store if it exists in `items` but has no row in `item_locations` with a matching `location_id`

---

## 1. Query function

**File:** `lib/supabase/queries/items.ts`

```typescript
export async function getUnassignedItemsForLocation(
    organizationId: string,
    locationId: string
) {
    const supabase = createServiceRoleClient(); // bypass RLS — super-admin only

    const [{ data: allItems, error: itemsErr }, { data: assigned, error: assignedErr }] =
        await Promise.all([
            supabase
                .from('items')
                .select('id, name, sku, category_id, unit_of_measure, min_quantity')
                .eq('organization_id', organizationId),
            supabase
                .from('item_locations')
                .select('item_id')
                .eq('location_id', locationId),
        ]);

    if (itemsErr) throw itemsErr;
    if (assignedErr) throw assignedErr;

    const assignedIds = new Set((assigned ?? []).map(r => r.item_id));
    return (allItems ?? []).filter(item => !assignedIds.has(item.id));
}
```

- Uses `createServiceRoleClient()` to match the pattern of all other super-admin query functions.
- Fetches both datasets in parallel via `Promise.all`.
- Returns the full subset of unassigned item rows (id, name, sku — enough for the modal).

---

## 2. React Query hook

**File:** `lib/hooks/queries/useItems.ts`

```typescript
export function useUnassignedItemsForLocation(locationId: string) {
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;
    return useQuery({
        queryKey: ['unassigned-items', locationId],
        queryFn: () => getUnassignedItemsForLocation(organizationId!, locationId),
        enabled: !!locationId && !!organizationId,
        staleTime: 60_000,
    });
}
```

- Query key `['unassigned-items', locationId]` — scoped per store.
- `enabled` guard prevents firing before auth resolves.
- `staleTime: 60_000` — fresh for 1 minute, consistent with other inventory hooks.

---

## 3. Cache invalidation

**File:** `lib/hooks/queries/useItems.ts` — `useSuperAdminCreateItem` and `useCreateItem` `onSuccess` callbacks:

```typescript
queryClient.invalidateQueries({ queryKey: ['unassigned-items'] });
```

- Broad invalidation (no locationId) so all open store pages refresh.
- Added to `useSuperAdminCreateItem` (primary path — super-admin creates items at `/super-admin/items`) and `useCreateItem` (admin path, for completeness).

---

## 4. `NewCatalogItemsBanner`

**File:** `components/super-admin/stores/NewCatalogItemsBanner.tsx`

**Props:**
```typescript
interface Props {
    locationId: string;
    storageSpaces: { id: string; name: string }[];
}
```

**Behavior:**
- Calls `useUnassignedItemsForLocation(locationId)`.
- If `unassigned.length === 0` or dismissed (`useState(false)`), renders `null`.
- Wrapped in Framer Motion `AnimatePresence` + `motion.div` for fade-out on dismiss.
- Dismiss is session-local (`useState`) — resets on page reload.

**Layout (indigo banner):**
```
[ Package icon ]  "3 new item(s) added to the catalog"
                  "Nutella, Paper cup 12 oz, +1 more"
                                    [ Assign to storage → ]  [ X ]
```

- Left: `Package` icon (lucide) + bold headline + muted subtitle (first 3 names, overflow as `+N more`)
- Right: primary `Button` that sets `showModal(true)` + ghost `X` button that sets `dismissed(true)`
- Renders `<AssignNewItemsModal>` when `showModal` is true

---

## 5. `AssignNewItemsModal`

**File:** `components/super-admin/stores/AssignNewItemsModal.tsx`

**Props:**
```typescript
interface Props {
    items: Array<{ id: number; name: string | null; sku: string | null }>;
    storageSpaces: { id: string; name: string }[];
    locationId: string;
    onClose: () => void;
}
```

**UI:**
- Shadcn `Dialog` (not `AlertDialog` — this is a form, not a destructive confirmation)
- Storage space `<select>` at top: `"Assign all selected items to:"`
- Scrollable list of items with checkboxes (all checked by default via `useState`)
- Each row: checkbox + item name + SKU (muted)
- Confirm button: disabled when no storage space selected or no items checked

**Mutation:**
- Uses `useBulkAssignItems()` from `lib/hooks/queries/useStorageSetup.ts`
- Calls `mutate({ locationId, storageSpaceId, items: checked.map(id => ({ itemId: String(id), quantity: 0 })) })`
- Quantity defaults to `0` — this is catalog assignment, not a stock entry
- `onSuccess`: `toast.success("Items assigned successfully")`, `queryClient.invalidateQueries({ queryKey: ['unassigned-items', locationId] })`, `onClose()`
- Confirm button shows `"Assigning..."` while `isPending`

---

## 6. Page wiring

**File:** `app/(dashboard)/super-admin/stores/[id]/page.tsx`

Insert `<NewCatalogItemsBanner>` between the store header card and the tab strip `<div className="mt-6">`:

```tsx
<NewCatalogItemsBanner
    locationId={locationId}
    storageSpaces={location.storage_spaces ?? []}
/>
```

`location.storage_spaces` is already available from `useLocationWithDetails(locationId)` — no new data fetching needed.

---

## Acceptance Criteria

- Banner does not appear when all catalog items are assigned at the store
- Banner appears after a new item is added at `/super-admin/items` (cache invalidation)
- "Assign to storage →" opens the modal with all items pre-checked
- Selecting a storage space and confirming calls `useBulkAssignItems` with `quantity: 0`
- After successful assignment the banner disappears (query invalidates, unassigned list becomes empty)
- X button hides the banner for the current browser session only
- No TypeScript errors
- No changes to files outside the 6 listed above
