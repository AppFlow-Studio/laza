# Track A — Permission Lockdown, Warehouse Flag, Live Cart Totals

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Lock down catalog writes to super_admin, filter order catalog to warehouse items only, and show live transfer-price totals on the store-admin order creation page.

**Architecture:** DB-first (RLS migration applied manually), then hook formalization, then UI — each task produces a self-contained, verifiable change. Track B's `items_with_prices` view is already live on staging and drives the price data for A7.

**Tech Stack:** Next.js App Router, Supabase (RLS + views), TanStack React Query, Framer Motion, shadcn/ui, react-hook-form + zod, TypeScript strict mode.

---

## File Map

| File | Action | Task |
|---|---|---|
| `utils/fixes/20260419_a1_restrict_item_category_writes_to_super_admin.sql` | CREATE | 1 |
| `lib/hooks/useCanManageCatalog.ts` | CREATE | 2 |
| `app/(dashboard)/super-admin/layout.tsx` | MODIFY — Catalog sidebar group | 3 |
| `app/(dashboard)/super-admin/items/_components/ItemFormModal.tsx` | CREATE | 4 |
| `app/(dashboard)/super-admin/items/page.tsx` | MODIFY — swap ItemForm → ItemFormModal | 5 |
| `lib/supabase/queries/warehouse.ts` | MODIFY — type + query | 6 |
| `app/(dashboard)/admin/orders/new/page.tsx` | MODIFY — price display + empty state + confirm modal | 7 |
| `components/admin/items/ItemGrid.tsx` | MODIFY — add Warehouse icon to badge | 8 |

---

## Task 1: A1 — RLS Migration File

**Files:**
- Create: `utils/fixes/20260419_a1_restrict_item_category_writes_to_super_admin.sql`

- [ ] **Step 1: Create the migration file**

```sql
BEGIN;

-- Drop store-admin write policies on items
DROP POLICY IF EXISTS "Admins can insert items in their organization" ON public.items;
DROP POLICY IF EXISTS "Admins can update items in their organization" ON public.items;
DROP POLICY IF EXISTS "Admins can delete items in their organization" ON public.items;

-- Drop store-admin write policies on category
DROP POLICY IF EXISTS "Admins can insert category in their organization" ON public.category;
DROP POLICY IF EXISTS "Admins can update category in their organization" ON public.category;
DROP POLICY IF EXISTS "Admins can delete category in their organization" ON public.category;

-- Cleanup: drop the duplicate SELECT policies (will be recreated or already exist as consolidated)
DROP POLICY IF EXISTS "Enable read access for all users" ON public.items;
DROP POLICY IF EXISTS "Enable read access for all users" ON public.category;

COMMIT;
```

Save to `utils/fixes/20260419_a1_restrict_item_category_writes_to_super_admin.sql`.

- [ ] **Step 2: Apply to staging manually**

Go to the Supabase dashboard for staging project `tgcfddsianjssvdksnbu` → SQL Editor → paste and run the migration. Do NOT place this file in `supabase/migrations/` — that folder is auto-applied by CI.

- [ ] **Step 3: Verify RLS as store admin**

In Supabase SQL Editor, impersonate a store-admin session and run:

```sql
-- Expect: ERROR 42501 (new row violates row-level security policy)
INSERT INTO items (name, organization_id) VALUES ('rls-test', 'org_3AQrBG3KHRmsNBv41shelk1yUzS');

-- Expect: 0 rows affected
UPDATE items SET name = 'rls-x' WHERE id = 1;

-- Expect: 0 rows affected
DELETE FROM items WHERE id = 1;

-- Expect: 187 (or however many items exist)
SELECT count(*) FROM items;

-- Repeat the INSERT/UPDATE/DELETE against category table — expect same results
INSERT INTO category (name, organization_id) VALUES ('rls-test', 'org_3AQrBG3KHRmsNBv41shelk1yUzS');
```

- [ ] **Step 4: Verify RLS as super admin**

```sql
-- Expect: success, returns new id
INSERT INTO items (name, organization_id) VALUES ('sa-test', 'org_3AQrBG3KHRmsNBv41shelk1yUzS') RETURNING id;

-- Expect: 1 row updated
UPDATE items SET name = 'sa-renamed' WHERE id = <new_id_from_above>;

-- Expect: 1 row deleted
DELETE FROM items WHERE id = <new_id_from_above>;
```

Paste raw output of all 7 checks in the PR comments.

