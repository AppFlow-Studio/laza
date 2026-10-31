# Warehouse Low Stock Alert on Order Fulfillment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** After a warehouse order ticket is fulfilled, check each fulfilled item's warehouse quantity against `low_stock_thresholds` and fire the `send-low-stock-alert` edge function for any item that is below threshold and has no existing unresolved alert.

**Architecture:** A new `"use server"` action (`checkWarehouseLowStockAfterFulfillment`) encapsulates all DB queries and the edge function call. It is called fire-and-forget from `useFulfillTicket.onSuccess` in the client hook, matching the same pattern used by `sendOrderNotification`. Errors are logged but never propagate to the client — fulfillment is already complete.

**Tech Stack:** Next.js App Router server actions, Supabase JS (`createServiceRoleClient`), `supabase.functions.invoke()`, TypeScript strict mode.

---

## File Map

| Action | Path |
|--------|------|
| Create | `lib/supabase/actions/warehouseLowStockActions.ts` |
| Modify | `lib/hooks/queries/useOrderTickets.ts` |

---

## Task 1: Create `warehouseLowStockActions.ts`

**Files:**
- Create: `lib/supabase/actions/warehouseLowStockActions.ts`

- [ ] **Step 1: Create the file with full implementation**

Create `lib/supabase/actions/warehouseLowStockActions.ts` with this exact content:

