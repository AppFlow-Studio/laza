# Track A — Permission Lockdown, is_warehouse_item Flag, Live Cart Totals

**Date:** 2026-04-21  
**Owner:** Sardor  
**Deadline:** End of April  
**Environment:** staging (`tgcfddsianjssvdksnbu`)

---

## Context

Three converging requirements shipped as one sprint:
1. Store admins lose catalog write access — super admin owns item/category CRUD.
2. `is_warehouse_item` flag gates which items appear in store order tickets.
3. Store admins see live transfer-price totals before submitting an order.

Track B (Munis) owns the pricing infrastructure. Track A owns the permission surface, catalog filter, and cart UX.

---

## Current State (what's already done)

| Item | Status |
|---|---|
| `is_warehouse_item` column + DB types | Done (A2 applied) |
| `ItemForm.tsx` toggle | Done (in `components/admin/items/ItemForm.tsx`) |
| `/super-admin/items` + `/super-admin/categories` pages | Done (full write controls) |
| Sidebar lists Items + Categories | Done (separate entries, no "Catalog" group yet) |
| Admin items page read-only | Done (no write props passed to ItemGrid) |
| B2 `items_with_prices` view | Done (Munis applied to staging) |

---

## What This Spec Covers

### A1 — RLS Migration

**File:** `utils/fixes/20260419_a1_restrict_item_category_writes_to_super_admin.sql`

Drop the 6 admin write policies on `items` and `category`:

```sql
BEGIN;

DROP POLICY IF EXISTS "Admins can insert items in their organization" ON public.items;
DROP POLICY IF EXISTS "Admins can update items in their organization" ON public.items;
DROP POLICY IF EXISTS "Admins can delete items in their organization" ON public.items;

DROP POLICY IF EXISTS "Admins can insert category in their organization" ON public.category;
DROP POLICY IF EXISTS "Admins can update category in their organization" ON public.category;
DROP POLICY IF EXISTS "Admins can delete category in their organization" ON public.category;

DROP POLICY IF EXISTS "Enable read access for all users" ON public.items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.category;

COMMIT;
```

**Apply manually** via Supabase dashboard. Do NOT place in `supabase/migrations/` — CI auto-applies that folder.

**Acceptance:**
- Store admin `INSERT INTO items` → `42501`
- Store admin `SELECT count(*) FROM items` → 187 rows
- Super admin full CRUD succeeds

---

### A3 — useCanManageCatalog Hook

**File:** `lib/hooks/useCanManageCatalog.ts` (new)

```ts
import { useUserInfo } from '@/lib/hooks/queries/useUserInfo';

export function useCanManageCatalog() {
  const { data: user } = useUserInfo();
  return user?.role === 'super_admin';
}
```

Formalization hook. Admin page is already read-only by route separation (props-level). Hook provides a named check for any future conditional rendering needs.

---

### A4 — "Catalog" Group in Super-Admin Sidebar

**File:** `app/(dashboard)/super-admin/layout.tsx`

Restructure the standalone `Items` and `Categories` entries into a `CollapsibleNavGroup` labeled "Catalog" with a `Package` icon, following the same pattern as the existing `Warehouse` and `Analytics` groups.

```ts
const catalogChildren = [
  { name: 'Items', href: '/super-admin/items', icon: Package },
  { name: 'Categories', href: '/super-admin/categories', icon: Tags },
];
```

Remove Items and Categories from the flat `navigation` array.

**Acceptance:**
- Sidebar shows "Catalog" group that expands to Items + Categories
- Active state highlights correctly when on either page

---

### A5 — ItemFormModal (super-admin-specific)

**File:** `app/(dashboard)/super-admin/items/_components/ItemFormModal.tsx` (new)

A standalone form component for super-admin item create/edit. Contains all fields from `ItemForm.tsx` plus:

**Warehouse item toggle:**
- Label: "Warehouse item"
- Helper: "Flip on if this item is stocked and ordered from the central warehouse. Only warehouse items appear in store order tickets."
- Placed after category selector
- Default: off
- Framer Motion thumb pulse on toggle-on: scale 0.9 → 1.05 → 1.0, duration 180ms

**AnimatePresence scaffold (for Track B):**
```jsx
<AnimatePresence>
  {isWarehouseItem && (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.18 }}
    >
      {/* Cost + Price fields land here in B4 */}
    </motion.div>
  )}
</AnimatePresence>
```

**Save payload:** When `isWarehouseItem` is false, null out `cbm_per_carton`. Never write `cost_per_unit`.

**File:** `app/(dashboard)/super-admin/items/page.tsx`  
Swap `ItemForm` import for `ItemFormModal`. The shared `components/admin/items/ItemForm.tsx` stays untouched.

**Acceptance:**
- Toggle saves and reloads correctly
- Empty `motion.div` container appears when toggle is on
- Toggle off → save nulls `cbm_per_carton`

---