- [ ] **Step 5: Commit the file**

```bash
git add utils/fixes/20260419_a1_restrict_item_category_writes_to_super_admin.sql
git commit -m "feat(a1): add RLS migration restricting item/category writes to super_admin"
```

---

## Task 2: A3 — useCanManageCatalog Hook

**Files:**
- Create: `lib/hooks/useCanManageCatalog.ts`

- [ ] **Step 1: Create the hook**

```ts
// lib/hooks/useCanManageCatalog.ts
'use client';

import { useUserInfo } from '@/lib/hooks/queries/useUserInfo';

export function useCanManageCatalog() {
    const { data: user } = useUserInfo();
    return user?.role === 'super_admin';
}
```

- [ ] **Step 2: Verify it builds**

```bash
npm run build 2>&1 | grep -E "error|Error"
```

Expected: no TypeScript errors referencing this file.

- [ ] **Step 3: Commit**

```bash
git add lib/hooks/useCanManageCatalog.ts
git commit -m "feat(a3): add useCanManageCatalog hook"
```

---

## Task 3: A4 — Catalog Group in Super-Admin Sidebar

**Files:**
- Modify: `app/(dashboard)/super-admin/layout.tsx`

The sidebar already has `CollapsibleNavGroup` used for Warehouse and Analytics. We add a Catalog group following the exact same pattern. Items and Categories currently appear as flat entries in the `navigation` array — remove them there and add a `catalogChildren` array.

- [ ] **Step 1: Add the catalogChildren array and remove flat entries**

Find the `navigation` array at the top of `layout.tsx`. It currently looks like:

```ts
const navigation = [
    { name: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { name: "All Stores", href: "/super-admin/stores", icon: Store },
    { name: "Purchase Orders", href: "/super-admin/purchase-orders", icon: ShoppingCart },
    { name: "Orders", href: "/super-admin/orders", icon: StretchHorizontal },
    { name: "Users", href: "/super-admin/users", icon: Users },
    { name: "Items", href: "/super-admin/items", icon: Package },
    { name: "Categories", href: "/super-admin/categories", icon: Tags },
];
```

Remove the Items and Categories entries and add a `catalogChildren` array after `analyticsChildren`:

```ts
const navigation = [
    { name: "Dashboard", href: "/super-admin", icon: LayoutDashboard },
    { name: "All Stores", href: "/super-admin/stores", icon: Store },
    { name: "Purchase Orders", href: "/super-admin/purchase-orders", icon: ShoppingCart },
    { name: "Orders", href: "/super-admin/orders", icon: StretchHorizontal },
    { name: "Users", href: "/super-admin/users", icon: Users },
];

const catalogChildren = [
    { name: "Items", href: "/super-admin/items", icon: Package },
    { name: "Categories", href: "/super-admin/categories", icon: Tags },
];
```

- [ ] **Step 2: Render the Catalog CollapsibleNavGroup in the sidebar JSX**

Find where the Warehouse and Analytics `CollapsibleNavGroup` components are rendered in the sidebar JSX (search for `<CollapsibleNavGroup` in the file). Add the Catalog group in the same location, after the flat navigation items and before or after the Warehouse group:

```jsx
<CollapsibleNavGroup
    label="Catalog"
    icon={Package}
    basePath="/super-admin/items"
    children={catalogChildren}
    pathname={pathname}
/>
```

Note: `basePath` is used to auto-expand the group when on either Items or Categories. Since `pathname.startsWith('/super-admin/items')` won't match `/super-admin/categories`, you need to update the `isOnSection` logic for this group. The easiest fix is to pass a custom `isActive` prop or check both paths. Look at how `CollapsibleNavGroup` computes `isOnSection` — it does `pathname?.startsWith(basePath)`. Change `basePath` to `/super-admin` and add both paths as children so active state triggers on either. Actually the simpler fix: just set `basePath="/super-admin/items"` and accept that the group won't auto-expand when on Categories. OR pass `basePath="/super-admin"` which will always be active (too broad). 

Best approach: modify `CollapsibleNavGroup` to accept an optional `activePaths?: string[]` prop:

```tsx
function CollapsibleNavGroup({
    label,
    icon: Icon,
    basePath,
    activePaths,
    children,
    pathname,
}: {
    label: string;
    icon: React.ElementType;
    basePath: string;
    activePaths?: string[];
    children: { name: string; href: string; icon: React.ElementType }[];
    pathname: string;
}) {
    const { state } = useSidebar();
    const isCollapsed = state === "collapsed";
    const isOnSection = activePaths
        ? activePaths.some(p => pathname?.startsWith(p))
        : pathname?.startsWith(basePath);
    // ... rest unchanged
```