```typescript
/**
 * lib/supabase/actions/warehouseLowStockActions.ts
 *
 * Server action: after a warehouse order ticket is fulfilled, check each
 * fulfilled item's current warehouse quantity against low_stock_thresholds
 * and fire send-low-stock-alert for items that are below threshold and have
 * no existing unresolved alert.
 */
"use server";

import { createServiceRoleClient } from "@/lib/supabase/server";

type UrgencyLevel = "low" | "critical" | "out_of_stock";

export async function checkWarehouseLowStockAfterFulfillment(
    ticketId: string,
    fulfilledItemIds: number[],
): Promise<void> {
    if (!fulfilledItemIds.length) return;

    const supabase = createServiceRoleClient();

    // ── 1. Fetch ticket for warehouse + org context ──────────────────────────
    const { data: ticket, error: ticketError } = await supabase
        .from("order_tickets")
        .select("warehouse_location_id, organization_id")
        .eq("id", ticketId)
        .single();

    if (ticketError || !ticket) {
        console.error("[warehouseLowStock] Failed to fetch ticket:", ticketError);
        return;
    }

    const warehouseLocationId = ticket.warehouse_location_id;
    const organizationId = ticket.organization_id;

    // ── 2. Current warehouse quantities for fulfilled items ──────────────────
    const { data: itemLocations, error: itemLocError } = await supabase
        .from("item_locations")
        .select("item_id, current_quantity")
        .eq("location_id", warehouseLocationId)
        .in("item_id", fulfilledItemIds);

    if (itemLocError) {
        console.error("[warehouseLowStock] Failed to fetch item_locations:", itemLocError);
        return;
    }

    if (!itemLocations?.length) return;

    // ── 3. Thresholds — location-specific and org-wide in one query ──────────
    const { data: thresholds, error: thresholdError } = await supabase
        .from("low_stock_thresholds")
        .select("item_id, location_id, low_threshold, critical_threshold")
        .eq("organization_id", organizationId)
        .eq("is_active", true)
        .in("item_id", fulfilledItemIds)
        .or(`location_id.eq.${warehouseLocationId},location_id.is.null`);

    if (thresholdError) {
        console.error("[warehouseLowStock] Failed to fetch thresholds:", thresholdError);
        return;
    }

    // ── 4. Build threshold map: item_id → best match ─────────────────────────
    // Location-specific row wins over org-wide (location_id IS NULL).
    const thresholdMap = new Map<
        number,
        { low_threshold: number; critical_threshold: number | null }
    >();

    for (const t of thresholds ?? []) {
        if (t.item_id === null) continue;
        const existing = thresholdMap.get(t.item_id);
        // Overwrite only if incoming row is location-specific, or if no entry yet
        if (!existing || t.location_id !== null) {
            thresholdMap.set(t.item_id, {
                low_threshold: t.low_threshold,
                critical_threshold: t.critical_threshold ?? null,
            });
        }
    }

    // ── 5. Evaluate each item ────────────────────────────────────────────────
    for (const loc of itemLocations) {
        const itemId = loc.item_id;
        const currentQty = loc.current_quantity;
        const threshold = thresholdMap.get(itemId);

        if (!threshold) continue; // no threshold configured — skip

        // Determine urgency
        let urgencyLevel: UrgencyLevel | null = null;

        if (currentQty <= 0) {
            urgencyLevel = "out_of_stock";
        } else if (
            threshold.critical_threshold !== null &&
            currentQty <= threshold.critical_threshold
        ) {
            urgencyLevel = "critical";
        } else if (currentQty < threshold.low_threshold) {
            urgencyLevel = "low";
        }

        if (!urgencyLevel) continue; // stock is healthy — skip

        // ── 6. Deduplication: skip if unresolved alert already exists ────────
        const { data: existingAlert, error: alertCheckError } = await supabase
            .from("alerts")
            .select("id")
            .eq("item_id", itemId)
            .eq("location_id", warehouseLocationId)
            .is("resolved_at", null)
            .maybeSingle();

        if (alertCheckError) {
            console.error(
                `[warehouseLowStock] Alert check failed for item ${itemId}:`,
                alertCheckError,
            );
            continue;
        }

        if (existingAlert) continue; // already alerting — skip

        // ── 7. Insert new alert row ──────────────────────────────────────────
        const { data: newAlert, error: insertError } = await supabase
            .from("alerts")
            .insert({
                item_id: itemId,
                location_id: warehouseLocationId,
                organization_id: organizationId,
                alert_type: "low_stock",
                triggered_at: new Date().toISOString(),
            })
            .select("id")
            .single();

        if (insertError || !newAlert) {
            console.error(
                `[warehouseLowStock] Failed to insert alert for item ${itemId}:`,
                insertError,
            );
            continue;
        }

        // ── 8. Invoke send-low-stock-alert edge function ─────────────────────
        const { error: fnError } = await supabase.functions.invoke(
            "send-low-stock-alert",
            {
                body: {
                    alert_id: String(newAlert.id),
                    organization_id: organizationId,
                    item_id: itemId,
                    location_id: warehouseLocationId,
                    storage_space_id: null,
                    urgency_level: urgencyLevel,
                    current_quantity: currentQty,
                    // Pre-fulfillment qty is not tracked at the app layer for this
                    // path; passing current as a stand-in (the edge function displays
                    // it as the "previous" value in the Change column).
                    previous_quantity: currentQty,
                    min_quantity: threshold.low_threshold,
                },
            },
        );

        if (fnError) {
            console.error(
                `[warehouseLowStock] Edge function failed for item ${itemId}:`,
                fnError,
            );
        }
    }
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors related to `warehouseLowStockActions.ts`. Fix any type errors before proceeding.

- [ ] **Step 3: Commit**

```bash
git add lib/supabase/actions/warehouseLowStockActions.ts
git commit -m "feat: add checkWarehouseLowStockAfterFulfillment server action"
```

---

## Task 2: Wire into `useFulfillTicket.onSuccess`

**Files:**
- Modify: `lib/hooks/queries/useOrderTickets.ts`

- [ ] **Step 1: Add the import**

Open `lib/hooks/queries/useOrderTickets.ts`. At the top of the file, alongside the existing imports, add:

```typescript
import { checkWarehouseLowStockAfterFulfillment } from "@/lib/supabase/actions/warehouseLowStockActions";
```

- [ ] **Step 2: Update `useFulfillTicket.onSuccess`**

Find the `onSuccess` block in `useFulfillTicket` (currently at line ~195). It looks like:

```typescript
onSuccess: (_data, variables) => {
    queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) });
    queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    queryClient.invalidateQueries({ queryKey: ["pallets"] });
    queryClient.invalidateQueries({ queryKey: ["warehouse", "inventory"] });
    queryClient.invalidateQueries({ queryKey: ["alerts"] });
},
```

Replace it with:

```typescript
onSuccess: (_data, variables) => {
    queryClient.invalidateQueries({ queryKey: ticketKeys.detail(variables.ticketId) });
    queryClient.invalidateQueries({ queryKey: ticketKeys.lists() });
    queryClient.invalidateQueries({ queryKey: ticketKeys.all });
    queryClient.invalidateQueries({ queryKey: ["pallets"] });
    queryClient.invalidateQueries({ queryKey: ["warehouse", "inventory"] });
    queryClient.invalidateQueries({ queryKey: ["alerts"] });

    // Fire-and-forget: check warehouse low stock for each fulfilled item.
    // Errors are logged inside the action and never surface to the user.
    const fulfilledItemIds = (_data as {
        items_fulfilled: Array<{ item_id: number }>;
    }).items_fulfilled.map((i) => i.item_id);

    checkWarehouseLowStockAfterFulfillment(variables.ticketId, fulfilledItemIds).catch(
        (err) => console.error("[warehouseLowStock] Unexpected error:", err),
    );
},
```

- [ ] **Step 3: Verify TypeScript compiles**

```bash
npx tsc --noEmit
```

Expected: no errors. Fix any type errors before proceeding.

- [ ] **Step 4: Commit**

```bash
git add lib/hooks/queries/useOrderTickets.ts
git commit -m "feat: trigger warehouse low stock check after order fulfillment"
```

---

## Task 3: Manual End-to-End Verification

- [ ] **Step 1: Set up a test threshold**

In Supabase Studio (or SQL editor), ensure a row exists in `low_stock_thresholds` for an item that is in a warehouse and has a `low_threshold` above the item's current `item_locations.current_quantity` after fulfillment. Example:

```sql
INSERT INTO low_stock_thresholds (organization_id, item_id, location_id, low_threshold, critical_threshold, is_active)
VALUES (
  '<your-org-id>',
  <item-id>,           -- item that will be in the fulfilled ticket
  '<warehouse-location-id>',
  9999,                -- threshold high enough to trigger on any fulfillment
  5000,
  true
);
```

- [ ] **Step 2: Ensure no existing unresolved alert for that item**

```sql
UPDATE alerts
SET resolved_at = NOW()
WHERE item_id = <item-id>
  AND location_id = '<warehouse-location-id>'
  AND resolved_at IS NULL;
