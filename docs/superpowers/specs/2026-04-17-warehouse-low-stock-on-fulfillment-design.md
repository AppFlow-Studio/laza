# Warehouse Low Stock Alert on Order Fulfillment

**Date:** 2026-04-17  
**Status:** Approved

## Overview

After a warehouse order ticket is fulfilled, check the warehouse quantity of each fulfilled item against the `low_stock_thresholds` table. If any item is below its threshold and has no existing unresolved alert, create an `alerts` row and invoke the `send-low-stock-alert` edge function.

## Trigger Point

The check fires in `useFulfillTicket`'s `onSuccess` callback (client-side), after the `fulfill_order_ticket` Postgres RPC completes and the warehouse inventory has been updated. The callback calls a new server action — following the same pattern as `sendOrderNotification`.

## Files Changed

### New: `lib/supabase/actions/warehouseLowStockActions.ts`

Server action: `checkWarehouseLowStockAfterFulfillment(ticketId: string, fulfilledItemIds: number[])`

Steps:
1. Fetch ticket by `ticketId` (service role) to get `warehouse_location_id` and `organization_id`
2. Query `item_locations` for `current_quantity` where `item_id IN (fulfilledItemIds)` and `location_id = warehouse_location_id`
3. Query `low_stock_thresholds` for matching thresholds — location-specific (`location_id = warehouse_location_id`) first; fall back to org-wide (`location_id IS NULL`); skip items with no threshold row
4. For each item below threshold:
   - Query `alerts` for an existing unresolved row: `item_id = X AND location_id = warehouse_location_id AND resolved_at IS NULL` — skip if found
   - Insert a new row into `alerts` (`item_id`, `location_id`, `organization_id`, `triggered_at`, `alert_type = 'low_stock'`)
   - Call `send-low-stock-alert` edge function via `fetch` with the new `alert_id` + context payload

### Modified: `lib/hooks/queries/useOrderTickets.ts`

In `useFulfillTicket.onSuccess`, after existing query invalidations:

```ts
checkWarehouseLowStockAfterFulfillment(
  variables.ticketId,
  data.items_fulfilled.map(i => i.item_id),
)
```

Errors from the low stock check are logged but do not throw — fulfillment itself is already complete.

## Threshold Lookup Priority

1. `low_stock_thresholds` where `item_id = X AND location_id = warehouseLocationId AND is_active = true`
2. Fallback: `item_id = X AND location_id IS NULL AND is_active = true`
3. No matching row → skip item (no alert)

## Urgency Level

| Condition | Level |
|-----------|-------|
| `current_quantity <= 0` | `out_of_stock` |
| `current_quantity > 0` and `critical_threshold IS NOT NULL` and `current_quantity <= critical_threshold` | `critical` |
| `current_quantity > 0` and `current_quantity < low_threshold` | `low` |

## Deduplication

Before inserting an alert, check `alerts` for an existing row where:
- `item_id = X`
- `location_id = warehouseLocationId`
- `resolved_at IS NULL`

If found, skip — no duplicate email is sent.

## Edge Function Payload

```ts
{
  alert_id: string        // newly inserted alerts.id cast to string (alerts.id is integer)
  organization_id: string
  item_id: number
  location_id: string     // warehouse location id
  storage_space_id: null  // warehouse alerts are not storage-space scoped
  urgency_level: 'low' | 'critical' | 'out_of_stock'
  current_quantity: number
  previous_quantity: number  // current_quantity before this fulfillment (item_locations pre-deduction not tracked here — use current as approximation or omit)
  min_quantity: number    // low_threshold value from low_stock_thresholds
}
```

Note: `previous_quantity` is not tracked at the application layer for this flow. Pass `current_quantity` as a reasonable stand-in, or `0` — the edge function displays it as "N/A" when equal to current.

## Error Handling

- If the ticket fetch fails: log and return early (no alerts fired)
- If threshold lookup returns nothing for an item: skip silently
- If `alerts` insert or edge function call fails: log the error, continue to next item
- Errors never propagate back to the client — fulfillment is already done

## Out of Scope

- Checking items not in the fulfilled ticket
- Alerting on other inventory changes (manual adjustments, receiving)
- Auto-resolving open alerts when stock is replenished