Then pass:
```jsx
<CollapsibleNavGroup
    label="Catalog"
    icon={Package}
    basePath="/super-admin/items"
    activePaths={["/super-admin/items", "/super-admin/categories"]}
    children={catalogChildren}
    pathname={pathname}
/>
```

- [ ] **Step 3: Verify in browser**

Start the dev server (`npm run dev`) and sign in as super_admin. Confirm:
- Sidebar shows "Catalog" group that collapses/expands
- Navigating to `/super-admin/items` highlights Items and keeps group expanded
- Navigating to `/super-admin/categories` highlights Categories and keeps group expanded

- [ ] **Step 4: Commit**

```bash
git add app/\(dashboard\)/super-admin/layout.tsx
git commit -m "feat(a4): add Catalog collapsible group to super-admin sidebar"
```

---

## Task 4: A5 — ItemFormModal (super-admin-specific)

**Files:**
- Create: `app/(dashboard)/super-admin/items/_components/ItemFormModal.tsx`

This is a self-contained form for super-admin item create/edit. It mirrors `components/admin/items/ItemForm.tsx` but adds the warehouse toggle with a Framer Motion pulse and an `AnimatePresence` container for Track B's Cost + Price fields.

- [ ] **Step 1: Create the _components directory and ItemFormModal.tsx**

