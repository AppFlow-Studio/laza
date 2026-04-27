# New Catalog Items Banner Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show a dismissible banner on the super-admin store detail page listing catalog items not yet assigned to any storage space at that store, with a modal to assign them in bulk.

**Architecture:** Six isolated changes across the data layer (query function + hook + cache invalidation) and UI layer (two new components + one page edit). Each layer is independently verifiable. No existing logic is restructured.

**Tech Stack:** Next.js App Router, Supabase (service role client), TanStack React Query, Framer Motion, shadcn/ui (Dialog, Button), Tailwind CSS, react-hot-toast, lucide-react

**Constraints:**
- Do NOT commit until the user explicitly says to
- Do NOT modify any file not listed in this plan

---

## File Map

| Action | File | Purpose |
|--------|------|---------|
| Modify | `lib/supabase/queries/items.ts` | Add `getUnassignedItemsForLocation` query |
| Modify | `lib/hooks/queries/useItems.ts` | Add `useUnassignedItemsForLocation` hook + cache invalidation |
| Create | `components/super-admin/stores/AssignNewItemsModal.tsx` | Bulk-assign modal |
| Create | `components/super-admin/stores/NewCatalogItemsBanner.tsx` | Banner (consumes hook, renders modal) |
| Modify | `app/(dashboard)/super-admin/stores/[id]/page.tsx` | Wire banner between header and tabs |

---

## Task 1: Add `getUnassignedItemsForLocation` query function

**Files:**
- Modify: `lib/supabase/queries/items.ts` (append at end of file)

- [ ] **Step 1: Add the function**

Append to the bottom of `lib/supabase/queries/items.ts`:

```typescript
export async function getUnassignedItemsForLocation(
    organizationId: string,
    locationId: string
) {
    const supabase = createServiceRoleClient();

    const [{ data: allItems, error: itemsErr }, { data: assigned, error: assignedErr }] =
        await Promise.all([
            supabase
                .from('items')
                .select('id, name, sku, category_id, unit_of_measure, min_quantity')
                .eq('organization_id', organizationId),
            supabase
                .from('item_locations')
                .select('item_id')
                .eq('location_id', locationId),
        ]);

    if (itemsErr) throw itemsErr;
    if (assignedErr) throw assignedErr;

    const assignedIds = new Set((assigned ?? []).map(r => r.item_id));
    return (allItems ?? []).filter(item => !assignedIds.has(item.id));
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/laza && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors on `lib/supabase/queries/items.ts`.

---

## Task 2: Add `useUnassignedItemsForLocation` hook + cache invalidation

**Files:**
- Modify: `lib/hooks/queries/useItems.ts`

- [ ] **Step 1: Add the import for the new query function**

In `lib/hooks/queries/useItems.ts`, find the existing import block at the top:

```typescript
import {
    getAllItems,
    getItemById,
    getItemsByCategory,
    searchItems,
    createItem,
    updateItem,
    deleteItem,
    bulkUpdateItems,
    bulkDeleteItems,
    bulkUpdateItemPrices,
    superAdminCreateItem,
    superAdminUpdateItem,
    superAdminDeleteItem,
    superAdminBulkUpdateItems,
    superAdminBulkDeleteItems,
    getSuperAdminItems,
} from '@/lib/supabase/queries/items';
```

Replace with:

```typescript
import {
    getAllItems,
    getItemById,
    getItemsByCategory,
    searchItems,
    createItem,
    updateItem,
    deleteItem,
    bulkUpdateItems,
    bulkDeleteItems,
    bulkUpdateItemPrices,
    superAdminCreateItem,
    superAdminUpdateItem,
    superAdminDeleteItem,
    superAdminBulkUpdateItems,
    superAdminBulkDeleteItems,
    getSuperAdminItems,
    getUnassignedItemsForLocation,
} from '@/lib/supabase/queries/items';
```

- [ ] **Step 2: Add the hook at the bottom of `lib/hooks/queries/useItems.ts`**

Append after `useSuperAdminBulkDeleteItems`:

```typescript
export function useUnassignedItemsForLocation(locationId: string) {
    const { data: userInfo } = useUserInfo();
    const organizationId = userInfo?.members?.organization_id;
    return useQuery({
        queryKey: ['unassigned-items', locationId],
        queryFn: () => getUnassignedItemsForLocation(organizationId!, locationId),
        enabled: !!locationId && !!organizationId,
        staleTime: 60_000,
    });
}
```

- [ ] **Step 3: Add cache invalidation to `useCreateItem`**

Find this existing `onSuccess` in `useCreateItem` (around line 82):

```typescript
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
        },
