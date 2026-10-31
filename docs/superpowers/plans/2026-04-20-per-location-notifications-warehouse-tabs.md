# Per-Location Notifications & Warehouse Detail Tabs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Thresholds, Expenses, and Notifications tabs to the warehouse detail page; add a Notifications tab to the store detail page; move notification preferences from a global settings page to per-location management via a shared `LocationNotificationPreferences` component; apply a DB migration so the `notification_preferences` and `daily_summary_preferences` tables support one row per location.

**Architecture:** The query/hook layer already handles `locationId` — only the DB tables are missing the column. A shared `LocationNotificationPreferences` component (wrapping existing sub-components) is dropped into the warehouse detail, store detail. The expenses tab reuses a new `WarehouseExpensesPanel` component extracted from the existing expenses page.

**Tech Stack:** Next.js App Router, Supabase (PostgreSQL), TanStack React Query, Clerk auth, shadcn/ui, Tailwind CSS, TypeScript strict mode.

---

## File Map

| Action | File |
|--------|------|
| Create | `supabase/migrations/20260420_notification_preferences_location.sql` |
| Modify | `lib/supabase/queries/warehouseExpenses.ts` |
| Modify | `lib/supabase/actions/warehouseExpenseActions.ts` |
| Create | `components/super-admin/warehouse/WarehouseExpensesPanel.tsx` |
| Modify | `app/(dashboard)/super-admin/warehouse/expenses/page.tsx` (thin wrapper) |
| Create | `components/location-notification-preferences.tsx` |
| Modify | `app/(dashboard)/super-admin/warehouse/[id]/page.tsx` |
| Modify | `app/(dashboard)/super-admin/stores/[id]/page.tsx` |
| Modify | `app/(dashboard)/super-admin/layout.tsx` |

---

## Task 1: DB Migration — add `location_id` to notification tables

**Files:**
- Create: `supabase/migrations/20260420_notification_preferences_location.sql`

- [ ] **Step 1: Create the migration file**

```sql
-- supabase/migrations/20260420_notification_preferences_location.sql

-- ── notification_preferences ──────────────────────────────────────────────────
-- The table previously had UNIQUE(organization_id) which allowed only one row
-- per org. We replace it with UNIQUE(organization_id, location_id) so every
-- location (store or warehouse) can have its own preferences row.

ALTER TABLE "public"."notification_preferences"
  ADD COLUMN IF NOT EXISTS "location_id" uuid
    REFERENCES "public"."locations"("id") ON DELETE CASCADE;

-- Drop the old unique constraint (name may vary — use the safe approach)
DO $$
BEGIN
  -- Try the most common generated name first
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'notification_preferences'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'notification_preferences_organization_id_key'
  ) THEN
    ALTER TABLE "public"."notification_preferences"
      DROP CONSTRAINT "notification_preferences_organization_id_key";
  END IF;
END $$;

ALTER TABLE "public"."notification_preferences"
  ADD CONSTRAINT "notification_preferences_org_location_unique"
  UNIQUE ("organization_id", "location_id");

-- ── daily_summary_preferences ─────────────────────────────────────────────────

ALTER TABLE "public"."daily_summary_preferences"
  ADD COLUMN IF NOT EXISTS "location_id" uuid
    REFERENCES "public"."locations"("id") ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'daily_summary_preferences'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'daily_summary_preferences_organization_id_key'
  ) THEN
    ALTER TABLE "public"."daily_summary_preferences"
      DROP CONSTRAINT "daily_summary_preferences_organization_id_key";
  END IF;
END $$;

ALTER TABLE "public"."daily_summary_preferences"
  ADD CONSTRAINT "daily_summary_preferences_org_location_unique"
  UNIQUE ("organization_id", "location_id");
```

- [ ] **Step 2: Apply migration in Supabase dashboard or CLI**

Run against your Supabase project. Verify the columns appear:
```sql
SELECT column_name FROM information_schema.columns
WHERE table_name = 'notification_preferences' AND column_name = 'location_id';
-- Expected: 1 row returned

SELECT column_name FROM information_schema.columns
WHERE table_name = 'daily_summary_preferences' AND column_name = 'location_id';
-- Expected: 1 row returned
```