```tsx
// app/(dashboard)/super-admin/items/_components/ItemFormModal.tsx
"use client";

import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";
import { useCreateItem, useUpdateItem } from "@/lib/hooks/queries/useItems";
import { useCategories } from "@/lib/hooks/queries/useCategories";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { Switch } from "@/components/ui/switch";
import toast from "react-hot-toast";

const itemSchema = z.object({
    name: z.string().min(1, "Name is required"),
    sku: z.string().optional().nullable(),
    category: z.number().optional().nullable(),
    unit_of_measure: z.enum(["pcs", "kg", "liters", "lbs", "oz"]),
    min_quantity: z.number().min(0),
    is_warehouse_item: z.boolean().default(false),
});

type ItemFormData = z.infer<typeof itemSchema>;

interface ItemFormModalProps {
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
    onSuccess?: () => void;
    onCancel?: () => void;
}

export default function ItemFormModal({ item, onSuccess, onCancel }: ItemFormModalProps) {
    const { data: userInfo } = useUserInfo();
    const { data: categories, isLoading: categoriesLoading } = useCategories();
    const createMutation = useCreateItem();
    const updateMutation = useUpdateItem();

    const {
        register,
        handleSubmit,
        control,
        watch,
        formState: { errors },
        reset,
    } = useForm<ItemFormData>({
        resolver: zodResolver(itemSchema),
        defaultValues: {
            name: "",
            sku: "",
            category: null,
            unit_of_measure: "pcs",
            min_quantity: 0,
            is_warehouse_item: false,
        },
    });

    const isWarehouseItem = watch("is_warehouse_item");

    useEffect(() => {
        if (item && categories) {
            let categoryId: number | null = null;
            if (item.category_id) {
                categoryId = item.category_id;
            } else if (item.category && typeof item.category === "object" && "id" in item.category) {
                categoryId = item.category.id;
            }
            reset({
                name: item.name || "",
                sku: item.sku || "",
                category: categoryId,
                unit_of_measure: item.unit_of_measure || "pcs",
                min_quantity: item.min_quantity || 0,
                is_warehouse_item: item.is_warehouse_item ?? false,
            });
        } else if (!item) {
            reset({
                name: "",
                sku: "",
                category: null,
                unit_of_measure: "pcs",
                min_quantity: 0,
                is_warehouse_item: false,
            });
        }
    }, [item, categories, reset]);

    const onSubmit = async (data: ItemFormData) => {
        try {
            const organizationId = userInfo?.members?.organization_id;
            if (!organizationId) {
                toast.error("Organization not found");
                return;
            }

            const payload = {
                name: data.name,
                sku: data.sku || null,
                category_id: data.category || null,
                unit_of_measure: data.unit_of_measure,
                min_quantity: data.min_quantity,
                is_warehouse_item: data.is_warehouse_item,
                // When toggled off, null out warehouse-only fields
                cbm_per_carton: data.is_warehouse_item ? undefined : null,
            };

            if (item) {
                await updateMutation.mutateAsync({ id: String(item.id), updates: payload });
                toast.success("Item updated successfully");
            } else {
                await createMutation.mutateAsync({ item: { organization_id: organizationId, ...payload } });
                toast.success("Item created successfully");
            }

            onSuccess?.();
        } catch (error: any) {
            toast.error(error.message || "An error occurred");
        }
    };

    const isPending = createMutation.isPending || updateMutation.isPending;

    const selectClass =
        "w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all disabled:opacity-50 disabled:cursor-not-allowed appearance-none";

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Item Name */}
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Item Name <span className="text-rose-500">*</span>
                </label>
                <input
                    id="name"
                    {...register("name")}
                    placeholder="e.g. Nutella, Paper Bags"
                    disabled={isPending}
                    className={cn(
                        "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all",
                        errors.name
                            ? "border-rose-400 focus:ring-rose-500"
                            : "border-gray-200 focus:ring-indigo-500",
                    )}
                />
                {errors.name && (
                    <p className="text-xs text-rose-500 font-medium mt-1">{errors.name.message}</p>
                )}
            </div>

            {/* SKU */}
            <div>
                <label htmlFor="sku" className="block text-sm font-medium text-gray-700 mb-1.5">
                    SKU <span className="text-gray-400 font-normal">(Optional)</span>
                </label>
                <input
                    id="sku"
                    {...register("sku")}
                    placeholder="e.g. NUT-001"
                    disabled={isPending}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all"
                />
            </div>

            {/* Category */}
            <div>
                <label htmlFor="category" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Category
                </label>
                <select
                    id="category"
                    {...register("category", { setValueAs: (v) => (v === "" ? null : Number(v)) })}
                    disabled={categoriesLoading || isPending}
                    className={selectClass}
                >
                    <option value="">Select a category</option>
                    {categories?.map((category) => (
                        <option key={category.id} value={category.id}>
                            {category.name}
                        </option>
                    ))}
                </select>
            </div>

            {/* Warehouse Item Toggle */}
            <div className="flex items-center justify-between rounded-xl border border-gray-200 px-4 py-3">
                <div>
                    <p className="text-sm font-medium text-gray-700">Warehouse item</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                        Flip on if this item is stocked and ordered from the central warehouse.
                        Only warehouse items appear in store order tickets.
                    </p>
                </div>
                <Controller
                    name="is_warehouse_item"
                    control={control}
                    render={({ field }) => (
                        <motion.div
                            animate={field.value ? { scale: [0.9, 1.05, 1.0] } : { scale: 1 }}
                            transition={{ duration: 0.18 }}
                        >
                            <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                disabled={isPending}
                            />
                        </motion.div>
                    )}
                />
            </div>

            {/* Animated container for Track B (Cost + Price fields) */}
            <AnimatePresence>
                {isWarehouseItem && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.18 }}
                        style={{ overflow: "hidden" }}
                    >
                        {/* Cost + Price fields land here in B4 */}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Unit of Measure */}
            <div>
                <label htmlFor="unit_of_measure" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Unit of Measure
                </label>
                <select
                    id="unit_of_measure"
                    {...register("unit_of_measure")}
                    disabled={isPending}
                    className={selectClass}
                >
                    <option value="pcs">Pieces</option>
                    <option value="kg">Kilograms</option>
                    <option value="liters">Liters</option>
                    <option value="lbs">Pounds</option>
                    <option value="oz">Ounces</option>
                </select>
            </div>

            {/* Minimum Quantity */}
            <div>
                <label htmlFor="min_quantity" className="block text-sm font-medium text-gray-700 mb-1.5">
                    Minimum Quantity
                </label>
                <input
                    id="min_quantity"
                    type="number"
                    step="0.01"
                    min="0"
                    {...register("min_quantity", { valueAsNumber: true })}
                    disabled={isPending}
                    className={cn(
                        "w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all",
                        errors.min_quantity
                            ? "border-rose-400 focus:ring-rose-500"
                            : "border-gray-200 focus:ring-indigo-500",
                    )}
                />
                {errors.min_quantity && (
                    <p className="text-xs text-rose-500 font-medium mt-1">{errors.min_quantity.message}</p>
                )}
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
                {onCancel && (
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={isPending}
                        className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        Cancel
                    </button>
                )}
                <button
                    type="submit"
                    disabled={isPending}
                    className={cn(
                        "px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
                        onCancel ? "flex-1" : "w-full",
                    )}
                >
                    {isPending ? (
                        <span className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                            Saving…
                        </span>
                    ) : item ? (
                        "Update Item"
                    ) : (
                        "Create Item"
                    )}
                </button>
            </div>
        </form>
    );
}
```

