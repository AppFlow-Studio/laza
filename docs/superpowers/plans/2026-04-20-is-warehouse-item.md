# is_warehouse_item Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an `is_warehouse_item` boolean flag to items so ~5 Laza-branded items (cups, bags, trays, branding) can be identified as warehouse-orderable.

**Architecture:** SQL migration adds the column with `DEFAULT false`; types.ts gains the field; ItemGrid shows a read-only badge when true; the shared ItemForm gains a Switch toggle so super-admins can set it on create/edit.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL), TypeScript, react-hook-form + zod, shadcn/ui Switch.

---

## Files touched

| File | Change |
|------|--------|
| `supabase/migrations/20260420_add_is_warehouse_item.sql` | **Create** — ALTER TABLE migration |
| `lib/supabase/types.ts` | **Modify** — add field to items Row/Insert/Update + export `Item` type alias |
| `components/admin/items/ItemGrid.tsx` | **Modify** — show "Warehouse" badge when `is_warehouse_item` is true |
| `components/admin/items/ItemForm.tsx` | **Modify** — add `is_warehouse_item` Switch toggle |

---

## Task 1: SQL migration

**Files:**
- Create: `supabase/migrations/20260420_add_is_warehouse_item.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260420_add_is_warehouse_item.sql
ALTER TABLE items
  ADD COLUMN is_warehouse_item boolean NOT NULL DEFAULT false;
```

- [ ] **Step 2: Run the migration against your local/dev Supabase**

```bash
npx supabase db push
# or if using direct psql:
# psql $DATABASE_URL -f supabase/migrations/20260420_add_is_warehouse_item.sql
```

