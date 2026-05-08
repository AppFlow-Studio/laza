# Purchase Line Item Storage Space Assignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow admins to assign each line item on a store purchase to a specific storage space, so inventory lands in the right bin instead of always going to unassigned location-level stock.

**Architecture:** A new nullable `storage_space_id` column on `store_purchase_items`, a recreated `create_store_purchase` RPC that reads per-item storage space from the JSONB array, TypeScript type updates, updated query functions, and UI changes to `NewPurchaseForm` (inline select) and `PurchaseDetail` (new column).

**Tech Stack:** PostgreSQL (Supabase migrations), TypeScript, Next.js App Router, react-hook-form + Zod, TanStack React Query

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `supabase/migrations/20260501_03_add_storage_space_to_purchase_items.sql` | Create | ALTER TABLE + DROP/recreate RPC |
| `lib/supabase/types.ts` | Modify | Add `storage_space_id` to `store_purchase_items` Row/Insert/Update |
| `lib/supabase/queries/storePurchases.ts` | Modify | Updated interface + RPC mapping + getById select |
| `components/admin/purchases/NewPurchaseForm.tsx` | Modify | Storage space select column in line item grid |
| `components/admin/purchases/PurchaseDetail.tsx` | Modify | Storage Space column in line items table |

---

### Task 1: Database Migration

**Files:**
- Create: `supabase/migrations/20260501_03_add_storage_space_to_purchase_items.sql`

- [ ] **Step 1: Write the migration file**

```sql
BEGIN;

-- Add nullable FK column to store_purchase_items
ALTER TABLE public.store_purchase_items
  ADD COLUMN storage_space_id UUID REFERENCES public.storage_spaces(id);

-- Recreate RPC to read per-item storage_space_id
DROP FUNCTION IF EXISTS public.create_store_purchase(TEXT, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.create_store_purchase(
  p_org_id        TEXT,
  p_location_id   UUID,
  p_purchased_by  TEXT,
  p_purchased_at  TIMESTAMPTZ,
  p_supplier_name TEXT,
  p_notes         TEXT,
  p_items         JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_purchase_id      UUID;
  v_item             JSONB;
  v_item_id          BIGINT;
  v_qty              NUMERIC;
  v_unit_cost        NUMERIC;
  v_storage_space_id UUID;
  v_total_cost       NUMERIC := 0;
  v_prev_qty         double precision;
  v_new_qty          double precision;
BEGIN
  -- Sum total cost from items array
  SELECT COALESCE(SUM((e->>'quantity')::numeric * (e->>'unit_cost')::numeric), 0)
  INTO v_total_cost
  FROM jsonb_array_elements(p_items) e;

  -- Insert purchase header
  INSERT INTO public.store_purchases
    (org_id, location_id, purchased_by, purchased_at, supplier_name, notes, total_cost)
  VALUES
    (p_org_id, p_location_id, p_purchased_by, p_purchased_at, p_supplier_name, p_notes, v_total_cost)
  RETURNING id INTO v_purchase_id;

  -- Process each line item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_item_id          := (v_item->>'item_id')::bigint;
    v_qty              := (v_item->>'quantity')::numeric;
    v_unit_cost        := (v_item->>'unit_cost')::numeric;
    v_storage_space_id := (v_item->>'storage_space_id')::uuid;  -- NULL if key absent or null

    -- Insert line item with storage_space_id
    INSERT INTO public.store_purchase_items (purchase_id, item_id, quantity, unit_cost, storage_space_id)
    VALUES (v_purchase_id, v_item_id, v_qty, v_unit_cost, v_storage_space_id);

    -- Read current quantity for this item/location/storage_space slot
    SELECT COALESCE(current_quantity, 0)
    INTO v_prev_qty
    FROM public.item_locations
    WHERE item_id          = v_item_id
      AND location_id      = p_location_id
      AND storage_space_id IS NOT DISTINCT FROM v_storage_space_id;

    IF NOT FOUND THEN v_prev_qty := 0; END IF;
    v_new_qty := v_prev_qty + v_qty;

    -- Upsert item_locations
    UPDATE public.item_locations
    SET current_quantity = v_new_qty,
        last_updated     = NOW()
    WHERE item_id          = v_item_id
      AND location_id      = p_location_id
      AND storage_space_id IS NOT DISTINCT FROM v_storage_space_id;

    IF NOT FOUND THEN
      INSERT INTO public.item_locations
        (item_id, location_id, storage_space_id, current_quantity, organization_id, last_updated)
      VALUES
        (v_item_id, p_location_id, v_storage_space_id, v_new_qty, p_org_id, NOW());
    END IF;

    -- Audit log
    INSERT INTO public.inventory_logs
      (item_id, location_id, storage_space_id, action_type,
       previous_quantity, new_quantity, quantity_change,
       user_id, notes, organization_id)
    VALUES
      (v_item_id, p_location_id, v_storage_space_id, 'received',
       v_prev_qty, v_new_qty, v_qty,
       p_purchased_by, 'Store purchase ' || v_purchase_id::text, p_org_id);
  END LOOP;

  RETURN v_purchase_id;
END;
$$;

COMMIT;
```