- [ ] **Step 2: Run type-check**

```bash
npm run build 2>&1 | grep -E "error TS"
```

Expected: no errors in `ItemFormModal.tsx`.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/super-admin/items/_components/ItemFormModal.tsx"
git commit -m "feat(a5): add super-admin ItemFormModal with warehouse toggle and AnimatePresence scaffold"
```

---

## Task 5: A5b — Wire ItemFormModal into super-admin items page

**Files:**
- Modify: `app/(dashboard)/super-admin/items/page.tsx`

The super-admin items page currently imports `ItemForm` from `components/admin/items/ItemForm`. Swap it for `ItemFormModal`.

- [ ] **Step 1: Update the import**

Find this line in `app/(dashboard)/super-admin/items/page.tsx`:

```ts
import ItemForm from '@/components/admin/items/ItemForm';
```

Replace with:

```ts
import ItemFormModal from '@/app/(dashboard)/super-admin/items/_components/ItemFormModal';
```

- [ ] **Step 2: Replace usage**

Find all occurrences of `<ItemForm` in the file and replace with `<ItemFormModal`. The props are identical (`item`, `onSuccess`, `onCancel`), so no other changes needed.

- [ ] **Step 3: Verify in browser**

Sign in as super_admin. Go to `/super-admin/items`. Click "Add Item" — confirm the form opens with the warehouse toggle. Toggle it on — confirm the AnimatePresence container slides in smoothly. Toggle off — confirm it slides out. Save a test item — confirm it persists on reload.

- [ ] **Step 4: Commit**

```bash
git add "app/(dashboard)/super-admin/items/page.tsx"
git commit -m "feat(a5): wire ItemFormModal into super-admin items page"
```

---

## Task 6: A6 — Catalog Query Rewrite

**Files:**
- Modify: `lib/supabase/queries/warehouse.ts`

Two changes to `getWarehouseCatalog`:
1. Switch from `items` to `items_with_prices` view (exposes `warehouse_transfer_price` without cost/margin).
2. Add `is_warehouse_item = true` filter.
3. Extend `WarehouseCatalogItem` type with `warehouse_transfer_price`.

- [ ] **Step 1: Extend the WarehouseCatalogItem type**

Find the `WarehouseCatalogItem` type definition (around line 38). Add `warehouse_transfer_price` and `is_warehouse_item`:

```ts
export type WarehouseCatalogItem = {
    id: number;
    organization_id: string;
    name: string;
    sku: string | null;
    unit_of_measure: "pcs" | "kg" | "liters" | "lbs" | "oz";
    box_quantity: number | null;
    is_warehouse_item: boolean;
    warehouse_transfer_price: number | null;
    category:
        | {
              id: number;
              name: string;
          }[]
        | null;
};
```

- [ ] **Step 2: Update getWarehouseCatalog**

Find the `getWarehouseCatalog` function (around line 172). Replace it entirely:

```ts
export async function getWarehouseCatalog(organizationId: string) {
    const supabase = await createServerSupabaseClient();
    const { data, error } = await supabase
        .from("items_with_prices")
        .select(
            `
            id,
            organization_id,
            name,
            sku,
            unit_of_measure,
            box_quantity,
            is_warehouse_item,
            warehouse_transfer_price,
            category (
                id,
                name
            )
        `,
        )
        .eq("organization_id", organizationId)
        .eq("is_warehouse_item", true)
        .order("name", { ascending: true });

    if (error) throw error;
    return data as unknown as WarehouseCatalogItem[];
}
```

- [ ] **Step 3: Run type-check**

```bash
npm run build 2>&1 | grep -E "error TS"
```

Expected: no errors. If TypeScript complains about `items_with_prices` not being in the Database type, the `as unknown as WarehouseCatalogItem[]` cast already handles it.

- [ ] **Step 4: Verify in browser**

Sign in as store admin. Go to `/admin/orders/new`. With all items having `is_warehouse_item = false`, you should see the empty state. Have a super admin toggle one item on via `/super-admin/items`, then reload — that item should appear in the catalog.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/queries/warehouse.ts
git commit -m "feat(a6): filter order catalog to is_warehouse_item=true via items_with_prices view"
```