```

Replace with:

```typescript
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            queryClient.invalidateQueries({ queryKey: ['unassigned-items'] });
        },
```

- [ ] **Step 4: Add cache invalidation to `useSuperAdminCreateItem`**

Find this existing `onSuccess` in `useSuperAdminCreateItem` (around line 148):

```typescript
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
        },
```

Replace with:

```typescript
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['items'] });
            queryClient.invalidateQueries({ queryKey: ['unassigned-items'] });
        },
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/laza && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors on `lib/hooks/queries/useItems.ts`.

---

## Task 3: Create `AssignNewItemsModal`

**Files:**
- Create: `components/super-admin/stores/AssignNewItemsModal.tsx`

- [ ] **Step 1: Create the file**

Create `components/super-admin/stores/AssignNewItemsModal.tsx` with this content:

```typescript
"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { useBulkAssignItems } from "@/lib/hooks/queries/useStorageSetup";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface Props {
    items: Array<{ id: number; name: string | null; sku: string | null }>;
    storageSpaces: { id: string; name: string }[];
    locationId: string;
    onClose: () => void;
}

export default function AssignNewItemsModal({
    items,
    storageSpaces,
    locationId,
    onClose,
}: Props) {
    const queryClient = useQueryClient();
    const bulkAssign = useBulkAssignItems();
    const [selectedSpaceId, setSelectedSpaceId] = useState(
        storageSpaces[0]?.id ?? ""
    );
    const [checkedIds, setCheckedIds] = useState<Set<number>>(
        new Set(items.map((i) => i.id))
    );

    function toggle(id: number) {
        setCheckedIds((prev) => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    }

    function handleConfirm() {
        if (!selectedSpaceId || checkedIds.size === 0) return;
        bulkAssign.mutate(
            {
                locationId,
                storageSpaceId: selectedSpaceId,
                items: [...checkedIds].map((id) => ({
                    itemId: String(id),
                    quantity: 0,
                })),
            },
            {
                onSuccess: () => {
                    toast.success("Items assigned successfully");
                    queryClient.invalidateQueries({
                        queryKey: ["unassigned-items", locationId],
                    });
                    onClose();
                },
                onError: (err: unknown) => {
                    const message =
                        err instanceof Error ? err.message : "Failed to assign items";
                    toast.error(message);
                },
            }
        );
    }

    const canConfirm =
        !!selectedSpaceId && checkedIds.size > 0 && !bulkAssign.isPending;

    return (
        <Dialog open onOpenChange={(open) => !open && onClose()}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>Assign new items to storage</DialogTitle>
                </DialogHeader>

                <div className="space-y-4">
                    <div>
                        <label className="text-sm font-medium text-zinc-700 block mb-1">
                            Assign all selected items to:
                        </label>
                        <select
                            value={selectedSpaceId}
                            onChange={(e) => setSelectedSpaceId(e.target.value)}
                            className="w-full rounded-md border border-zinc-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        >
                            {storageSpaces.length === 0 && (
                                <option value="">No storage spaces available</option>
                            )}
                            {storageSpaces.map((s) => (
                                <option key={s.id} value={s.id}>
                                    {s.name}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="max-h-64 overflow-y-auto space-y-1 border border-zinc-100 rounded-lg p-2">
                        {items.map((item) => (
                            <label
                                key={item.id}
                                className="flex items-center gap-3 px-2 py-1.5 rounded-md hover:bg-zinc-50 cursor-pointer"
                            >
                                <input
                                    type="checkbox"
                                    checked={checkedIds.has(item.id)}
                                    onChange={() => toggle(item.id)}
                                    className="accent-indigo-600"
                                />
                                <span className="text-sm font-medium text-zinc-900 flex-1">
                                    {item.name}
                                </span>
                                {item.sku && (
                                    <span className="text-xs text-zinc-400">{item.sku}</span>
                                )}
                            </label>
                        ))}
                    </div>
                </div>

                <DialogFooter>
                    <Button
                        variant="outline"
                        onClick={onClose}
                        disabled={bulkAssign.isPending}
                    >
                        Cancel
                    </Button>
                    <Button onClick={handleConfirm} disabled={!canConfirm}>
                        {bulkAssign.isPending ? "Assigning..." : "Confirm"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/laza && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors on the new file.

---

## Task 4: Create `NewCatalogItemsBanner`

**Files:**
- Create: `components/super-admin/stores/NewCatalogItemsBanner.tsx`

- [ ] **Step 1: Create the file**

Create `components/super-admin/stores/NewCatalogItemsBanner.tsx` with this content:

```typescript
"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Package, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useUnassignedItemsForLocation } from "@/lib/hooks/queries/useItems";
import AssignNewItemsModal from "./AssignNewItemsModal";