- [ ] **Step 3: Commit**

```bash
git add supabase/migrations/20260420_notification_preferences_location.sql
git commit -m "feat: add location_id to notification_preferences and daily_summary_preferences"
```

---

## Task 2: Add `warehouseLocationId` filter to expense queries

**Files:**
- Modify: `lib/supabase/queries/warehouseExpenses.ts`
- Modify: `lib/supabase/actions/warehouseExpenseActions.ts`

- [ ] **Step 1: Add field to `WarehouseExpenseFilters` in `lib/supabase/queries/warehouseExpenses.ts`**

Find the `WarehouseExpenseFilters` interface (around line 19) and add the new field:

```typescript
export interface WarehouseExpenseFilters {
    expenseType?: ExpenseType;
    purchaseOrderId?: string;
    dateFrom?: string;
    dateTo?: string;
    warehouseLocationId?: string;   // ← add this line
}
```

- [ ] **Step 2: Apply the filter in `lib/supabase/actions/warehouseExpenseActions.ts`**

In `getWarehouseExpensesAction`, after the existing `dateTo` filter block (around line 63), add:

```typescript
    if (filters?.warehouseLocationId) {
        query = query.eq("warehouse_location_id", filters.warehouseLocationId);
    }
```

Full updated function for reference:
```typescript
export async function getWarehouseExpensesAction(
    organizationId: string,
    filters?: WarehouseExpenseFilters,
): Promise<WarehouseExpense[]> {
    const supabase = createServiceRoleClient();

    let query = supabase
        .from("warehouse_expenses")
        .select("*")
        .eq("organization_id", organizationId)
        .order("expense_date", { ascending: false });

    if (filters?.expenseType) {
        query = query.eq("expense_type", filters.expenseType);
    }
    if (filters?.purchaseOrderId) {
        query = query.eq("purchase_order_id", filters.purchaseOrderId);
    }
    if (filters?.dateFrom) {
        query = query.gte("expense_date", filters.dateFrom);
    }
    if (filters?.dateTo) {
        query = query.lte("expense_date", filters.dateTo);
    }
    if (filters?.warehouseLocationId) {
        query = query.eq("warehouse_location_id", filters.warehouseLocationId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return data ?? [];
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors related to `WarehouseExpenseFilters`.

- [ ] **Step 4: Commit**

```bash
git add lib/supabase/queries/warehouseExpenses.ts lib/supabase/actions/warehouseExpenseActions.ts
git commit -m "feat: add warehouseLocationId filter to expense queries"
```

---

## Task 3: Create `WarehouseExpensesPanel` + refactor expenses page

**Files:**
- Create: `components/super-admin/warehouse/WarehouseExpensesPanel.tsx`
- Modify: `app/(dashboard)/super-admin/warehouse/expenses/page.tsx`

The goal: move all the constants, inline hooks, and sub-components from `WarehouseExpensesPage` (1115 lines) into `WarehouseExpensesPanel.tsx`, which accepts `{ organizationId, warehouseLocationId }` props. The expenses page becomes a thin wrapper.

- [ ] **Step 1: Create `components/super-admin/warehouse/WarehouseExpensesPanel.tsx`**

Copy the entire content of `app/(dashboard)/super-admin/warehouse/expenses/page.tsx` as the starting point, then make these changes:

1. Remove the `export default function WarehouseExpensesPage()` function entirely
2. Add a `WarehouseExpensesPanel` component that accepts props instead of deriving values from hooks:

```typescript
"use client";