- [ ] **Step 2: Apply the migration in Supabase SQL Editor**

Copy the file contents into the Supabase SQL Editor and run it. Verify no errors.

- [ ] **Step 3: Verify the column was added**

Run in SQL Editor:
```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'store_purchase_items'
ORDER BY ordinal_position;
```
Expected: `storage_space_id` column appears with `data_type = 'uuid'` and `is_nullable = 'YES'`.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/20260501_03_add_storage_space_to_purchase_items.sql
git commit -m "feat: add storage_space_id to store_purchase_items and update RPC"
```

---

### Task 2: TypeScript Types

**Files:**
- Modify: `lib/supabase/types.ts`

- [ ] **Step 1: Add `storage_space_id` to `store_purchase_items` Row**

Find the `store_purchase_items` Row block (currently lines ~2078–2083) and add the new field:

```typescript
// BEFORE:
store_purchase_items: {
  Row: {
    id: string
    item_id: number
    line_total: number
    purchase_id: string
    quantity: number
    unit_cost: number
  }

// AFTER:
store_purchase_items: {
  Row: {
    id: string
    item_id: number
    line_total: number
    purchase_id: string
    quantity: number
    storage_space_id: string | null
    unit_cost: number
  }
```

- [ ] **Step 2: Add `storage_space_id` to Insert and Update shapes**

The Insert block follows the Row. Add the optional field:

```typescript
// Insert — add after purchase_id:
storage_space_id?: string | null

// Update — add after purchase_id:
storage_space_id?: string | null
```

- [ ] **Step 3: Run TypeScript check**

```bash
npm run build 2>&1 | head -40
```
Expected: no new errors related to `store_purchase_items`.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat: add storage_space_id to store_purchase_items types"
```

---

### Task 3: Query Functions

**Files:**
- Modify: `lib/supabase/queries/storePurchases.ts`

- [ ] **Step 1: Update `StorePurchaseItem` interface**

```typescript
// BEFORE:
export interface StorePurchaseItem {
  itemId: number;
  quantity: number;
  unitCost: number;
}

// AFTER:
export interface StorePurchaseItem {
  itemId: number;
  quantity: number;
  unitCost: number;
  storageSpaceId?: string | null;
}
```

- [ ] **Step 2: Pass `storage_space_id` in the RPC call**

```typescript
// BEFORE:
p_items: input.items.map((i) => ({
  item_id:   i.itemId,
  quantity:  i.quantity,
  unit_cost: i.unitCost,
})),

// AFTER:
p_items: input.items.map((i) => ({
  item_id:          i.itemId,
  quantity:         i.quantity,
  unit_cost:        i.unitCost,
  storage_space_id: i.storageSpaceId ?? null,
})),
```

- [ ] **Step 3: Add `storage_space_id` and `storage_spaces` join to `getStorePurchaseById`**

```typescript
// BEFORE (store_purchase_items nested select):
store_purchase_items (
  id,
  item_id,
  quantity,
  unit_cost,
  line_total,
  items ( id, name, unit_of_measure, sku )
)

// AFTER:
store_purchase_items (
  id,
  item_id,
  quantity,
  unit_cost,
  line_total,
  storage_space_id,
  storage_spaces ( id, name ),
  items ( id, name, unit_of_measure, sku )
)
```

- [ ] **Step 4: Run TypeScript check**

```bash
npm run build 2>&1 | head -40
```
Expected: no new type errors.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/queries/storePurchases.ts
git commit -m "feat: add storageSpaceId to StorePurchaseItem and getStorePurchaseById select"
```

---

### Task 4: UI — NewPurchaseForm + PurchaseDetail

**Files:**
- Modify: `components/admin/purchases/NewPurchaseForm.tsx`
- Modify: `components/admin/purchases/PurchaseDetail.tsx`

#### Part A — NewPurchaseForm

- [ ] **Step 1: Add `storageSpaceId` to Zod schema**

```typescript
// BEFORE:
const lineItemSchema = z.object({
  itemId:   z.number().min(1, "Select an item"),
  quantity: z.number().positive("Must be > 0"),
  unitCost: z.number().min(0, "Must be ≥ 0"),
});

// AFTER:
const lineItemSchema = z.object({
  itemId:         z.number().min(1, "Select an item"),
  quantity:       z.number().positive("Must be > 0"),
  unitCost:       z.number().min(0, "Must be ≥ 0"),
  storageSpaceId: z.string().nullable().optional(),
});
```

- [ ] **Step 2: Import `useLocationWithDetails`**

```typescript
// Add to existing imports:
import { useLocationWithDetails } from "@/lib/hooks/queries/useLocations";
```

- [ ] **Step 3: Add the hook call inside the component body**

Add immediately after the `const { selectedLocationId } = useAdminStore();` line:

```typescript
const { data: location } = useLocationWithDetails(selectedLocationId);
const storageSpaces = location?.storage_spaces ?? [];
```

- [ ] **Step 4: Update `defaultValues` to include `storageSpaceId`**

```typescript
// BEFORE:
items: [{ itemId: 0, quantity: 1, unitCost: 0 }],

// AFTER:
items: [{ itemId: 0, quantity: 1, unitCost: 0, storageSpaceId: null }],
```

- [ ] **Step 5: Update `append` call**

```typescript
// BEFORE:
onClick={() => append({ itemId: 0, quantity: 1, unitCost: 0 })}

// AFTER:
onClick={() => append({ itemId: 0, quantity: 1, unitCost: 0, storageSpaceId: null })}
```

- [ ] **Step 6: Update the submit mapping to include `storageSpaceId`**

```typescript
// BEFORE:
items: data.items.map((i) => ({
  itemId:   i.itemId,
  quantity: i.quantity,
  unitCost: i.unitCost,
})),

// AFTER:
items: data.items.map((i) => ({
  itemId:         i.itemId,
  quantity:       i.quantity,
  unitCost:       i.unitCost,
  storageSpaceId: i.storageSpaceId ?? null,
})),
```

- [ ] **Step 7: Update the grid layout and add the storage space column**

Replace the entire `<div key={field.id} ...>` block with the updated version that has the new column between Item and Qty:

```tsx
<div key={field.id} className="grid grid-cols-[1fr_160px_100px_120px_80px_32px] gap-2 items-start">
  {/* Item select */}
  <div>
    {index === 0 && <Label className="text-xs text-zinc-500 mb-1 block">Item</Label>}
    <Controller
      control={control}
      name={`items.${index}.itemId`}
      render={({ field }) => (
        <select
          value={field.value || ""}
          onChange={(e) => field.onChange(Number(e.target.value))}
          className={`w-full border rounded-md px-3 py-2 text-sm ${errors.items?.[index]?.itemId ? "border-red-400" : "border-input"}`}
        >
          <option value="">Select item…</option>
          {(catalogItems ?? []).map((item) => (
            <option key={item.id} value={item.id}>
              {item.name ?? ""}
            </option>
          ))}
        </select>
      )}
    />
  </div>

  {/* Storage space select */}
  <div>
    {index === 0 && <Label className="text-xs text-zinc-500 mb-1 block">Storage Space</Label>}
    <Controller
      control={control}
      name={`items.${index}.storageSpaceId`}
      render={({ field }) => (
        <select
          value={field.value ?? ""}
          onChange={(e) => field.onChange(e.target.value || null)}
          className="w-full border border-input rounded-md px-3 py-2 text-sm"
        >
          <option value="">Unassigned</option>
          {storageSpaces.map((ss) => (
            <option key={ss.id} value={ss.id}>
              {ss.name ?? ss.id}
            </option>
          ))}
        </select>
      )}
    />
  </div>

  {/* Quantity */}
  <div>
    {index === 0 && <Label className="text-xs text-zinc-500 mb-1 block">Qty</Label>}
    <Input
      type="number"
      step="0.01"
      placeholder="1"
      {...register(`items.${index}.quantity`, { valueAsNumber: true })}
      className={errors.items?.[index]?.quantity ? "border-red-400" : ""}
    />
  </div>

  {/* Unit cost */}
  <div>
    {index === 0 && <Label className="text-xs text-zinc-500 mb-1 block">Unit cost ($)</Label>}
    <Input
      type="number"
      step="0.01"
      placeholder="0.00"
      {...register(`items.${index}.unitCost`, { valueAsNumber: true })}
      className={errors.items?.[index]?.unitCost ? "border-red-400" : ""}
    />
  </div>

  {/* Line total */}
  <div>
    {index === 0 && <Label className="text-xs text-zinc-500 mb-1 block">Total</Label>}
    <div className="h-9 flex items-center text-sm text-zinc-600 font-medium">
      {formatCurrency(lineTotal)}
    </div>
  </div>

  {/* Remove */}
  <div className={index === 0 ? "mt-6" : ""}>
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="h-9 w-9 text-zinc-400 hover:text-red-500"
      onClick={() => fields.length > 1 && remove(index)}
      disabled={fields.length === 1}
    >
      <Trash2 className="h-4 w-4" />
    </Button>
  </div>
</div>
```

#### Part B — PurchaseDetail

- [ ] **Step 8: Update `PurchaseLineItem` interface**

```typescript
// BEFORE:
interface PurchaseLineItem {
  id: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  items: { name: string | null; unit_of_measure: string | null; sku?: string | null } | null;
}

// AFTER:
interface PurchaseLineItem {
  id: string;
  quantity: number;
  unit_cost: number;
  line_total: number;
  storage_space_id: string | null;
  storage_spaces: { id: string; name: string | null } | null;
  items: { name: string | null; unit_of_measure: string | null; sku?: string | null } | null;
}
```

- [ ] **Step 9: Add "Storage Space" column header between "Item" and "Qty"**

```tsx
// BEFORE:
<tr className="border-b border-zinc-100 text-xs text-zinc-500 uppercase tracking-wide">
  <th className="px-6 py-3 text-left">Item</th>
  <th className="px-6 py-3 text-right">Qty</th>
  <th className="px-6 py-3 text-right">Unit Cost</th>
  <th className="px-6 py-3 text-right">Total</th>
</tr>

// AFTER:
<tr className="border-b border-zinc-100 text-xs text-zinc-500 uppercase tracking-wide">
  <th className="px-6 py-3 text-left">Item</th>
  <th className="px-6 py-3 text-left">Storage Space</th>
  <th className="px-6 py-3 text-right">Qty</th>
  <th className="px-6 py-3 text-right">Unit Cost</th>
  <th className="px-6 py-3 text-right">Total</th>
</tr>
```

- [ ] **Step 10: Add Storage Space cell in each row**

```tsx
// BEFORE (row cells):
<tr key={lineItem.id} className="hover:bg-zinc-50">
  <td className="px-6 py-3 font-medium text-zinc-900">
    {lineItem.items?.name ?? "—"}
    {lineItem.items?.unit_of_measure && (
      <span className="text-xs text-zinc-400 ml-1">
        ({lineItem.items.unit_of_measure})
      </span>
    )}
  </td>
  <td className="px-6 py-3 text-right text-zinc-700">{lineItem.quantity}</td>
  ...

// AFTER:
<tr key={lineItem.id} className="hover:bg-zinc-50">
  <td className="px-6 py-3 font-medium text-zinc-900">
    {lineItem.items?.name ?? "—"}
    {lineItem.items?.unit_of_measure && (
      <span className="text-xs text-zinc-400 ml-1">
        ({lineItem.items.unit_of_measure})
      </span>
    )}
  </td>
  <td className="px-6 py-3 text-zinc-600 text-sm">
    {lineItem.storage_spaces?.name ?? "—"}
  </td>
  <td className="px-6 py-3 text-right text-zinc-700">{lineItem.quantity}</td>
  ...
```

- [ ] **Step 11: Update the tfoot `colSpan` from 3 to 4**

```tsx
// BEFORE:
<td colSpan={3} className="px-6 py-3 text-right text-sm font-semibold text-zinc-700">

// AFTER:
<td colSpan={4} className="px-6 py-3 text-right text-sm font-semibold text-zinc-700">
```

- [ ] **Step 12: Run TypeScript check and dev server**

```bash
npm run build 2>&1 | head -60
```
Expected: no new errors.

Then start the dev server and manually test:
1. Navigate to Admin > Purchases > New Purchase
2. Confirm the "Storage Space" column appears with "Unassigned" as default
3. Select a storage space for one line, leave another as Unassigned
4. Submit the purchase
5. Navigate to the detail page — confirm Storage Space column shows the correct value for each line

- [ ] **Step 13: Commit**

```bash
git add components/admin/purchases/NewPurchaseForm.tsx
git add components/admin/purchases/PurchaseDetail.tsx
git commit -m "feat: add per-line storage space picker to store purchase form and detail"
```