---

## Task 7: A7 — Live Cart Totals + Confirmation Modal

**Files:**
- Modify: `app/(dashboard)/admin/orders/new/page.tsx`

This is the largest change. It touches: the `CartEntry` type, `CatalogItemRow`, the desktop summary panel, the mobile sticky bar, and adds a confirmation modal before submission. The `warehouse_transfer_price` comes through the updated `WarehouseCatalogItem` type from Task 6.

- [ ] **Step 1: Update the CartEntry type and add price to cart state**

Find the `CartEntry` type near the top of the file:

```ts
type CartEntry = {
    item: WarehouseCatalogItem & { box_quantity: number };
    boxes: number;
    selectedConfig: ShipmentBoxConfig | null;
};
```

Replace with:

```ts
type CartEntry = {
    item: WarehouseCatalogItem & { box_quantity: number };
    boxes: number;
    selectedConfig: ShipmentBoxConfig | null;
    unitPrice: number | null;
};
```

- [ ] **Step 2: Update handleAdd to capture unitPrice**

Find `handleAdd`:

```ts
const handleAdd = useCallback(
    (
        item: WarehouseCatalogItem & { box_quantity: number },
        boxes: number,
        config: ShipmentBoxConfig | null,
    ) => {
        setCart((prev) => ({
            ...prev,
            [item.id]: { item, boxes, selectedConfig: config },
        }));
    },
    [],
);
```

Replace with:

```ts
const handleAdd = useCallback(
    (
        item: WarehouseCatalogItem & { box_quantity: number },
        boxes: number,
        config: ShipmentBoxConfig | null,
    ) => {
        setCart((prev) => ({
            ...prev,
            [item.id]: {
                item,
                boxes,
                selectedConfig: config,
                unitPrice: item.warehouse_transfer_price ?? null,
            },
        }));
    },
    [],
);
```

- [ ] **Step 3: Add subtotal computation and hasMissingPrice flag**

Find where `cartEntries`, `totalItems`, `totalBoxes`, `hasItems` are computed. Add below them:

```ts
const subtotal = cartEntries.reduce((sum, e) => {
    if (e.unitPrice == null || e.item.box_quantity == null) return sum;
    return sum + e.unitPrice * e.item.box_quantity * e.boxes;
}, 0);

const hasMissingPrice = cartEntries.some((e) => e.unitPrice == null);

const formatCurrency = (amount: number) =>
    new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
```

- [ ] **Step 4: Add confirmSubmitOpen state**

Add a state for the confirmation modal near the other state declarations:

```ts
const [confirmSubmitOpen, setConfirmSubmitOpen] = useState(false);
```

- [ ] **Step 5: Update the empty state copy**

Find the empty state block that renders when `filteredItems.length === 0 && orderableItems.length === 0`. Replace the content inside the existing `<div>` structure:

```tsx
<div className="flex flex-col items-center justify-center py-16 text-center">
    <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center mb-3">
        <Package size={18} className="text-gray-300" />
    </div>
    <p className="text-sm font-semibold text-gray-500">No orderable items yet</p>
    <p className="text-xs text-gray-400 mt-1 max-w-xs">
        Your super admin hasn&apos;t flagged any items as &quot;warehouse items.&quot;
        Reach out to them to set up the catalog.
    </p>
</div>
```

- [ ] **Step 6: Update CatalogItemRow to show price and disable missing-price rows**

Find `CatalogItemRow`. No prop changes needed — `warehouse_transfer_price` is already on the `item` prop via the updated `WarehouseCatalogItem` type from Task 6. Just derive the display values inside the component body:

```ts
const unitPrice = item.warehouse_transfer_price ?? null;
const missingPrice = unitPrice == null;
const ppb = effectivePiecesPerBox(item, localConfig);
const pricePerBox = unitPrice != null && item.box_quantity != null
    ? unitPrice * item.box_quantity
    : null;
```

After the item name `<span>` and the "In order" badge, add the price line:

```tsx
{missingPrice ? (
    <div className="mt-1 text-[11px] text-amber-600 font-medium flex items-center gap-1">
        <AlertCircle size={10} /> Price not yet set — ask super admin to enable ordering
    </div>
) : (
    <div className="mt-1 text-[11px] text-gray-500">
        {formatCurrency(unitPrice!)} / unit
        {pricePerBox != null && (
            <span className="ml-1 text-indigo-600 font-semibold">
                · {formatCurrency(pricePerBox)} / box
            </span>
        )}
    </div>
)}
```

