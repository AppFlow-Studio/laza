# is_warehouse_item Feature — Design Spec

**Date:** 2026-04-20
**Status:** Approved

## Summary

Add an `is_warehouse_item` boolean flag to items. Only ~5 Laza-branded items (cups, bags, trays, branding materials) are orderable from the warehouse. This flag identifies those items. Super-admins can set it; admins and employees see it as a read-only badge.

---

## 1. Database

**Migration:** `supabase/migrations/20260420_add_is_warehouse_item.sql`

```sql
ALTER TABLE items
  ADD COLUMN is_warehouse_item boolean NOT NULL DEFAULT false;
```

- Default `false` — all existing items are unaffected.
- No FK, no cascade changes needed.

---

## 2. TypeScript Types (`lib/supabase/types.ts`)

Add to the `items` table definition:

| Section  | Field                          | Type       |
|----------|-------------------------------|------------|
| `Row`    | `is_warehouse_item`           | `boolean`  |
| `Insert` | `is_warehouse_item`           | `boolean?` |
| `Update` | `is_warehouse_item`           | `boolean?` |

Also update the `Item` type exported from `lib/supabase/types.ts` if a manual shorthand type exists there.

---

## 3. Admin Items Page (read-only)

**File:** `components/admin/items/ItemGrid.tsx`

- When `item.is_warehouse_item === true`, render a small pill badge "Warehouse" alongside the existing category badge.
- Badge style: indigo-50 background, indigo-600 text — matches the existing category badge aesthetic (option A).
- Applies to both **grid cards** and **list rows**.
- No toggle, no editing — admins cannot change this value.

---

## 4. Super-Admin Items Page (full CRUD)

### 4a. ItemForm (`components/admin/items/ItemForm.tsx`)

- Add `is_warehouse_item: z.boolean()` to the Zod schema, defaulting to `false`.
- Render a shadcn `Switch` component with label **"Warehouse Item"** and helper text **"This item can be ordered from the warehouse."**
- Wired via `react-hook-form` `Controller`.
- Persisted in both **create** (`createMutation`) and **update** (`updateMutation`) calls.

### 4b. ItemGrid in super-admin context

- Same "Warehouse" badge as admin (read display only — editing happens in the form).

---

## 5. Out of Scope

- No filter by `is_warehouse_item` (only ~5 items will have this flag, a filter adds no value yet).
- No changes to purchase orders, warehouse ordering logic, or pallet/fulfillment flows — those consume this flag in a separate feature.
- No role-based visibility rules beyond what already exists (super-admin edits, admin reads).
