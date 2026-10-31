# Store Purchase — Per-Line Storage Space Assignment — Design Spec

**Date:** 2026-05-01  
**Status:** Approved

---

## Overview

When an admin records a store direct purchase, each line item can now be assigned to a specific storage space. If no space is chosen, the item lands in location-level unassigned stock (the existing behavior, preserved for backward compatibility).

---

## Data Model

### `store_purchase_items` — new column

| column | type | notes |
|---|---|---|
| `storage_space_id` | uuid | nullable FK → storage_spaces; NULL = unassigned location-level stock |

### `create_store_purchase` RPC — updated item shape

The per-item JSONB objects are extended from `{item_id, quantity, unit_cost}` to:

```json
{ "item_id": 1, "quantity": 2, "unit_cost": 5.00, "storage_space_id": "<uuid or null>" }
```

The upsert inside the RPC previously hardcoded `storage_space_id IS NULL`. It now uses the per-item value, which may be NULL or a UUID. The `IS NOT DISTINCT FROM` operator is used for the NULL-safe WHERE clause in the `item_locations` UPDATE.

`inventory_logs` rows written by the RPC carry the correct per-item `storage_space_id`.

---

## Backend Changes

### Migration: `supabase/migrations/20260501_03_add_storage_space_to_purchase_items.sql`

```sql
ALTER TABLE public.store_purchase_items
  ADD COLUMN storage_space_id UUID REFERENCES public.storage_spaces(id);
```

Then `DROP FUNCTION IF EXISTS public.create_store_purchase` and recreate with updated signature and logic — reads `(e->>'storage_space_id')::uuid` per item (NULL-safe), uses it in `item_locations` upsert with `IS NOT DISTINCT FROM`.

### `lib/supabase/types.ts`

Add `storage_space_id: string | null` to `store_purchase_items` Row, and `storage_space_id?: string | null` to Insert and Update shapes.

### `lib/supabase/queries/storePurchases.ts`

- Add `storageSpaceId?: string | null` to `StorePurchaseItem` interface
- Pass `storage_space_id: i.storageSpaceId ?? null` in the RPC items array
- `getStorePurchaseById` select adds `storage_space_id, storage_spaces ( id, name )` to the `store_purchase_items` nested select

### `lib/hooks/queries/useStorePurchases.ts`

No logic change — `useCreateStorePurchase` passes through the updated input shape automatically.

---

## UI Changes

### `components/admin/purchases/NewPurchaseForm.tsx`

- Zod line item schema: add `storageSpaceId: z.string().nullable().optional()`
- Load storage spaces once: `const { data: location } = useLocationWithDetails(selectedLocationId)` — already used in the sidebar; `location.storage_spaces` is the array
- Line item grid: extend from `[1fr_100px_120px_80px_32px]` to `[1fr_160px_100px_120px_80px_32px]`
- New 2nd column: native `<select>` with "Unassigned" as default (`value=""`) plus one `<option>` per storage space
- `Controller` wraps the select (same pattern as the item picker) — `field.onChange(e.target.value || null)` converts empty string back to `null`

### `components/admin/purchases/PurchaseDetail.tsx`

- Add "Storage Space" column header between "Item" and "Qty"
- In each row: show `lineItem.storage_spaces?.name` if present, otherwise `—`
- Update `PurchaseLineItem` interface: add `storage_space_id: string | null` and `storage_spaces: { id: string; name: string } | null`

---

## Out of Scope

- Changing the storage space on an existing purchase after it has been saved
- Validating that the selected storage space belongs to the purchase's location (enforced at the DB FK level only)
- Showing storage space on the purchases list page (detail page only)
