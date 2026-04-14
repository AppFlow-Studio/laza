# Incoming Item Assignment Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When an admin confirms receipt of an order, they assign each item to a specific storage space (Dry / Fridge / Freezer) via a tab-then-click UI before submitting.

**Architecture:** Update `ReceivedItem` to carry `storageSpaceId`, update `confirmTicket` to write `storage_space_id` into `item_locations` and `inventory_logs`, and replace the `ConfirmReceiptModal` body with a two-section layout: storage space tab strip + item list with assignment badges.

**Tech Stack:** Next.js App Router, React, TanStack React Query, Supabase (PostgreSQL), Tailwind CSS, TypeScript (strict)

---

## File Map

| File | Change |
|---|---|
| `lib/supabase/queries/orderTickets.ts` | Add `storageSpaceId` to `ReceivedItem`; update `confirmTicket` to include `storage_space_id` in `item_locations` upsert and `inventory_logs` insert |
| `app/(dashboard)/admin/orders/[id]/page.tsx` | Rewrite `ConfirmReceiptModal` with storage space tab strip, item assignment state, and updated `handleConfirm` |

---

## Task 1: Update `ReceivedItem` type and `confirmTicket` backend logic

**Files:**
- Modify: `lib/supabase/queries/orderTickets.ts:55-59` (ReceivedItem interface)
- Modify: `lib/supabase/queries/orderTickets.ts:549-599` (item_locations upsert + inventory_logs insert inside the for-loop)

- [ ] **Step 1: Update `ReceivedItem` to include `storageSpaceId`**

In `lib/supabase/queries/orderTickets.ts`, change:

```ts
export interface ReceivedItem {
    itemId: number;
    /** The count the employee physically counted — may differ from fulfilled_boxes */
    actualBoxesReceived: number;
    storageSpaceId: string;  // ← add this
}
```

- [ ] **Step 2: Update the `item_locations` upsert inside `confirmTicket` to use `storage_space_id`**

Find the block inside `confirmTicket` that reads `// Update store item_locations with ACTUAL pieces received` (around line 549). Replace the `select`, `update`, and `insert` calls so they all scope by `storage_space_id`:

```ts
// Update store item_locations with ACTUAL pieces received
const { data: itemLoc, error: locError } = await supabase
    .from("item_locations")
    .select("id, current_quantity")
    .eq("item_id", received.itemId)
    .eq("location_id", storeLocationId)
    .eq("storage_space_id", received.storageSpaceId)
    .maybeSingle();

if (locError) throw locError;

const previousQty = itemLoc?.current_quantity ?? 0;
const newQty = previousQty + totalPiecesToAdd;

if (itemLoc) {
    const { error } = await supabase
        .from("item_locations")
        .update({
            current_quantity: newQty,
            last_updated: new Date().toISOString(),
        })
        .eq("id", itemLoc.id);
    if (error) throw error;
} else {
    const { error } = await supabase.from("item_locations").insert({
        item_id: received.itemId,
        location_id: storeLocationId,
        storage_space_id: received.storageSpaceId,
        organization_id: storeOrgId,
        current_quantity: totalPiecesToAdd,
    });
    if (error) throw error;
}
```

- [ ] **Step 3: Update `inventory_logs` insert to include `storage_space_id`**

In the same loop, find `// Inventory log` block and add `storage_space_id`:

```ts
const { error: logError } = await supabase
    .from("inventory_logs")
    .insert({
        item_id: received.itemId,
        location_id: storeLocationId,
        storage_space_id: received.storageSpaceId,
        organization_id: storeOrgId,
        user_id: userId,
        previous_quantity: previousQty,
        new_quantity: newQty,
        quantity_change: totalPiecesToAdd,
        action_type: "received",
        notes: `Order ticket #${ticketId}${
            actualBoxes !== expectedBoxes
                ? ` (discrepancy: expected ${expectedBoxes} boxes, received ${actualBoxes} boxes)`
                : ""
        }`,
    });
if (logError) throw logError;
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
npx tsc --noEmit 2>&1 | grep orderTickets
```