Expected: migration applies with no errors. Column appears in `items` table.

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260420_add_is_warehouse_item.sql
git commit -m "feat: add is_warehouse_item column to items table"
```

---

## Task 2: Update TypeScript types

**Files:**
- Modify: `lib/supabase/types.ts` (items Row ~line 523, Insert ~line 540, Update ~line 557)

The `items` table block currently has three sections: `Row`, `Insert`, `Update`. Add `is_warehouse_item` to each.

- [ ] **Step 1: Add field to `Row`**

Find this block (around line 538):
```ts
          updated_at: string | null
        }
        Insert: {
```

Change to:
```ts
          is_warehouse_item: boolean
          updated_at: string | null
        }
        Insert: {
```

- [ ] **Step 2: Add field to `Insert`**

Find this block (around line 555):
```ts
          updated_at?: string | null
        }
        Update: {
```

Change to:
```ts
          is_warehouse_item?: boolean
          updated_at?: string | null
        }
        Update: {
```

- [ ] **Step 3: Add field to `Update`**

Find this block (around line 572):
```ts
          updated_at?: string | null
        }
        Relationships: [
```

Change to:
```ts
          is_warehouse_item?: boolean
          updated_at?: string | null
        }
        Relationships: [
```

- [ ] **Step 4: Add `Item` type alias export at end of file**

At the very end of `lib/supabase/types.ts`, after the `Constants` block, add:

```ts
export type Item = Tables<'items'>
export type StorageSpace = Tables<'storage_spaces'>
```

(The codebase imports `Item` and `StorageSpace` from this file but they are not currently exported — this fixes that.)

- [ ] **Step 5: Verify TypeScript compiles**

```bash
npm run build 2>&1 | head -40
```

Expected: no new type errors (may already have pre-existing ones; focus on items-related errors only).

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/types.ts
git commit -m "feat: add is_warehouse_item to items types"
```

---

## Task 3: Show "Warehouse" badge in ItemGrid

**Files:**
- Modify: `components/admin/items/ItemGrid.tsx`

The grid has two render paths: `viewMode === 'list'` (table rows) and grid cards. Both need the badge. The badge style matches the existing category pill: small, rounded-full, indigo-50 bg, indigo-600 text.

- [ ] **Step 1: Add the badge to grid cards**

In the grid card section (around line 282, after the category badge `<div>`), find this pattern:
```tsx
                                <div className={cn("px-2 py-1 rounded-full text-xs font-medium", getCategoryColor(getCategoryName(item)))}>
                                    {getCategoryName(item)}
                                </div>
```

Replace with:
```tsx
                                <div className="flex items-center gap-1.5">
                                    <div className={cn("px-2 py-1 rounded-full text-xs font-medium", getCategoryColor(getCategoryName(item)))}>
                                        {getCategoryName(item)}
                                    </div>
                                    {(item as any).is_warehouse_item && (
                                        <div className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                                            Warehouse
                                        </div>
                                    )}
                                </div>
```

- [ ] **Step 2: Add the badge to list rows**

In the list view table row, find the category cell (around line 169):
```tsx
                                        <TableCell>
                                            <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getCategoryColor(getCategoryName(item)))}>
                                                {getCategoryName(item)}
                                            </span>
                                        </TableCell>
```

Replace with:
```tsx
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <span className={cn("px-2 py-1 rounded-full text-xs font-medium", getCategoryColor(getCategoryName(item)))}>
                                                    {getCategoryName(item)}
                                                </span>
                                                {(item as any).is_warehouse_item && (
                                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
                                                        Warehouse
                                                    </span>
                                                )}
                                            </div>
                                        </TableCell>
```

- [ ] **Step 3: Verify build**

```bash
npm run build 2>&1 | head -40
```

- [ ] **Step 4: Commit**

```bash
git add components/admin/items/ItemGrid.tsx
git commit -m "feat: show Warehouse badge on items in ItemGrid"
```

---

## Task 4: Add is_warehouse_item toggle to ItemForm

**Files:**
- Modify: `components/admin/items/ItemForm.tsx`

This form is used by both admin (super-admin items page) and employee contexts. The Switch only needs to appear here — it will render in both contexts. The `useUpdateItem` / `useCreateItem` mutations already accept `any` updates, so passing the new field works without touching the hooks.

- [ ] **Step 1: Add Switch import and update Zod schema**

At the top of `components/admin/items/ItemForm.tsx`, add the Switch import alongside existing imports:

```tsx
import { Switch } from "@/components/ui/switch";
import { Controller } from "react-hook-form";
```

Update the Zod schema:
```ts
const itemSchema = z.object({
    name: z.string().min(1, "Name is required"),
    sku: z.string().optional().nullable(),
    category: z.number().optional().nullable(),
    unit_of_measure: z.enum(["pcs", "kg", "liters", "lbs", "oz"]),
    min_quantity: z.number().min(0),
    is_warehouse_item: z.boolean().default(false),
});
```

- [ ] **Step 2: Add `is_warehouse_item` to form props interface and default values**

Update the `ItemFormProps` interface's `item` shape:
```ts
    item?: {
        id: number | string;
        name: string;
        sku?: string | null;
        category_id?: number | null;
        category?: { id: number; name: string } | null;
        unit_of_measure: "pcs" | "kg" | "liters" | "lbs" | "oz";
        min_quantity: number;
        is_warehouse_item?: boolean | null;
    } | null;
```

Update `useForm` default values:
```ts
        defaultValues: {
            name: "",
            sku: "",
            category: null,
            unit_of_measure: "pcs",
            min_quantity: 0,
            is_warehouse_item: false,
        },
```

- [ ] **Step 3: Destructure `control` from `useForm` and update `reset` in useEffect**

Change:
```ts
    const {
        register,
        handleSubmit,
        formState: { errors },
        reset,
    } = useForm<ItemFormData>({
```

To:
```ts
    const {
        register,
        handleSubmit,
        control,
        formState: { errors },
        reset,
    } = useForm<ItemFormData>({
```

In the `useEffect` `reset()` call, add `is_warehouse_item`:
```ts
            reset({
                name: item.name || "",
                sku: item.sku || "",
                category: categoryId,
                unit_of_measure: item.unit_of_measure || "pcs",
                min_quantity: item.min_quantity || 0,
                is_warehouse_item: item.is_warehouse_item ?? false,
            });
```

Also update the else branch:
```ts
            reset({
                name: "",
                sku: "",
                category: null,
                unit_of_measure: "pcs",
                min_quantity: 0,
                is_warehouse_item: false,
            });
```

- [ ] **Step 4: Pass `is_warehouse_item` in `onSubmit`**

In the `updateMutation.mutateAsync` call, add the field:
```ts
                await updateMutation.mutateAsync({
                    id: String(item.id),
                    updates: {
                        name: data.name,
                        sku: data.sku || null,
                        category_id: data.category || null,
                        unit_of_measure: data.unit_of_measure,
                        min_quantity: data.min_quantity,
                        is_warehouse_item: data.is_warehouse_item,
                    },
                });
```

In the `createMutation.mutateAsync` call, add the field:
```ts
                await createMutation.mutateAsync({
                    item: {
                        organization_id: organizationId,
                        name: data.name,
                        sku: data.sku || null,
                        category_id: data.category || null,
                        unit_of_measure: data.unit_of_measure,
                        min_quantity: data.min_quantity,
                        is_warehouse_item: data.is_warehouse_item,
                    },
                });
```

- [ ] **Step 5: Render the Switch field in the form JSX**

Add this block just before the `{/* Actions */}` section (after the Min Quantity field):

```tsx
            {/* Warehouse Item */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                    <p className="text-sm font-medium text-gray-700">Warehouse Item</p>
                    <p className="text-xs text-gray-400 mt-0.5">This item can be ordered from the warehouse.</p>
                </div>
                <Controller
                    name="is_warehouse_item"
                    control={control}
                    render={({ field }) => (
                        <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                            disabled={isPending}
                        />
                    )}
                />
            </div>
```

- [ ] **Step 6: Verify build**

```bash
npm run build 2>&1 | head -40
```

- [ ] **Step 7: Commit**

```bash
git add components/admin/items/ItemForm.tsx
git commit -m "feat: add is_warehouse_item toggle to ItemForm"
```

---

## Task 5: Final smoke test

- [ ] **Step 1: Start dev server**

```bash
npm run dev
```

- [ ] **Step 2: Verify super-admin items page**

Navigate to `/super-admin/items`. Open "Add Item" form — confirm the "Warehouse Item" toggle appears at the bottom, defaulting off. Create a test item with it on. Confirm the item shows the "Warehouse" badge in both grid and list views.

- [ ] **Step 3: Verify admin items page**

Navigate to `/admin/items`. Confirm the "Warehouse" badge appears on items where the flag is set. Confirm there is no toggle — it is display-only.

- [ ] **Step 4: Verify edit**

In super-admin, open edit for the warehouse item. Confirm the Switch is pre-filled to `true`. Toggle it off, save, confirm badge disappears.

- [ ] **Step 5: Final commit if any fixes needed, then done**