// All the existing imports from expenses/page.tsx go here (unchanged)
import { useState, useMemo, useRef, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { format, startOfMonth, endOfMonth } from "date-fns";
import {
    Plus, Settings2, Truck, Container, Warehouse,
    PackageOpen, MoreHorizontal, CheckCircle2, X,
    Pencil, Check, Loader2,
} from "lucide-react";
import { toast } from "react-hot-toast";
import {
    getWarehouseExpenses, createWarehouseExpense, getExpenseSummary,
    getExpenseRates, updateExpenseRate,
    type ExpenseType, type WarehouseExpenseFilters,
} from "@/lib/supabase/queries/warehouseExpenses";
import { updateWarehouseExpenseTitleAction } from "@/lib/supabase/actions/warehouseExpenseActions";
import { RentHistoryTable } from "@/components/super-admin/warehouse/RentHistoryTable";
import { getFriendlyErrorMessage } from "@/lib/utils/errorMessages";

// ── All EXPENSE_TYPES, TYPE_COLORS, TYPE_CARD_STYLES constants — copy unchanged from page.tsx ──
// ── All inline hooks (useExpenses, useExpenseSummary, useExpenseRates, useCreateExpense,
//    useUpdateRate, useUpdateExpenseTitle) — copy unchanged from page.tsx.
//    Update useExpenses to accept and pass the warehouseLocationId filter: ──

function useExpenses(
    organizationId: string,
    filters?: WarehouseExpenseFilters,
) {
    return useQuery({
        queryKey: ["warehouse-expenses", organizationId, filters],
        queryFn: () => getWarehouseExpenses(organizationId, filters),
        enabled: !!organizationId,
        staleTime: 60 * 1000,
    });
}

// useExpenseSummary, useExpenseRates, useCreateExpense, useUpdateRate,
// useUpdateExpenseTitle — copy unchanged from page.tsx

// ── All sub-components (SummaryCard, ExpenseTypeBadge, ExpenseTitleEditor,
//    AddExpenseForm, ManageRatesPanel) — copy unchanged from page.tsx ──

// ── Main panel component ──────────────────────────────────────────────────────

interface WarehouseExpensesPanelProps {
    organizationId: string;
    warehouseLocationId: string;
}

export function WarehouseExpensesPanel({
    organizationId,
    warehouseLocationId,
}: WarehouseExpensesPanelProps) {
    const { data: expenses = [], isLoading: expensesLoading } = useExpenses(
        organizationId,
        { warehouseLocationId },  // ← key difference: filter by this warehouse
    );
    const { data: summary = [] } = useExpenseSummary(organizationId);
    const { data: rates = [] } = useExpenseRates(organizationId);

    const [showAddForm, setShowAddForm] = useState(false);
    const [showManageRates, setShowManageRates] = useState(false);
    const [filterType, setFilterType] = useState<ExpenseType | "all">("all");

    const summaryByType = useMemo(() => {
        return EXPENSE_TYPES.filter((t) => t.value !== "other").map((type) => {
            const found = summary.find((s: any) => s.expense_type === type.value);
            return {
                type: type.value as ExpenseType,
                amount: found?.total_amount ?? 0,
                count: found?.entry_count ?? 0,
            };
        });
    }, [summary]);

    const totalThisMonth = summaryByType.reduce((acc, s) => acc + s.amount, 0);

    const filteredExpenses = useMemo(() => {
        if (filterType === "all") return expenses;
        return expenses.filter((e) => e.expense_type === filterType);
    }, [expenses, filterType]);

    // ── Render: same JSX as WarehouseExpensesPage, minus the outer page wrapper div ──
    // Copy the return JSX from WarehouseExpensesPage starting from the Header div.
    // Replace `orgId` references with `organizationId`.
    // Remove the `min-h-screen bg-gray-50` outer wrapper (tab content provides its own padding).
    return (
        <div className="max-w-5xl mx-auto py-6 space-y-8">
            {/* Header, Summary Cards, Expense List, Rent History — same JSX as page.tsx */}
            {/* Modals */}
            {showAddForm && (
                <AddExpenseForm
                    organizationId={organizationId}
                    warehouseLocationId={warehouseLocationId}
                    rates={rates}
                    onClose={() => setShowAddForm(false)}
                />
            )}
            {showManageRates && (
                <ManageRatesPanel
                    organizationId={organizationId}
                    rates={rates}
                    onClose={() => setShowManageRates(false)}
                />
            )}
        </div>
    );
}
```

- [ ] **Step 2: Refactor `app/(dashboard)/super-admin/warehouse/expenses/page.tsx` to thin wrapper**

Replace the entire file content with:

```typescript
"use client";

import { useAuth } from "@clerk/nextjs";
import { useWarehouseLocation } from "@/lib/hooks/queries/useWarehouse";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import { WarehouseExpensesPanel } from "@/components/super-admin/warehouse/WarehouseExpensesPanel";

export default function WarehouseExpensesPage() {
    const { orgId } = useAuth();
    const { data: warehouseLocation, isLoading } = useWarehouseLocation();

    if (isLoading || !orgId || !warehouseLocation) {
        return <LoadingSkeleton />;
    }

    return (
        <WarehouseExpensesPanel
            organizationId={orgId}
            warehouseLocationId={warehouseLocation.id}
        />
    );
}
```

- [ ] **Step 3: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Verify expenses page still works**

Start dev server (`npm run dev`), navigate to `/super-admin/warehouse/expenses`. Confirm expenses list loads, Add Expense modal opens, rates panel opens.

- [ ] **Step 5: Commit**

```bash
git add components/super-admin/warehouse/WarehouseExpensesPanel.tsx app/(dashboard)/super-admin/warehouse/expenses/page.tsx
git commit -m "refactor: extract WarehouseExpensesPanel for reuse in warehouse detail tab"
```

---

## Task 4: Create `LocationNotificationPreferences` component

**Files:**
- Create: `components/location-notification-preferences.tsx`

This component is the shared notification preferences UI dropped into warehouse detail, store detail. It mirrors the structure of `app/(dashboard)/admin/settings/notifications/page.tsx` but accepts `locationId` as a prop (rather than reading it from `useUserInfo`).

- [ ] **Step 1: Create `components/location-notification-preferences.tsx`**

```typescript
"use client";

import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
import { LoadingSkeleton } from "@/components/admin/shared/LoadingSkeleton";
import GeneralNotificationPreferences from "@/components/admin/settings/GeneralNotificationPreferences";
import LowStockAlertPreferences from "@/components/admin/settings/LowStockAlertPreferences";
import LowStockThresholdManager from "@/components/admin/settings/LowStockThresholdManager";
import DailySummaryPreferences from "@/components/admin/settings/DailySummaryPreferences";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Mail, AlertTriangle, BarChart3 } from "lucide-react";

