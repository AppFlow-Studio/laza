# Warehouse Expenses Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix broken expense recording (caused by multi-warehouse `.single()` failure), add a warehouse dropdown selector, and auto-populate pallet count/amount when recording pallet rent.

**Architecture:** Three sequential tasks: (1) add `warehouseLocationId` filter to the backend query layer, (2) replace the broken `useWarehouseLocation` hook with `useWarehouses` + a dropdown in the page, (3) auto-populate pallet rent fields using the live `usePallets` hook inside `AddExpenseForm`. All changes are confined to three files.

**Tech Stack:** Next.js App Router, TypeScript, TanStack React Query, Supabase (service role client for server actions)

---

### Task 1: Add warehouse filter to backend query layer

**Files:**
- Modify: `lib/supabase/queries/warehouseExpenses.ts`
- Modify: `lib/supabase/actions/warehouseExpenseActions.ts`

**Background:**

`WarehouseExpenseFilters` currently has no `warehouseLocationId` field. Both `getWarehouseExpensesAction` and `getExpenseSummary` fetch all expenses for an org without scoping to a specific warehouse. We need to add optional warehouse filtering to both.

- [ ] **Step 1: Add `warehouseLocationId` to `WarehouseExpenseFilters`**

In `lib/supabase/queries/warehouseExpenses.ts`, update the interface:

```ts
export interface WarehouseExpenseFilters {
    expenseType?: ExpenseType;
    purchaseOrderId?: string;
    dateFrom?: string;
    dateTo?: string;
    warehouseLocationId?: string;
}
```

- [ ] **Step 2: Apply the filter in `getExpenseSummary`**

In `lib/supabase/queries/warehouseExpenses.ts`, update `getExpenseSummary` signature and query:

```ts
export async function getExpenseSummary(
    organizationId: string,
    dateRange?: { from: string; to: string },
    warehouseLocationId?: string,
): Promise<ExpenseSummary[]> {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    );

    const now = new Date();
    const from =
        dateRange?.from ??
        new Date(now.getFullYear(), now.getMonth(), 1)
            .toISOString()
            .split("T")[0];
    const to =
        dateRange?.to ??
        new Date(now.getFullYear(), now.getMonth() + 1, 0)
            .toISOString()
            .split("T")[0];

    let query = supabase
        .from("warehouse_expenses")
        .select("expense_type, amount")
        .eq("organization_id", organizationId)
        .gte("expense_date", from)
        .lte("expense_date", to);

    if (warehouseLocationId) {
        query = query.eq("warehouse_location_id", warehouseLocationId);
    }

    const { data, error } = await query;
    if (error) throw error;

    const summaryMap = new Map<ExpenseType, ExpenseSummary>();
    for (const row of data ?? []) {
        const type = row.expense_type as ExpenseType;
        const existing = summaryMap.get(type);
        if (existing) {
            existing.total_amount += Number(row.amount);
            existing.entry_count += 1;
        } else {
            summaryMap.set(type, {
                expense_type: type,
                total_amount: Number(row.amount),
                entry_count: 1,
            });
        }
    }

    return Array.from(summaryMap.values());
}
```

- [ ] **Step 3: Apply the filter in `getWarehouseExpensesAction`**

In `lib/supabase/actions/warehouseExpenseActions.ts`, add the warehouse filter after the existing `purchaseOrderId` check:

```ts
if (filters?.purchaseOrderId) {
    query = query.eq("purchase_order_id", filters.purchaseOrderId);
}
if (filters?.warehouseLocationId) {
    query = query.eq("warehouse_location_id", filters.warehouseLocationId);
}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/laza && npx tsc --noEmit 2>&1 | grep -E "warehouseExpenses|warehouseExpenseActions" | head -20
```

Expected: no errors for these two files.

- [ ] **Step 5: Commit**

```bash
git add "lib/supabase/queries/warehouseExpenses.ts" "lib/supabase/actions/warehouseExpenseActions.ts"
git commit -m "feat: add warehouseLocationId filter to expense queries and actions"
```

---

### Task 2: Replace broken hook with warehouse dropdown in the page

**Files:**
- Modify: `app/(dashboard)/super-admin/warehouse/expenses/page.tsx`

**Background:**

The page currently does:
```ts
const { data: warehouseLocation } = useWarehouseLocation();
const warehouseLocationId = warehouseLocation?.id;
```

`useWarehouseLocation` calls `getWarehouseLocation()` which uses `.single()`. With multiple warehouses `.single()` errors → `warehouseLocationId` is `undefined` → the `AddExpenseForm` guard `{showAddForm && orgId && warehouseLocationId && ...}` never renders the form.

