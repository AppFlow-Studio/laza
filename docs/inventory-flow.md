# Inventory Flow

This document covers the core inventory lifecycle: quantity updates, rate limiting, low stock alerts, notifications, and audit logging.

## Quantity Update Flow

### Employee Update (via Storage Space Detail)

```
Employee taps item in storage space
        |
        v
QuantityUpdateSheet opens
        |
        v
Check update limit (useCheckUpdateAllowed)
        |--- Not allowed --> Show limit message, block save
        |--- Allowed -----> Continue
        v
Employee sets quantity, reason, action type
        |
        v
useUpdateQuantity() mutation fires
        |
        v
updateQuantity() in lib/supabase/queries/inventory.ts:
  1. Check update limit (RPC: get_update_count_in_window)
  2. Upsert item_locations (set current_quantity)
  3. Insert inventory_logs entry
  4. If admin override: insert update_override_logs
        |
        v
DB trigger: check_low_stock()
  - Compares current_quantity vs min_quantity (or min_quantity_override)
  - If below threshold: create alert in alerts table
  - If above threshold: resolve existing alert (set resolved_at)
        |
        v
React Query cache invalidation:
  - inventory, inventoryLogs, alerts query keys
```

### Admin Update (via Inventory Matrix or Storage Space)

Admins follow the same flow but:
- Are never rate-limited (`checkUpdateAllowed` always returns true for admins)
- Can override employee limits when updating on their behalf
- Override is logged in `update_override_logs` with reason

### Bulk Operations

- **Bulk Assign Items**: `bulkAssignItemsToStorage()` — upserts multiple items into a storage space and creates inventory logs for each
- **Bulk Update Inventory**: `bulkUpdateInventory()` — updates quantities for multiple items with limit checking per item
- **Bulk Remove Items**: `bulkRemoveItemsFromStorage()` — deletes `item_locations` records for selected items

## Update Limits (Rate Limiting)

Admins can configure rate limits to prevent excessive inventory updates.

### Configuration

| Field | Description |
|-------|-------------|
| `max_updates_per_window` | Max allowed updates (default: 2) |
| `time_window_start` | Start of allowed window (default: `00:00:00`) |
| `time_window_end` | End of allowed window (default: `23:59:59`) |
| `location_id` | Applies to this location |
| `storage_space_id` | Optional: applies to specific storage space (NULL = location-wide) |

### How Limits Work

1. Before each update, `checkUpdateAllowed()` is called
2. It uses the RPC function `get_update_count_in_window()` to count the user's updates for that specific item within the current time window
3. If count >= `max_updates_per_window`, the update is blocked
4. Storage-space-specific limits take precedence over location-wide defaults
5. Admins are always exempt from limits
6. The `is_within_time_window()` function handles cross-midnight windows

### Admin Override

When an admin overrides a limit for an employee:
1. The update proceeds normally
2. An `update_override_logs` entry is created recording:
   - Which admin overrode
   - Which employee was affected
   - The inventory log entry
   - Optional override reason

## Alert Flow

### Low Stock Detection

Handled automatically by the `check_low_stock()` database trigger on `item_locations`:

1. On every insert/update to `current_quantity` or `min_quantity_override`:
2. Determine effective minimum: `min_quantity_override` if set, otherwise item's `min_quantity`
3. If `current_quantity < effective_min`:
   - Check for existing unresolved alert for this item/location/storage_space
   - If none exists, create a new alert with `alert_type = 'low_stock'`
4. If `current_quantity >= effective_min`:
   - Resolve any existing unresolved alert by setting `resolved_at = NOW()`

### Urgency Levels

Urgency is calculated by `calculateUrgencyLevel()` in `lib/services/emailNotifications.ts`:

| Level | Condition |
|-------|-----------|
| `out_of_stock` | `current_quantity = 0` |
| `critical` | `current_quantity` is very low relative to threshold |
| `low` | `current_quantity` is below threshold but not critical |

## Notification Flow

When a low stock alert is triggered:

```
Alert created (DB trigger)
        |
        v
Check notification_preferences
  - notifications_enabled?
  - low_stock_alerts_enabled?
  - delivery_mode: 'immediate' | 'digest' | 'both'
        |
        v
  immediate -----> sendLowStockAlert() --> Resend API --> email
  digest --------> queueLowStockAlert() --> low_stock_notification_queue
  both ----------> both paths
        |
        v
Log delivery in email_delivery_logs
```

See [Notifications](./notifications.md) for full details on the email system.

## Audit Trail

Every inventory change creates an `inventory_logs` entry:

| Field | What it records |
|-------|-----------------|
| `item_id` | Which item changed |
| `location_id` | At which location |
| `storage_space_id` | In which storage space (optional) |
| `user_id` | Who made the change |
| `previous_quantity` | Quantity before |
| `new_quantity` | Quantity after |
| `quantity_change` | Delta |
| `action_type` | `count`, `adjustment`, `received`, or `used` |
| `notes` | Optional user-provided notes |
| `created_at` | When the change occurred |

### Action Types

| Type | Meaning |
|------|---------|
| `count` | Physical count / recount |
| `adjustment` | Manual correction |
| `received` | New stock received |
| `used` | Stock consumed / used |

Logs are queryable by:
- Location (`getInventoryLogs` with `locationId` filter)
- Storage space (`getInventoryLogsByStorageSpace`)
- Item (`getInventoryLogs` with `itemId` filter)
- Employee activity (`getEmployeeInventoryLogs`)
- Date range (via Activity page filters: Today, This Week, This Month, All Time)

## Cache Invalidation

After any inventory mutation, React Query invalidates these keys:
- `inventory` — Refreshes inventory lists
- `inventoryLogs` — Refreshes audit trail
- `alerts` — Refreshes low stock alerts
- `employee-stats` — Refreshes employee activity stats (employee hooks)
- `storage-space-items` — Refreshes items in storage space (employee hooks)