interface LocationNotificationPreferencesProps {
    locationId: string;
}

export function LocationNotificationPreferences({
    locationId,
}: LocationNotificationPreferencesProps) {
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;

    if (!organizationId) {
        return <LoadingSkeleton />;
    }

    return (
        <Tabs defaultValue="general" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="general" className="flex items-center gap-2">
                    <Bell className="w-4 h-4" />
                    <span className="hidden sm:inline">General</span>
                </TabsTrigger>
                <TabsTrigger value="low-stock" className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="hidden sm:inline">Low Stock</span>
                </TabsTrigger>
                <TabsTrigger value="thresholds" className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    <span className="hidden sm:inline">Thresholds</span>
                </TabsTrigger>
                <TabsTrigger value="daily-summary" className="flex items-center gap-2">
                    <Mail className="w-4 h-4" />
                    <span className="hidden sm:inline">Daily Summary</span>
                </TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="mt-6">
                <GeneralNotificationPreferences
                    organizationId={organizationId}
                    locationId={locationId}
                />
            </TabsContent>

            <TabsContent value="low-stock" className="mt-6">
                <LowStockAlertPreferences
                    organizationId={organizationId}
                    locationId={locationId}
                />
            </TabsContent>

            <TabsContent value="thresholds" className="mt-6">
                <LowStockThresholdManager
                    organizationId={organizationId}
                    locationId={locationId}
                />
            </TabsContent>

            <TabsContent value="daily-summary" className="mt-6">
                <DailySummaryPreferences
                    organizationId={organizationId}
                    locationId={locationId}
                />
            </TabsContent>
        </Tabs>
    );
}
```

- [ ] **Step 2: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add components/location-notification-preferences.tsx
git commit -m "feat: add LocationNotificationPreferences shared component"
```

---

## Task 5: Add Thresholds, Expenses, Notifications tabs to warehouse detail page

