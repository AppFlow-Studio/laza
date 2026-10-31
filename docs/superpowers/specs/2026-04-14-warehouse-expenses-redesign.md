# Warehouse Expenses Redesign — Design Spec

**Date:** 2026-04-14
**Status:** Approved

## Problem

`WarehouseExpensesPage` uses `useWarehouseLocation()` which calls `getWarehouseLocation()` with `.single()`. When multiple warehouse locations exist, `.single()` returns an error → `warehouseLocationId` is `undefined` → the "Add Expense" button silently does nothing. All expense recording is broken.

---

## Solution Overview

Three coordinated changes to `app/(dashboard)/super-admin/warehouse/expenses/page.tsx`:

1. **Fix the root cause** — swap `useWarehouseLocation()` for `useWarehouses()` and track a `selectedWarehouseId` state
2. **Warehouse dropdown** — a `<select>` in the page header to switch between warehouses; all queries and the form use the selected ID
3. **Pallet rent automation** — auto-populate pallet count + amount when `pallet_rent` type is selected

---

## Section 1: Warehouse Dropdown + Root Fix

### State

```ts
const { data: warehouses = [] } = useWarehouses();
const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>('');

// Default to first warehouse once loaded
useEffect(() => {
    if (warehouses.length > 0 && !selectedWarehouseId) {
        setSelectedWarehouseId(warehouses[0].id);
    }
}, [warehouses]);
```

Remove all references to `useWarehouseLocation()`.

### Dropdown UI

Add a native `<select>` to the page header, inline with the title:

```
Warehouse Expenses    [▾ Warehouse Name Dropdown]    [Manage Rates]  [Add Expense]
```

- Shows all warehouse names from `useWarehouses()`
- On change: `setSelectedWarehouseId(newId)`
- Disabled while `warehouses` is loading

### Query changes

All three inline hooks receive `selectedWarehouseId` and filter by it:

| Hook | Change |
|------|--------|
| `useExpenses` | Pass `warehouseLocationId: selectedWarehouseId` in filters |
| `useExpenseSummary` | Pass `warehouseLocationId` to `getExpenseSummary` |
| `useExpenseRates` | No change (rates are org-wide) |

### Backend changes needed

`getWarehouseExpensesAction` already filters by `organization_id`. Add optional `warehouseLocationId` to `WarehouseExpenseFilters`:

```ts
export interface WarehouseExpenseFilters {
    expenseType?: ExpenseType;
    purchaseOrderId?: string;
    dateFrom?: string;
    dateTo?: string;
    warehouseLocationId?: string;  // NEW
}
```

Apply in `getWarehouseExpensesAction`:
```ts
if (filters?.warehouseLocationId) {
    query = query.eq("warehouse_location_id", filters.warehouseLocationId);
}
```

Apply the same filter in `getExpenseSummary` (currently in `warehouseExpenses.ts` as a direct Supabase call).

### AddExpenseForm

Replace the `warehouseLocationId` prop guard:

```tsx
// Before (form never opens if warehouseLocationId is falsy):
{showAddForm && orgId && warehouseLocationId && (
    <AddExpenseForm warehouseLocationId={warehouseLocationId} ... />
)}

// After (always open if a warehouse is selected):
{showAddForm && orgId && selectedWarehouseId && (
    <AddExpenseForm warehouseLocationId={selectedWarehouseId} ... />
)}
```

---

## Section 2: Pallet Rent Automation

### In `AddExpenseForm`

When `expenseType === 'pallet_rent'`, fetch active pallets for the selected warehouse:

```ts
const { data: activePallets } = usePallets(
    warehouseLocationId,
    { status: 'active' },
);
const activePalletCount = activePallets?.length ?? 0;
```

**Auto-populate** `palletCount` when switching to `pallet_rent` type:

```ts
useEffect(() => {
    if (expenseType === 'pallet_rent' && activePalletCount > 0) {
        setPalletCount(String(activePalletCount));
    }
}, [expenseType, activePalletCount]);
```

**Show a helper label** below the pallet count input when `expenseType === 'pallet_rent'`:

```
X active pallets in this warehouse
```

User can still manually edit `palletCount` or override the total — existing behaviour unchanged.

---

## Files Changed

| File | Change |
|------|--------|
| `app/(dashboard)/super-admin/warehouse/expenses/page.tsx` | Remove `useWarehouseLocation`, add `useWarehouses` + `selectedWarehouseId` state, add dropdown, update all query calls, update form guard, add pallet auto-fill |
| `lib/supabase/queries/warehouseExpenses.ts` | Add `warehouseLocationId` to `WarehouseExpenseFilters`; apply filter in `getExpenseSummary` |
| `lib/supabase/actions/warehouseExpenseActions.ts` | Apply `warehouseLocationId` filter in `getWarehouseExpensesAction` |

---

## What Does NOT Change

- `ManageRatesPanel` — rates are org-wide, no warehouse scope needed
- `RentHistoryTable` — untouched
- `ExpenseTitleEditor` — untouched
- DB schema — no migrations needed
- Any other warehouse pages