We replace this with `useWarehouses()` (returns all warehouses), track the selected one in state, and add a `<select>` dropdown to the header.

- [ ] **Step 1: Update imports at the top of the page**

Replace the `useWarehouseLocation` import with `useWarehouses`:

```ts
// Remove:
import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";

// Add:
import { useWarehouses } from "@/lib/hooks/queries/useWarehouse";
```

Also add `useEffect` to the existing React import if not already present:
```ts
import { useState, useMemo, useRef, useEffect } from "react";
```
(It's already there — no change needed.)

- [ ] **Step 2: Update `useExpenseSummary` inline hook to accept `warehouseLocationId`**

In the page file, the inline `useExpenseSummary` hook (around line 134) currently calls `getExpenseSummary(organizationId, { from, to })`. Update it to accept and pass the warehouse ID:

```ts
function useExpenseSummary(organizationId: string, warehouseLocationId: string) {
    const now = new Date();
    const from = format(startOfMonth(now), "yyyy-MM-dd");
    const to = format(endOfMonth(now), "yyyy-MM-dd");
    return useQuery({
        queryKey: ["warehouse-expense-summary", organizationId, warehouseLocationId, from, to],
        queryFn: () => getExpenseSummary(organizationId, { from, to }, warehouseLocationId),
        enabled: !!organizationId && !!warehouseLocationId,
        staleTime: 60 * 1000,
    });
}
```

- [ ] **Step 3: Update `useExpenses` inline hook to include warehouse filter**

The inline `useExpenses` hook (around line 122) passes filters through. Update the `useExpenseSummary` call site and the `useExpenses` filters to include `warehouseLocationId`. The `useExpenses` hook signature stays the same — the caller passes it via filters:

```ts
function useExpenses(
    organizationId: string,
    filters?: WarehouseExpenseFilters,
) {
    return useQuery({
        queryKey: ["warehouse-expenses", organizationId, filters],
        queryFn: () => getWarehouseExpenses(organizationId, filters),
        enabled: !!organizationId && !!(filters?.warehouseLocationId),
        staleTime: 60 * 1000,
    });
}
```

- [ ] **Step 4: Replace `useWarehouseLocation` with `useWarehouses` + selected state in `WarehouseExpensesPage`**

In the `WarehouseExpensesPage` component, replace:

```ts
// REMOVE these two lines:
const { data: warehouseLocation } = useWarehouseLocation();
const warehouseLocationId = warehouseLocation?.id;
```

With:

```ts
const { data: warehouses = [], isLoading: warehousesLoading } = useWarehouses();
const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(warehouses[0].id);
    }
}, [warehouses, selectedWarehouseId]);
```

- [ ] **Step 5: Update query call sites to use `selectedWarehouseId`**

Update the three hook calls in `WarehouseExpensesPage`:

```ts
// REPLACE:
const { data: expenses = [], isLoading: expensesLoading } = useExpenses(orgId ?? "");
const { data: summary = [] } = useExpenseSummary(orgId ?? "");

// WITH:
const { data: expenses = [], isLoading: expensesLoading } = useExpenses(
    orgId ?? "",
    { warehouseLocationId: selectedWarehouseId },
);
const { data: summary = [] } = useExpenseSummary(orgId ?? "", selectedWarehouseId);
```

`useExpenseRates` stays unchanged (rates are org-wide).

- [ ] **Step 6: Add the warehouse dropdown to the page header JSX**

Find the header section (around line 899) that currently renders:
```tsx
<div>
    <h1 className="text-2xl font-bold text-gray-900">
        Warehouse Expenses
    </h1>
    <p className="text-sm text-gray-500 mt-0.5">
        ...
    </p>
</div>
```

Add the dropdown between the title block and the action buttons:

```tsx
<div>
    <h1 className="text-2xl font-bold text-gray-900">
        Warehouse Expenses
    </h1>
    <p className="text-sm text-gray-500 mt-0.5">
        {format(new Date(), "MMMM yyyy")} · Total:{" "}
        <span className="font-semibold text-gray-800">
            $
            {totalThisMonth.toLocaleString("en-US", {
                minimumFractionDigits: 2,
            })}
        </span>
    </p>
</div>

{/* Warehouse selector */}
{warehouses.length > 1 && (
    <select
        value={selectedWarehouseId}
        onChange={(e) => setSelectedWarehouseId(e.target.value)}
        disabled={warehousesLoading}
        className="px-3 py-2 border border-gray-200 rounded-xl text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-sm"
    >
        {warehouses.map((wh) => (
            <option key={wh.id} value={wh.id}>
                {wh.name}
            </option>
        ))}
    </select>
)}
```

- [ ] **Step 7: Fix the AddExpenseForm render guard**

Find the modal render guard (around line 1098):

```tsx
// REPLACE:
{showAddForm && orgId && warehouseLocationId && (
    <AddExpenseForm
        organizationId={orgId}
        warehouseLocationId={warehouseLocationId}
        ...
    />
)}

// WITH:
{showAddForm && orgId && selectedWarehouseId && (
    <AddExpenseForm
        organizationId={orgId}
        warehouseLocationId={selectedWarehouseId}
        ...
    />
)}
```

- [ ] **Step 8: Verify TypeScript compiles**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/laza && npx tsc --noEmit 2>&1 | grep "warehouse/expenses/page" | head -20
```

Expected: no errors for the page file.

- [ ] **Step 9: Manual smoke test**

1. Run `npm run dev`
2. Navigate to `localhost:3000/super-admin/warehouse/expenses`
3. Verify the warehouse dropdown appears in the header
4. Verify clicking "Add Expense" opens the form (previously broken)
5. Record a test expense and verify it saves without error

- [ ] **Step 10: Commit**

```bash
git add "app/(dashboard)/super-admin/warehouse/expenses/page.tsx"
git commit -m "fix: replace useWarehouseLocation with useWarehouses dropdown, fix broken expense form"
```

---

### Task 3: Auto-populate pallet count and amount for pallet rent

**Files:**
- Modify: `app/(dashboard)/super-admin/warehouse/expenses/page.tsx`

**Background:**

When a user selects `pallet_rent` as the expense type, the form should automatically fill in the current number of active pallets for the selected warehouse and calculate the total. "Active" pallets are those with `status = 'active'` in `warehouse_pallets`.

`usePallets(warehouseLocationId, { status: 'active' })` is available from `@/lib/hooks/queries/useWarehouse` and returns an array of active pallet records.

- [ ] **Step 1: Add `usePallets` import to the page**

Add to the existing import from `@/lib/hooks/queries/useWarehouse`:

```ts
// REPLACE:
import { useWarehouses } from "@/lib/hooks/queries/useWarehouse";

// WITH:
import { useWarehouses, usePallets } from "@/lib/hooks/queries/useWarehouse";
```

- [ ] **Step 2: Add `usePallets` hook inside `AddExpenseForm`**

In the `AddExpenseForm` function component (around line 376), add the hook call after the existing hooks:

```ts
const { data: activePallets } = usePallets(
    warehouseLocationId,
    { status: 'active' },
);
const activePalletCount = activePallets?.length ?? 0;
```

- [ ] **Step 3: Add `useEffect` to auto-fill pallet count when switching to pallet_rent**

Add a `useEffect` inside `AddExpenseForm` after the state declarations:

```ts
useEffect(() => {
    if (expenseType === 'pallet_rent' && activePalletCount > 0) {
        setPalletCount(String(activePalletCount));
    }
    // Reset when switching away
    if (expenseType !== 'pallet_rent') {
        setPalletCount('');
    }
}, [expenseType, activePalletCount]);
```

- [ ] **Step 4: Add helper label below the pallet count input**

Find the pallet count input section (around line 552). After the `<input>` for `palletCount`, add a helper text that appears only when `expenseType === 'pallet_rent'`:

```tsx
<input
    type="number"
    min="0"
    value={palletCount}
    onChange={(e) => setPalletCount(e.target.value)}
    placeholder="0"
    className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
/>
{expenseType === 'pallet_rent' && activePalletCount > 0 && (
    <p className="mt-1 text-xs text-green-600">
        {activePalletCount} active pallets in this warehouse
    </p>
)}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/laza && npx tsc --noEmit 2>&1 | grep "warehouse/expenses/page" | head -20
```

Expected: no errors.

- [ ] **Step 6: Manual smoke test**

1. Navigate to `localhost:3000/super-admin/warehouse/expenses`
2. Click "Add Expense"
3. Select "Pallet Rent" type
4. Verify the pallet count field auto-fills with the active pallet count
5. Verify the total amount auto-calculates (pallet count × rate)
6. Verify the helper label shows "X active pallets in this warehouse"
7. Verify you can still manually edit the pallet count and override the total

- [ ] **Step 7: Commit**

```bash
git add "app/(dashboard)/super-admin/warehouse/expenses/page.tsx"
git commit -m "feat: auto-populate pallet count and amount for pallet rent expense type"
```
