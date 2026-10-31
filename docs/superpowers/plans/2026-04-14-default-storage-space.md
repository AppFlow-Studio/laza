# Default Storage Space Creation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Automatically create a "Default Storage" (refrigerated) space containing all catalog items (qty 0 each) whenever a new store is created via the super-admin wizard.

**Architecture:** Single change in `StoreSetupWizard` — consume `useItems()` already available in the project, then append two extra async calls at the end of `handleSubmit`: create the default space, then bulk-assign every catalog item to it. All existing logic is untouched.

**Tech Stack:** React, TanStack React Query (`useItems`, `useCreateStorageSpace`, `useBulkAssignItems`), TypeScript

---

### Task 1: Add default storage space creation to `handleSubmit`

**Files:**
- Modify: `components/super-admin/stores/wizard/StoreSetupWizard.tsx`

**Background:**

`handleSubmit` already:
1. Creates the location
2. Creates user-defined storage spaces
3. Bulk-assigns user-chosen items per space
4. Optionally sends an admin invitation

We need to add after step 3:
- Create a storage space named `"Default Storage"` with `temperature_type: "refrigerated"`
- Assign every item returned by `useItems()` to that space with `quantity: 0` and `minQuantityOverride: null`

Key facts:
- `useItems()` is in `@/lib/hooks/queries/useItems` — it returns `Item[]` where `Item` is `Database['public']['Tables']['items']['Row']` — `id` is a **number**
- `bulkAssignMutation.mutateAsync` expects `items: Array<{ itemId: string; quantity: number; minQuantityOverride: number | null }>` — so `item.id` must be converted with `String(item.id)`
- The caller role in this wizard is `super_admin`, so the catalog ownership check in `bulkAssignItemsToStorage` is skipped
- Both mutations already exist in the component (`createStorageSpaceMutation`, `bulkAssignMutation`) — no new hooks needed

- [ ] **Step 1: Add `useItems` import**

In `components/super-admin/stores/wizard/StoreSetupWizard.tsx`, add the import next to the existing query hook imports (around line 9–13):

```ts
import { useItems } from '@/lib/hooks/queries/useItems';
```

- [ ] **Step 2: Consume `useItems()` in the component**

Inside `StoreSetupWizard()`, alongside the existing hook calls (around line 32–35), add:

```ts
const { data: items } = useItems();
```

- [ ] **Step 3: Append default storage space logic in `handleSubmit`**

In `handleSubmit`, after the block that runs `assignPromises` (around line 195 — the `if (assignPromises.length > 0) await Promise.all(assignPromises);` line), add:

```ts
// 5. Create default storage space with all catalog items
const defaultSpace = await createStorageSpaceMutation.mutateAsync({
    location_id: location.id,
    name: 'Default Storage',
    temperature_type: 'refrigerated',
});

const allItems = (items ?? []).map(item => ({
    itemId: String(item.id),
    quantity: 0,
    minQuantityOverride: null as null,
}));

if (allItems.length > 0) {
    await bulkAssignMutation.mutateAsync({
        locationId:     location.id,
        storageSpaceId: defaultSpace.id,
        items:          allItems,
    });
}
```

- [ ] **Step 4: Verify TypeScript compiles with no errors**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/laza
npx tsc --noEmit
```

Expected: no errors printed.

- [ ] **Step 5: Verify the dev server starts cleanly**

```bash
npm run dev
```

Expected: server starts on localhost:3000 with no module errors.

- [ ] **Step 6: Manual smoke test**

1. Open the super-admin platform → Stores → New Store
2. Fill in store details (Step 1)
3. Add at least one custom storage space (Step 2)
4. Skip item assignment (Step 3)
5. Skip admin invite (Step 4)
6. Click "Create Store" on the confirmation step
7. Navigate to the newly created store's storage spaces
8. Verify a "Default Storage" (refrigerated) space exists
9. Open "Default Storage" and confirm it contains all catalog items with qty 0

- [ ] **Step 7: Commit**

```bash
git add components/super-admin/stores/wizard/StoreSetupWizard.tsx
git commit -m "feat: auto-create Default Storage space with all items on store creation"
```