### A6 + A7 — Catalog Query Rewrite, Empty State, Live Cart Totals

**File:** `lib/supabase/queries/warehouse.ts`

`getWarehouseCatalog` does two things in one edit:
1. Switch from `items` to `items_with_prices` view (B2, already on staging) — surfaces `warehouse_transfer_price` without exposing cost/margin.
2. Add `.eq('is_warehouse_item', true)` so only warehouse items reach store admins.

**File:** `app/(dashboard)/admin/orders/new/page.tsx`

Replace the "No items in catalog" empty state copy (when `orderableItems.length === 0`) with:

> **No orderable items yet.** Your super admin hasn't flagged any items as "warehouse items." Reach out to them to set up the catalog.

**Acceptance:**
- With current seed (all `is_warehouse_item = false`): order page shows new empty state
- After super admin toggles 5 items on: those 5 appear in catalog, nothing else

---

### A7 — Live Cart Totals

**Data source:** Handled in the A6 query rewrite above — `warehouse_transfer_price` comes from `items_with_prices`.

**CartEntry type:** Add `unitPrice: number | null`.

**CatalogItemRow changes:**
- Show `$X.XX / unit · $Y.YY / box` below item name (price × box_quantity)
- If `warehouse_transfer_price` is null: disable the row, show tooltip "Price not yet set. Ask super admin to enable ordering."

**Subtotal calculation:**
```ts
const subtotal = cartEntries.reduce((sum, e) => {
  const price = e.unitPrice ?? 0;
  return sum + price * e.item.box_quantity * e.boxes;
}, 0);
```

**Desktop order summary panel:** Add `Subtotal: $X,XXX.XX` row below Total boxes stat.

**Mobile sticky footer:** Add `Subtotal: $X,XXX.XX` to the cart bar. On subtotal change, pulse green (Framer Motion, scale 1.0 → 1.02 → 1.0, 80ms).

**Submit button:** Disabled when any cart entry has `unitPrice === null`.

**Confirmation modal before submit:**
> "Submit order for $247.80? Prices lock at submission and won't change if the warehouse updates them later."
> [Cancel] [Confirm & Submit]

Replaces the direct `handleSubmit()` call — show modal first, call submit on confirm.

**Acceptance:**
- Adding a box updates row subtotal and footer subtotal live
- Footer pulses green on subtotal change
- Submit disabled when cart empty, catalog empty, or any item missing price
- Confirmation modal shows correct total before submit fires

---

### A8 — Warehouse Badge on Super-Admin Items Grid

**File:** `components/admin/items/ItemGrid.tsx`

When `item.is_warehouse_item === true`, render a `<Warehouse size={12} />` icon badge (indigo background, white icon, absolute top-right of card).

**Acceptance:** Badge visible on flagged items only.

---

### A9 — RLS Verification

Manual test, paste raw output in PR comments:

```sql
-- As store admin
INSERT INTO items (name, organization_id) VALUES ('test', '<org>');  -- expect 42501
UPDATE items SET name = 'x' WHERE id = <any>;                        -- expect 0 rows
DELETE FROM items WHERE id = <any>;                                  -- expect 0 rows
SELECT count(*) FROM items;                                          -- expect 187
-- Repeat against category

-- As super admin
INSERT INTO items (...) RETURNING id;  -- expect success
UPDATE items SET name = 'test-renamed' WHERE id = <new_id>;           -- expect 1 row
DELETE FROM items WHERE id = <new_id>;                                -- expect 1 row
```

---

## Rollout Order

1. Apply A1 migration manually on staging
2. Create `useCanManageCatalog` hook (A3)
3. Restructure sidebar Catalog group (A4)
4. Create `ItemFormModal.tsx` + update super-admin items page (A5)
5. Update `getWarehouseCatalog` query + empty state (A6)
6. Live cart totals + confirmation modal (A7)
7. Warehouse badge (A8)
8. Run A9 verification, paste output in PR

## Files Changed

| File | Change |
|---|---|
| `utils/fixes/20260419_a1_...sql` | NEW — RLS migration |
| `lib/hooks/useCanManageCatalog.ts` | NEW |
| `app/(dashboard)/super-admin/layout.tsx` | Catalog group in sidebar |
| `app/(dashboard)/super-admin/items/_components/ItemFormModal.tsx` | NEW |
| `app/(dashboard)/super-admin/items/page.tsx` | Use ItemFormModal |
| `lib/supabase/queries/warehouse.ts` | `is_warehouse_item=true` filter + switch to `items_with_prices` |
| `components/admin/items/ItemGrid.tsx` | Warehouse badge |
| `app/(dashboard)/admin/orders/new/page.tsx` | Empty state copy + price display + confirmation modal |

## What NOT Changed

- `components/admin/items/ItemForm.tsx` — untouched
- `supabase/migrations/` — no new migrations go here
- `fulfill_order_ticket` — Track B owns that