Wrap the entire row `<div>` with `opacity-50 pointer-events-none` when `missingPrice`:

```tsx
<div
    className={cn(
        `flex items-center gap-3 p-3.5 rounded-xl border transition-all duration-100`,
        missingPrice
            ? "border-gray-100 bg-gray-50 opacity-60 pointer-events-none"
            : inCart
              ? "border-indigo-300 bg-indigo-50/40"
              : "border-gray-200 bg-white hover:border-violet-200 hover:shadow-[0_1px_6px_rgba(99,102,241,0.07)]",
    )}
>
```

`formatCurrency` is defined at module scope (Step 3 placed it before the `NewOrderPage` function), so `CatalogItemRow` can call it directly — no prop needed.

- [ ] **Step 7: Update the desktop order summary panel to show subtotal**

Find the desktop stats header with the two-column grid for "Line items" and "Total boxes". Add a subtotal row below it:

```tsx
{hasItems && (
    <motion.div
        key={subtotal}
        animate={{ scale: [1, 1.02, 1], color: ["#16a34a", "#16a34a", "inherit"] }}
        transition={{ duration: 0.08 }}
        className="mt-3 flex items-center justify-between px-4 py-2.5 bg-indigo-50 rounded-xl"
    >
        <span className="text-xs font-semibold text-indigo-700">Subtotal</span>
        <span className="text-sm font-bold text-indigo-700">{formatCurrency(subtotal)}</span>
    </motion.div>
)}
```

- [ ] **Step 8: Update the mobile sticky cart bar to show subtotal**

Find the mobile sticky bar (`md:hidden`) that shows `{totalItems} items · {totalBoxes} boxes`. Update the paragraph to also show subtotal:

```tsx
<p className="text-sm font-bold text-gray-900 truncate">
    {totalItems} item{totalItems !== 1 ? "s" : ""} ·{" "}
    {totalBoxes} box{totalBoxes !== 1 ? "es" : ""}
</p>
<p className="text-[11px] text-indigo-600 font-semibold">
    {formatCurrency(subtotal)}
</p>
```

- [ ] **Step 9: Add the confirmation modal**