**Files:**
- Modify: `app/(dashboard)/super-admin/warehouse/[id]/page.tsx`

The page is 937 lines. Key changes: expand the `TabId` type, add 3 tab buttons, add 3 tab content blocks, import the new components.

- [ ] **Step 1: Add imports at the top of the file (after existing imports)**

```typescript
import { Receipt, Thermometer, Bell } from "lucide-react";
import LowStockThresholdManager from "@/components/admin/settings/LowStockThresholdManager";
import { WarehouseExpensesPanel } from "@/components/super-admin/warehouse/WarehouseExpensesPanel";
import { LocationNotificationPreferences } from "@/components/location-notification-preferences";
import { useUserInfo } from "@/lib/hooks/queries/useUserInfo";
```

- [ ] **Step 2: Expand `TabId` type (line 24)**

Replace:
```typescript
type TabId = "inventory" | "shipments" | "pallets";
```
With:
```typescript
type TabId = "inventory" | "shipments" | "pallets" | "thresholds" | "expenses" | "notifications";
```

- [ ] **Step 3: Add `useUserInfo` call inside the page component**

Inside `export default function WarehouseDetailPage()`, after the existing hooks (after `useWarehouseInventory`, etc.), add:

```typescript
const { data: userInfo } = useUserInfo();
const organizationId = userInfo?.members?.organization_id ?? "";
```

- [ ] **Step 4: Update the `setActiveTab` validator**

Find the `rawTab` / `activeTab` block (the URL-based tab state) and update the valid tab list:

```typescript
const activeTab: TabId = (
    ["inventory", "shipments", "pallets", "thresholds", "expenses", "notifications"] as TabId[]
).includes(rawTab as TabId)
    ? (rawTab as TabId)
    : "inventory";
```

- [ ] **Step 5: Add 3 new entries to the `tabs` array**

Find the `tabs` array (around line 866) and append:

```typescript
const tabs: { id: TabId; label: string; icon: React.ElementType; count?: number }[] = [
    { id: "inventory",     label: "Inventory",     icon: LayoutGrid },
    { id: "shipments",     label: "Shipments",     icon: Ship },
    { id: "pallets",       label: "Pallets",       icon: Layers, count: palletStats?.total },
    { id: "thresholds",    label: "Thresholds",    icon: Thermometer },
    { id: "expenses",      label: "Expenses",      icon: Receipt },
    { id: "notifications", label: "Notifications", icon: Bell },
];
```

- [ ] **Step 6: Add 3 new tab content blocks (after the existing `pallets` block)**

After:
```typescript
{activeTab === "pallets" && (
    <PalletsTab warehouseId={id} />
)}
```

Add:
```typescript
{activeTab === "thresholds" && organizationId && (
    <LowStockThresholdManager organizationId={organizationId} locationId={id} />
)}

{activeTab === "expenses" && organizationId && (
    <WarehouseExpensesPanel
        organizationId={organizationId}
        warehouseLocationId={id}
    />
)}

{activeTab === "notifications" && (
    <LocationNotificationPreferences locationId={id} />
)}
```

- [ ] **Step 7: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 8: Verify in browser**

Navigate to `/super-admin/warehouse/<some-id>`. Confirm all 6 tabs render. Click Thresholds — `LowStockThresholdManager` loads. Click Expenses — `WarehouseExpensesPanel` loads filtered to this warehouse. Click Notifications — `LocationNotificationPreferences` loads with 4 sub-tabs.

- [ ] **Step 9: Commit**

```bash
git add "app/(dashboard)/super-admin/warehouse/[id]/page.tsx"
git commit -m "feat: add Thresholds, Expenses, Notifications tabs to warehouse detail page"
```

---

## Task 6: Add Notifications tab to store detail page

**Files:**
- Modify: `app/(dashboard)/super-admin/stores/[id]/page.tsx`

The page uses a local `TABS` const array and `activeTab` state (not URL-based).

- [ ] **Step 1: Add import at top of file**

```typescript
import { Bell } from "lucide-react";
import { LocationNotificationPreferences } from "@/components/location-notification-preferences";
```