```

- [ ] **Step 3: Start dev server**

```bash
npm run dev
```

- [ ] **Step 4: Fulfill a ticket containing that item**

Navigate to the Super Admin warehouse order management UI. Find or create a submitted ticket that includes the test item. Click Fulfill. Confirm the RPC completes successfully (ticket moves to fulfilled status).

- [ ] **Step 5: Verify alert row was created**

```sql
SELECT * FROM alerts
WHERE item_id = <item-id>
  AND location_id = '<warehouse-location-id>'
ORDER BY triggered_at DESC
LIMIT 1;
```

Expected: a new row with `alert_type = 'low_stock'` and `resolved_at IS NULL`.

- [ ] **Step 6: Verify email delivery log**

```sql
SELECT * FROM email_delivery_logs
WHERE metadata->>'item_id' = '<item-id>'
ORDER BY created_at DESC
LIMIT 1;
```

Expected: a row with `email_type = 'low_stock_alert'` and `status = 'sent'` (or `'pending'` if `RESEND_API_KEY` is not configured in local dev).

- [ ] **Step 7: Verify deduplication**

Fulfill another ticket containing the same item. Confirm only one alert row exists (no new row inserted):

```sql
SELECT COUNT(*) FROM alerts
WHERE item_id = <item-id>
  AND location_id = '<warehouse-location-id>'
  AND resolved_at IS NULL;
```

Expected: `count = 1` (same row, not a new one).

- [ ] **Step 8: Verify no-threshold skip**

Find an item in the fulfilled ticket that has no `low_stock_thresholds` row. Confirm no alert was created for it:

```sql
SELECT * FROM alerts
WHERE item_id = <no-threshold-item-id>
ORDER BY triggered_at DESC
LIMIT 1;
```

Expected: no row (or only old rows from before this change).

- [ ] **Step 9: Final lint check**

```bash
npm run lint
```

Expected: no new errors.