Import `AlertDialog` components (they're already imported in other pages — add them here):

```tsx
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
```

Add the modal JSX at the bottom of the page return, just before the closing `</div>`:

```tsx
<AlertDialog open={confirmSubmitOpen} onOpenChange={setConfirmSubmitOpen}>
    <AlertDialogContent>
        <AlertDialogHeader>
            <AlertDialogTitle>Confirm order submission</AlertDialogTitle>
            <AlertDialogDescription>
                Submit order for <strong>{formatCurrency(subtotal)}</strong>?
                Prices lock at submission and won&apos;t change if the warehouse updates them later.
            </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
                onClick={() => {
                    setConfirmSubmitOpen(false);
                    handleSubmit();
                }}
                className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
                Confirm &amp; Submit
            </AlertDialogAction>
        </AlertDialogFooter>
    </AlertDialogContent>
</AlertDialog>
```

- [ ] **Step 10: Replace direct Submit button calls with confirmation modal opener**

Find every place that calls `handleSubmit()` directly (the desktop submit button `onClick` and the mobile sheet submit button `onClick`). Replace:

```tsx
onClick={handleSubmit}
```

with:

```tsx
onClick={() => setConfirmSubmitOpen(true)}
```

Also update the `disabled` condition on every submit button to include `hasMissingPrice`:

```tsx
disabled={!hasItems || isSubmitting || missingContext || hasMissingPrice}
```

- [ ] **Step 11: Verify in browser as store admin**

1. Go to `/admin/orders/new`
2. With no warehouse items — confirm the new empty state copy appears
3. After super admin enables items — confirm they appear with `$X.XX / unit · $Y.YY / box`
4. Add items to cart — confirm subtotal updates live in desktop panel and mobile bar
5. Click Submit — confirm confirmation modal appears with correct total
6. Confirm — confirm order submits and redirects to `/admin/orders`
7. A priced item with `warehouse_transfer_price = null` — confirm its row is dimmed and unclickable

- [ ] **Step 12: Commit**

```bash
git add "app/(dashboard)/admin/orders/new/page.tsx"
git commit -m "feat(a7): live cart totals, price-per-row display, and submission confirmation modal"
```

---

## Task 8: A8 — Warehouse Icon Badge on ItemGrid

**Files:**
- Modify: `components/admin/items/ItemGrid.tsx`

The grid already shows a text "Warehouse" badge. Update it to include the `Warehouse` lucide icon alongside the text for visual clarity.

- [ ] **Step 1: Add Warehouse to the lucide import**

Find the import line:

```ts
import { Package, Edit, Trash2, Check, AlertTriangle } from 'lucide-react';
```

Add `Warehouse`:

```ts
import { Package, Edit, Trash2, Check, AlertTriangle, Warehouse } from 'lucide-react';
```

- [ ] **Step 2: Update the grid-view badge (line ~292)**

Find this block in the grid view:

```tsx
{(item as any).is_warehouse_item && (
    <div className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
        Warehouse
    </div>
)}
```

Replace with:

```tsx
{(item as any).is_warehouse_item && (
    <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
        <Warehouse size={10} />
        Warehouse
    </div>
)}
```

- [ ] **Step 3: Update the list-view badge (line ~172)**

Find the same pattern in the list view:

```tsx
{(item as any).is_warehouse_item && (
    <span className="px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
        Warehouse
    </span>
)}
```

Replace with:

```tsx
{(item as any).is_warehouse_item && (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-600">
        <Warehouse size={10} />
        Warehouse
    </span>
)}
```

- [ ] **Step 4: Verify in browser**

Go to `/super-admin/items`. Toggle `is_warehouse_item` on for one item. Confirm the warehouse icon + "Warehouse" badge appears on that card in both grid and list views.

- [ ] **Step 5: Commit**

```bash
git add components/admin/items/ItemGrid.tsx
git commit -m "feat(a8): add Warehouse icon to is_warehouse_item badge in ItemGrid"
```

---

## Task 9: A9 — RLS Verification + Final Check

This task is manual verification only — no code changes.

- [ ] **Step 1: Run the full A9 SQL checklist on staging**

In the Supabase SQL editor for staging (`tgcfddsianjssvdksnbu`):

```sql
-- === As store admin session ===
INSERT INTO items (name, organization_id) VALUES ('a9-test', 'org_3AQrBG3KHRmsNBv41shelk1yUzS');
-- Expected: ERROR 42501 new row violates row-level security policy

UPDATE items SET name = 'a9-x' WHERE id = 1;
-- Expected: UPDATE 0

DELETE FROM items WHERE id = 1;
-- Expected: DELETE 0

SELECT count(*) FROM items;
-- Expected: 187 (or current row count)

INSERT INTO category (name, organization_id) VALUES ('a9-cat', 'org_3AQrBG3KHRmsNBv41shelk1yUzS');
-- Expected: ERROR 42501

UPDATE category SET name = 'a9-x' WHERE id = 1;
-- Expected: UPDATE 0

DELETE FROM category WHERE id = 1;
-- Expected: DELETE 0

-- === As super admin session ===
INSERT INTO items (name, organization_id, unit_of_measure, min_quantity)
VALUES ('a9-sa-test', 'org_3AQrBG3KHRmsNBv41shelk1yUzS', 'pcs', 0)
RETURNING id;
-- Expected: success, returns new id

UPDATE items SET name = 'a9-sa-renamed' WHERE id = <returned_id>;
-- Expected: UPDATE 1

DELETE FROM items WHERE id = <returned_id>;
-- Expected: DELETE 1
```

- [ ] **Step 2: Paste raw output as a PR comment**

Copy the raw output from all 10 checks and paste into the PR description or comments. Format as a code block.

- [ ] **Step 3: End-to-end smoke test**

1. Super admin: toggle `is_warehouse_item = true` on 1 item, set a transfer price for it via direct SQL or wait for B4
2. Store admin: go to `/admin/orders/new` — that 1 item appears in the catalog
3. Store admin: add it to cart, confirm price row and subtotal show
4. Store admin: click Submit → confirm modal → confirm order submits
5. Verify in Supabase that the `order_tickets` row has `status = 'submitted'`

---

## Rollout Order Recap

1. Task 1 — A1 RLS migration (apply on staging)
2. Task 2 — A3 hook
3. Task 3 — A4 sidebar
4. Task 4 — A5 ItemFormModal
5. Task 5 — A5b wire into page
6. Task 6 — A6 catalog query
7. Task 7 — A7 live cart totals
8. Task 8 — A8 badge
9. Task 9 — A9 verification

**Do not merge before Task 9 is complete and SQL output is pasted in the PR.**