- [ ] **Step 2: Add `notifications` to `TABS` array (around line 29)**

Replace:
```typescript
const TABS = [
    { key: "stock",      label: "In-Store Stock", icon: Package },
    { key: "employees",  label: "Employees",      icon: Users },
    { key: "audit",      label: "Audit Logs",     icon: Clock },
] as const;
```
With:
```typescript
const TABS = [
    { key: "stock",          label: "In-Store Stock",   icon: Package },
    { key: "employees",      label: "Employees",        icon: Users },
    { key: "audit",          label: "Audit Logs",       icon: Clock },
    { key: "notifications",  label: "Notifications",    icon: Bell },
] as const;
```

- [ ] **Step 3: Add tab content block for `notifications`**

In the JSX, find where each `activeTab === "..."` block renders its content. After the last existing tab content block, add:

```typescript
{activeTab === "notifications" && (
    <LocationNotificationPreferences locationId={locationId} />
)}
```

Note: `locationId` is already declared at line 39 as `params.id as string`.

- [ ] **Step 4: Run TypeScript check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Verify in browser**

Navigate to `/super-admin/stores/<some-id>`. Confirm the Notifications tab appears and loads the 4-tab notification preferences UI.

- [ ] **Step 6: Commit**

```bash
git add "app/(dashboard)/super-admin/stores/[id]/page.tsx"
git commit -m "feat: add Notifications tab to store detail page"
```

---

## Task 7: Comment out notifications nav link in super-admin layout

**Files:**
- Modify: `app/(dashboard)/super-admin/layout.tsx`

- [ ] **Step 1: Comment out the Settings nav item (around line 71–75)**

Find:
```typescript
{
    name: "Settings",
    href: "/super-admin/settings/notifications",
    icon: Settings,
},
```
Replace with:
```typescript
// {
//     name: "Settings",
//     href: "/super-admin/settings/notifications",
//     icon: Settings,
// },
```

- [ ] **Step 2: Verify in browser**

Navigate to `/super-admin`. Confirm "Settings" no longer appears in the sidebar.

- [ ] **Step 3: Commit**

```bash
git add "app/(dashboard)/super-admin/layout.tsx"
git commit -m "chore: hide notifications settings nav link (now managed per-location)"
```

---

## Self-Review

### Spec coverage check
| Spec requirement | Task |
|-----------------|------|
| DB: add `location_id` to `notification_preferences`, change unique constraint | Task 1 |
| DB: add `location_id` to `daily_summary_preferences` | Task 1 |
| `getNotificationPreferences` filters by `locationId` | Already done (no change needed) |
| `WarehouseExpensesPanel` with `warehouseLocationId` filter | Tasks 2 + 3 |
| `LocationNotificationPreferences` shared component | Task 4 |
| Warehouse detail: Thresholds tab (LowStockThresholdManager filtered by locationId) | Task 5 |
| Warehouse detail: Expenses tab (WarehouseExpensesPanel filtered by warehouseLocationId) | Task 5 |
| Warehouse detail: Notifications tab (LocationNotificationPreferences) | Task 5 |
| Store detail: Notifications tab | Task 6 |
| Admin dashboard: already has per-location notifications page | No change needed — `admin/settings/notifications/page.tsx` already passes `locationId` from `useUserInfo` |
| Comment out settings nav link (keep page file) | Task 7 |
| Backend email services lookup by location_id | Not in scope — existing services use org-level lookup and are not changed by this plan |

### Placeholder scan
No TBDs found. Task 3 (WarehouseExpensesPanel) notes "copy unchanged" for parts that are identical to the existing expenses page — this is intentional guidance to avoid repeating 800+ lines in the plan.

### Type consistency check
- `TabId` expanded consistently in steps 2 and 4 of Task 5
- `WarehouseExpensesPanel` props: `{ organizationId: string; warehouseLocationId: string }` — used consistently in Tasks 3 and 5
- `LocationNotificationPreferences` props: `{ locationId: string }` — used consistently in Tasks 4, 5, 6
- `LowStockThresholdManager` already accepts `{ organizationId: string; locationId?: string }` — no change needed
