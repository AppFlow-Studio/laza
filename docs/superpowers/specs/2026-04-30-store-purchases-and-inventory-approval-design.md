# Store Direct Purchases & Inventory Update Approval — Design Spec

**Date:** 2026-04-30  
**Status:** Approved

---

## Overview

Two related features for managing store-level inventory that doesn't come from the warehouse:

1. **Store Direct Purchases** — Admins record cash/direct purchases of products and raw materials (items bought locally, not ordered from the warehouse). Recording a purchase immediately updates the store's inventory.

2. **Inventory Update Approval** — Employee quantity updates (count, adjustment, used) no longer apply immediately. They create a pending request that an admin must approve before inventory is changed.

---

## Feature 1: Store Direct Purchases

### Context

The existing `purchase_orders` table is for warehouse-level bulk orders from suppliers (with pallets, CBM, shipping fees, etc.). Store cash purchases are a different concept and are stored separately to avoid schema pollution.

### Data Model

**`store_purchases`**

| column | type | notes |
|---|---|---|
| `id` | uuid | PK |
| `org_id` | text | Clerk org ID |
| `location_id` | uuid | FK → locations (which store bought this) |
| `purchased_by` | text | Clerk user ID |
| `purchased_at` | timestamptz | when the purchase happened (admin-entered) |
| `supplier_name` | text | optional |
| `notes` | text | optional |
| `total_cost` | numeric | sum of all line totals (stored for fast reads) |
| `created_at` | timestamptz | |

**`store_purchase_items`**

| column | type | notes |
|---|---|---|
| `id` | uuid | PK |
| `purchase_id` | uuid | FK → store_purchases |
| `item_id` | uuid | FK → items (only catalog items) |
| `quantity` | numeric | units purchased |
| `unit_cost` | numeric | cost per unit at time of purchase |
| `line_total` | numeric | quantity × unit_cost |

### Backend Logic

`createStorePurchase()` server action (single RPC/transaction):
1. Insert `store_purchases` row
2. Insert all `store_purchase_items` rows
3. For each item: increment `item_locations.current_quantity += quantity` (upsert if row doesn't exist), insert `inventory_logs` with `action_type = 'received'` and a note referencing the purchase ID

All steps run in a single transaction — inventory never partially updates.

React Query invalidates `['store-purchases', locationId]` and `['inventory', locationId]` on success.

### Pages

**`/admin/purchases`** — List page (mirrors `/admin/orders` layout):
- Stats bar: purchases this month, total spent, purchase count
- Filters: location (respects `adminStore` selected location), date range, supplier name
- Table/card rows: date, supplier, items count, total cost, recorded by
- "New Purchase" button

**`/admin/purchases/new`** — Single-page after-the-fact form:
- Date picker (defaults to today)
- Optional supplier name field
- Optional notes field
- Line items section: item picker (from catalog), quantity input, unit cost input, auto-calculated line total
- Running total displayed at the bottom
- "Save Purchase" submits → creates record + updates inventory immediately

**`/admin/purchases/[id]`** — Read-only detail view:
- Header: date, supplier, recorded by, total cost
- Line items table: item name, quantity, unit cost, line total
- Links to inventory log entries created by this purchase

---

## Feature 2: Inventory Update Approval

### Context

Currently `updateQuantity()` applies changes immediately (with daily limits for employees). This feature changes employee-initiated updates to require explicit admin approval before touching inventory. The `is_warehouse_item` flag and admin direct updates are unaffected — only employee-initiated changes go through the approval queue.

### Data Model

**`inventory_update_requests`**

| column | type | notes |
|---|---|---|
| `id` | uuid | PK |
| `org_id` | text | Clerk org ID |
| `location_id` | uuid | FK → locations |
| `storage_space_id` | uuid | nullable, FK → storage_spaces |
| `item_id` | uuid | FK → items |
| `requested_by` | text | Clerk user ID (employee) |
| `action_type` | text | `count` / `adjustment` / `used` |
| `new_quantity` | numeric | absolute quantity the employee wants to set (not a delta) |
| `previous_quantity` | numeric | snapshot of current quantity at time of request |
| `notes` | text | optional employee note |
| `status` | text | `pending` / `approved` / `rejected` |
| `reviewed_by` | text | Clerk user ID (admin), nullable |
| `reviewed_at` | timestamptz | nullable |
| `review_note` | text | optional admin rejection/approval note |
| `created_at` | timestamptz | |

### Backend Logic

**Employee submits request** — `createInventoryUpdateRequest()`:
1. Snapshot `previous_quantity` from current `item_locations`
2. Insert `inventory_update_requests` with `status = 'pending'`
3. Does **not** touch `item_locations`

**Duplicate request rule:** If a pending request already exists for the same `item_id` + `storage_space_id` + `location_id`, the new submission replaces it (updates in place) rather than creating a second row.

**Admin approves** — `approveInventoryUpdateRequest(requestId)`:
1. Update request: `status = 'approved'`, set `reviewed_by`, `reviewed_at`
2. Upsert `item_locations.current_quantity` to `new_quantity`
3. Insert `inventory_logs` row (action_type from request, notes reference request ID)

**Admin rejects** — `rejectInventoryUpdateRequest(requestId, note?)`:
1. Update request: `status = 'rejected'`, store optional note
2. No inventory change

React Query invalidates requests list and inventory queries on approve/reject.

### UI Changes

**Employee side:**
- Existing quantity update UI calls `createInventoryUpdateRequest()` instead of `updateQuantity()` directly
- Item shows a "Pending approval" badge while a pending request exists for it
- Badge clears when admin approves or rejects

**Admin side — "Pending Requests" on `/admin/inventory`:**
- New tab or badge-gated section showing count of pending requests
- Table: employee name, item, storage space, old qty → new qty, action type, submitted at
- Inline Approve / Reject buttons (reject opens a small note input)
- History tab shows approved and rejected requests

---

## Out of Scope

- Push/email notifications for pending requests (manual dashboard check only)
- Admin-initiated quantity updates going through the approval flow (admins update directly)
- Supplier/vendor management (only a free-text optional name field)
- Purchase editing or deletion after save