interface Props {
    locationId: string;
    storageSpaces: { id: string; name: string }[];
}

export default function NewCatalogItemsBanner({ locationId, storageSpaces }: Props) {
    const { data: unassigned } = useUnassignedItemsForLocation(locationId);
    const [dismissed, setDismissed] = useState(false);
    const [showModal, setShowModal] = useState(false);

    if (!unassigned || unassigned.length === 0 || dismissed) return null;

    const count = unassigned.length;
    const preview = unassigned
        .slice(0, 3)
        .map((i) => i.name)
        .filter(Boolean)
        .join(", ");
    const overflow = count > 3 ? ` +${count - 3} more` : "";
    const subtitle = preview + overflow;

    return (
        <>
            <AnimatePresence>
                <motion.div
                    initial={{ opacity: 0, y: -8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    className="flex items-center gap-4 rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-4"
                >
                    <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                        <Package size={16} className="text-indigo-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-indigo-900">
                            {count} new item{count !== 1 ? "s" : ""} added to the catalog
                        </p>
                        <p className="text-xs text-indigo-600 truncate mt-0.5">{subtitle}</p>
                    </div>
                    <Button
                        size="sm"
                        onClick={() => setShowModal(true)}
                        className="bg-indigo-600 hover:bg-indigo-700 text-white flex-shrink-0"
                    >
                        Assign to storage →
                    </Button>
                    <button
                        onClick={() => setDismissed(true)}
                        className="flex-shrink-0 text-indigo-400 hover:text-indigo-600 p-1 rounded"
                        aria-label="Dismiss"
                    >
                        <X size={16} />
                    </button>
                </motion.div>
            </AnimatePresence>
            {showModal && (
                <AssignNewItemsModal
                    items={unassigned}
                    storageSpaces={storageSpaces}
                    locationId={locationId}
                    onClose={() => setShowModal(false)}
                />
            )}
        </>
    );
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/laza && npx tsc --noEmit 2>&1 | head -30
```

Expected: no errors.

---

## Task 5: Wire banner into the store detail page

**Files:**
- Modify: `app/(dashboard)/super-admin/stores/[id]/page.tsx`

- [ ] **Step 1: Add the import**

In `app/(dashboard)/super-admin/stores/[id]/page.tsx`, find the existing imports block. After the last import line, add:

```typescript
import NewCatalogItemsBanner from "@/components/super-admin/stores/NewCatalogItemsBanner";
```

- [ ] **Step 2: Render the banner**

Find this section in the JSX (around line 198):

```tsx
            <div className="mt-6">
                {/* Tab strip */}
```

Insert the banner immediately before that `<div className="mt-6">`:

```tsx
            <NewCatalogItemsBanner
                locationId={locationId}
                storageSpaces={(location.storage_spaces ?? []).map((s: any) => ({
                    id: s.id,
                    name: s.name,
                }))}
            />
            <div className="mt-6">
                {/* Tab strip */}
```

- [ ] **Step 3: Final TypeScript check**

```bash
cd /Users/munistursunov/Projects/APPFLOW_STUDIO/laza && npx tsc --noEmit 2>&1 | head -40
```

Expected: zero errors across all modified files.

- [ ] **Step 4: Smoke test in the browser**

Start the dev server if not running:
```bash
npm run dev
```

Verify these scenarios manually:

1. Navigate to `/super-admin/stores/<id>` for a store where all items are already assigned — banner should NOT appear.
2. Navigate to `/super-admin/items`, add a new item — then return to the store page — banner SHOULD appear with the new item listed.
3. Click "Assign to storage →" — modal opens with all items pre-checked.
4. Select a storage space, uncheck one item, click Confirm — toast "Items assigned successfully" fires; modal closes; banner disappears.
5. Refresh the page, add no new items — banner stays gone.
6. Repeat step 2 but click X — banner disappears for the session; refreshing the page brings it back (since dismiss is `useState` only).