Expected: no errors for `orderTickets.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/supabase/queries/orderTickets.ts
git commit -m "feat: add storageSpaceId to ReceivedItem and confirmTicket logic"
```

---

## Task 2: Rewrite `ConfirmReceiptModal` with storage space assignment UI

**Files:**
- Modify: `app/(dashboard)/admin/orders/[id]/page.tsx` — `ConfirmReceiptModal` function (lines ~615–769)

### What the new modal does

1. Fetches storage spaces for the ticket's `requesting_location_id` via `useLocationWithDetails`.
2. Shows a horizontal row of pill tabs — one per storage space. The active tab is highlighted indigo. Each pill shows a temperature icon + space name.
3. Below: the item list (same quantity input as before). Each item row is clickable (excluding the quantity input). Clicking it assigns the item to the active storage space. A colored badge appears showing which space it's assigned to.
4. The Confirm button is disabled if any item has no storage space assigned, with a note beneath it.
5. On submit, `receivedItems` includes `storageSpaceId` per item.

- [ ] **Step 1: Add `useLocationWithDetails` import at the top of the file**

The file already imports from `@/lib/hooks/queries/useOrderTickets`. Add the location hook import:

```ts
import { useLocationWithDetails } from "@/lib/hooks/queries/useLocations";
```

Also add `Snowflake, Thermometer, Wind` to the lucide-react import (for temperature icons in tabs) if not already present. The file already imports from `lucide-react` — add to the existing import:

```ts
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Loader2,
    Truck,
    Send,
    FileEdit,
    Clock,
    Package,
    MapPin,
    ChevronRight,
    AlertTriangle,
    RotateCcw,
    X,
    Pencil,
    Check,
    Snowflake,
    Thermometer,
    Wind,
} from "lucide-react";
```

- [ ] **Step 2: Replace the entire `ConfirmReceiptModal` function**

Replace everything from `function ConfirmReceiptModal(` through its closing `}` with:

```tsx
function ConfirmReceiptModal({
    ticket,
    onClose,
}: {
    ticket: Ticket;
    onClose: () => void;
}) {
    const { mutate: confirmTicket, isPending } = useConfirmTicket();
    const { data: location } = useLocationWithDetails(ticket.requesting_location_id);
    const storageSpaces = location?.storage_spaces ?? [];

    // quantities: ticketItemId → actual boxes received
    const [quantities, setQuantities] = useState<Record<string, number>>(
        Object.fromEntries(
            ticket.order_ticket_items.map((item) => [
                item.id,
                item.fulfilled_boxes ?? item.quantity_boxes,
            ]),
        ),
    );

    // which storage space tab is active
    const [activeSpaceId, setActiveSpaceId] = useState<string | null>(
        storageSpaces[0]?.id ?? null,
    );

    // item_id (number) → storageSpaceId (string)
    const [itemAssignments, setItemAssignments] = useState<Record<number, string>>({});

    // When storage spaces load, auto-select first if none selected
    useEffect(() => {
        if (storageSpaces.length > 0 && !activeSpaceId) {
            setActiveSpaceId(storageSpaces[0].id);
        }
    }, [storageSpaces, activeSpaceId]);

    const allAssigned =
        storageSpaces.length === 0 ||
        ticket.order_ticket_items.every((item) => itemAssignments[item.item_id]);

    const handleItemClick = (itemId: number) => {
        if (!activeSpaceId) return;
        setItemAssignments((prev) => {
            // clicking same space again unassigns
            if (prev[itemId] === activeSpaceId) {
                const next = { ...prev };
                delete next[itemId];
                return next;
            }
            return { ...prev, [itemId]: activeSpaceId };
        });
    };

    const handleConfirm = () => {
        const receivedItems = ticket.order_ticket_items.map((item) => ({
            itemId: item.item_id,
            actualBoxesReceived: quantities[item.id] ?? 0,
            storageSpaceId: itemAssignments[item.item_id] ?? "",
        }));
        confirmTicket(
            { ticketId: ticket.id, receivedItems },
            {
                onSuccess: () => {
                    toast.success("Order confirmed — inventory updated!");
                    onClose();
                },
                onError: (err: any) => {
                    toast.error(err?.message ?? "Failed to confirm order");
                },
            },
        );
    };

    // Helper: get space meta for a spaceId
    const getSpace = (spaceId: string) =>
        storageSpaces.find((s) => s.id === spaceId);

    // Temperature type → colors
    const tempColors: Record<string, { bg: string; text: string; icon: React.ReactNode }> = {
        frozen: {
            bg: "bg-blue-50",
            text: "text-blue-700",
            icon: <Snowflake size={11} />,
        },
        refrigerated: {
            bg: "bg-sky-50",
            text: "text-sky-700",
            icon: <Thermometer size={11} />,
        },
        dry: {
            bg: "bg-amber-50",
            text: "text-amber-700",
            icon: <Wind size={11} />,
        },
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden">
                {/* Header */}
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-sm font-bold text-gray-900">
                            Confirm Receipt
                        </h2>
                        <p className="text-[11px] text-gray-400 mt-0.5">
                            Assign each item to a storage space, then confirm quantities.
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="w-7 h-7 flex items-center justify-center rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
                    >
                        <X size={14} />
                    </button>
                </div>

                {/* Storage space tabs — only shown when spaces exist */}
                {storageSpaces.length > 0 && (
                    <div className="px-5 pt-3 pb-1">
                        <p className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 mb-2">
                            Storage Space
                        </p>
                        <div className="flex flex-wrap gap-2">
                            {storageSpaces.map((space) => {
                                const isActive = space.id === activeSpaceId;
                                const colors = tempColors[space.temperature_type ?? "dry"];
                                return (
                                    <button
                                        key={space.id}
                                        onClick={() => setActiveSpaceId(space.id)}
                                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
                                            isActive
                                                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                                                : `${colors.bg} ${colors.text} border-transparent hover:border-current`
                                        }`}
                                    >
                                        <span className={isActive ? "text-white" : ""}>
                                            {isActive
                                                ? <span className="opacity-80">{colors.icon}</span>
                                                : colors.icon}
                                        </span>
                                        {space.name}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                )}

                {/* Items */}
                <div className="px-5 py-3 max-h-64 overflow-y-auto divide-y divide-gray-50">
                    {ticket.order_ticket_items.map((item) => {
                        const name =
                            item.items?.short_label ??
                            item.items?.name ??
                            `Item ${item.item_id}`;
                        const fulfilled =
                            item.fulfilled_boxes ?? item.quantity_boxes;
                        const actual = quantities[item.id] ?? fulfilled;
                        const hasDiscrepancy = actual !== fulfilled;
                        const assignedSpaceId = itemAssignments[item.item_id];
                        const assignedSpace = assignedSpaceId ? getSpace(assignedSpaceId) : null;
                        const assignedColors = assignedSpace
                            ? tempColors[assignedSpace.temperature_type ?? "dry"]
                            : null;

                        return (
                            <div
                                key={item.id}
                                onClick={() => handleItemClick(item.item_id)}
                                className={`py-3 flex items-center gap-3 rounded-lg cursor-pointer transition-all select-none ${
                                    assignedSpaceId
                                        ? "opacity-100"
                                        : "opacity-80 hover:opacity-100"
                                }`}
                            >
                                {/* Assignment indicator dot */}
                                <div
                                    className={`w-2 h-2 rounded-full flex-shrink-0 transition-all ${
                                        assignedSpaceId
                                            ? "bg-indigo-500"
                                            : "bg-gray-200"
                                    }`}
                                />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2">
                                        <div className="text-xs font-semibold text-gray-800 truncate">
                                            {name}
                                        </div>
                                        {/* Storage space badge */}
                                        {assignedSpace && assignedColors ? (
                                            <span
                                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${assignedColors.bg} ${assignedColors.text}`}
                                            >
                                                {assignedColors.icon}
                                                {assignedSpace.name}
                                            </span>
                                        ) : (
                                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-gray-100 text-gray-400">
                                                Unassigned
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-[11px] text-gray-400 mt-0.5">
                                        Fulfilled:{" "}
                                        <span className="font-medium text-gray-600">
                                            {fulfilled} boxes
                                        </span>
                                    </div>
                                </div>

                                <div
                                    className="flex flex-col items-end gap-1"
                                    onClick={(e) => e.stopPropagation()}
                                >
                                    <div className="flex items-center gap-1.5">
                                        <span className="text-[11px] text-gray-400">
                                            Received:
                                        </span>
                                        <input
                                            type="number"
                                            min={0}
                                            max={999}
                                            value={actual}
                                            onChange={(e) =>
                                                setQuantities((prev) => ({
                                                    ...prev,
                                                    [item.id]: Math.max(
                                                        0,
                                                        Number(e.target.value),
                                                    ),
                                                }))
                                            }
                                            onKeyDown={(e) =>
                                                [".", "e", "E", "-", "+"].includes(e.key) &&
                                                e.preventDefault()
                                            }
                                            className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-xs font-semibold text-center focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all"
                                        />
                                    </div>
                                    {hasDiscrepancy && (
                                        <span className="text-[10px] text-amber-600 font-medium">
                                            ⚠ Discrepancy
                                        </span>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Footer */}
                <div className="px-5 py-4 border-t border-gray-100">
                    {!allAssigned && (
                        <p className="text-[11px] text-amber-600 font-medium mb-2 flex items-center gap-1">
                            <AlertTriangle size={11} />
                            Select a storage space tab and tap each item to assign it.
                        </p>
                    )}
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={onClose}
                            disabled={isPending}
                            className="px-4 py-2 text-xs font-semibold text-gray-500 border border-gray-200 rounded-lg hover:bg-gray-50 transition-all disabled:opacity-50"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleConfirm}
                            disabled={isPending || !allAssigned}
                            title={!allAssigned ? "Assign all items to a storage space first" : undefined}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-[0_2px_8px_rgba(22,163,74,.25)]"
                        >
                            {isPending ? (
                                <Loader2 size={12} className="animate-spin" />
                            ) : (
                                <CheckCircle2 size={12} />
                            )}
                            Confirm Receipt
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
```

- [ ] **Step 3: Add missing `useEffect` import**

The file already imports `useState`, `useRef`, `useEffect` at the top — verify `useEffect` is in the import:

```ts
import { useState, useRef, useEffect } from "react";
```

If `useEffect` is missing, add it.

- [ ] **Step 4: Verify TypeScript compiles with no errors**

```bash
npx tsc --noEmit 2>&1 | grep "orders/\[id\]"
```

Expected: no output (no errors).

- [ ] **Step 5: Commit**

```bash
git add app/\(dashboard\)/admin/orders/\[id\]/page.tsx
git commit -m "feat: add storage space assignment to ConfirmReceiptModal"
```

---

## Task 3: Manual smoke test

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Navigate to an order in `delivered` status and open Confirm Receipt**

Expected: modal opens with storage space pill tabs at the top (one per space for the location), item list below each showing "Unassigned" badge.

- [ ] **Step 3: Confirm button should be disabled**

Expected: button is greyed out with `cursor-not-allowed`. Tooltip says "Assign all items to a storage space first". Warning note visible above footer buttons.

- [ ] **Step 4: Select a storage space tab, click items**

Expected: clicked items update their badge to show the space name with the correct temperature color (blue/sky/amber). The indicator dot turns indigo.

- [ ] **Step 5: Assign all items, confirm**

Expected: confirm button becomes enabled. Clicking it submits. Toast "Order confirmed — inventory updated!" appears. Modal closes. Navigating to that storage space's detail page shows the newly received items with correct quantities.

- [ ] **Step 6: Verify no storage space selector appears for locations with no spaces**

Go to an order whose `requesting_location` has zero storage spaces. Open Confirm Receipt.
Expected: no tab strip, confirm button is enabled immediately (falls back to old behavior).
