# Phase 5 — End-to-End Test Scenarios (Dev A)

This document describes the seven backend-heavy QA scenarios that exercise
every persisted state transition introduced in Phases 1–4. Each scenario lists
the seed data needed, the user actions to perform in order, and the assertions
that must hold (DB rows, audit log entries, email triggers, RLS visibility).

These scenarios are intended to be run manually against a staging Supabase
project with Resend API key configured and at least one warehouse + one store
location seeded.

---

## Conventions

- **Roles** — `super_admin` (warehouse-side), `admin` (store-side).
- **Test users** — at least one super admin (`sa@test.local`), one store admin
  (`store1@test.local`), and one secondary store admin (`store2@test.local`).
- **Locations** — one `warehouse` location, two `store` locations.
- **Items** — at least 5 items with `box_quantity` set, 3 with images, 2 with
  multiple `pieces_per_box` history records.
- **Pre-test reset** — between scenarios, truncate the order ticket queue and
  any pallets created during the test (or use a dedicated test org).

A scenario is **PASS** only when every assertion in its checklist holds. Any
failure must be filed against the relevant Phase 5 ticket.

---

## Scenario 1 — Happy-path company-delivery order

Covers Tasks 3.2 → 3.3 → 3.5 → 4.x (full lifecycle, "company" delivery).

**Setup**
- Warehouse stock for items A, B, C ≥ 200 units each.
- Store admin signed in to store 1.
- Super admin signed in (separate browser window).

**Steps**
1. Store admin: `/admin/orders/new` → add A (5 boxes), B (3 boxes), C (2 boxes).
2. Pick **delivery_type = "company"**, add a note, click **Submit**.
3. Super admin: `/super-admin/orders` → open the new ticket.
4. Click **Confirm fulfillment**, complete the confirm sheet, submit.
5. Super admin: ticket detail page → click **Mark in transit**.
6. Store admin: `/admin/orders/[id]` → click **Mark as delivered**.
7. Store admin: click **Confirm receipt**.

**Assertions**
- After step 2: row in `order_tickets` with `status = 'submitted'`,
  `delivery_type = 'company'`, ledger entry `status_history` row created.
- After step 4: `warehouse_stock` quantities decremented for A/B/C; ticket
  `status = 'fulfilled'`; `inventory_logs` rows created (one per item)
  with `change_type = 'fulfillment'`.
- After step 5: `status = 'in_transit'`.
- After step 6: `status = 'delivered'`.
- After step 7: `status = 'confirmed'`; payment hold (if implemented) released.
- Each transition has a corresponding `order_ticket_status_history` row with
  the right actor + timestamp.

---

## Scenario 2 — Self-pickup order skips in_transit

Covers Task 3.2 (delivery_type variant) and the self-pickup status flow.

**Setup**
- Warehouse stock for item D ≥ 50 units.

**Steps**
1. Store admin creates a ticket for item D (4 boxes), `delivery_type = "self"`.
2. Submit → super admin fulfills.
3. Store admin opens the ticket and clicks **Mark as delivered**.
4. Store admin clicks **Confirm receipt**.

**Assertions**
- After step 2: `status = 'fulfilled'`. The "Mark in transit" button is **not**
  rendered for self-pickup tickets.
- Status sequence in history: `draft? → submitted → processing → fulfilled →
  delivered → confirmed`. No `in_transit` row exists.
- `cost = 0` on the ticket (no per-pallet delivery fee for self pickup).

---

## Scenario 3 — Cancellation flow (Task 3.4)

**Setup**
- One submitted ticket created by store admin.

**Steps**
1. Store admin opens the ticket → clicks **Cancel order**.
2. Confirms in the alert dialog.
3. Verify the ticket disappears from the warehouse queue.
4. Attempt to cancel a ticket whose status is `processing` (super admin moved
   it forward). The button must be hidden.

**Assertions**
- Cancelled row: `status = 'cancelled'`, `cancelled_at` set, `cancelled_by`
  set to current user.
- `order_ticket_status_history` has a `cancelled` row.
- Any payment hold is released.
- Super admin's queue (`/super-admin/orders`) no longer includes the ticket.
- The Cancel button must be hidden for `processing`, `fulfilled`,
  `in_transit`, `delivered`, `confirmed`, `rejected`, `cancelled`. Verified
  by attempting to render `CancelOrderDialog` for each — returns `null`.

---

## Scenario 4 — Rejection flow (Task 3.6)

**Setup**
- One submitted ticket containing items the warehouse cannot fully service.

**Steps**
1. Super admin opens the ticket and clicks **Reject**.
2. Provide a reason ("out of stock"), submit.
3. Store admin opens `/admin/orders/[id]` and verifies the rejection banner.

**Assertions**
- Ticket `status = 'rejected'`, `rejection_reason` populated.
- Email sent to store admin with the rejection reason.
- `email_delivery_logs` row of type `'order_rejected'` exists with
  `status = 'sent'`.
- Store admin sees a "Rejected" status badge and the reason.

---

## Scenario 5 — Receiving wizard (Phase 2 — used by Phase 5 audit)

Covers `ReceivingWizard` end-to-end and pallet creation.

**Setup**
- One purchase order in `pending` status with 3 line items
  (qty_ordered: 100, 200, 50 boxes; pieces_per_box: 12, 6, 24).

**Steps**
1. Super admin: `/super-admin/warehouse/purchase-orders/[id]` → click **Receive shipment**.
2. **Phase A**: Set actual arrival = today, accept the line-item received
   quantities, click **Confirm Receipt**.
3. **Phase B**: Distribute boxes across 2 pallets (P1, P2) and submit.

**Assertions**
- After Phase A: `purchase_orders.status = 'received'`, `actual_arrival` set,
  `warehouse_stock.quantity` increased for each item by the received units
  (`received_boxes * pieces_per_box`).
- After Phase B: 2 rows in `pallets` with `pallet_label = 'P1'`, `'P2'`,
  `status = 'in_use'`. `pallet_items` populated with the box configs.
- Inventory log entry of `change_type = 'po_receipt'` for each item.
- If user closes the wizard between phases A and B, opening the PO again
  starts the wizard at step 2 with PhaseA data reconstructed.

---

## Scenario 6 — Pallet reorganization (Task 2.x → Phase 5 audit)

**Setup**
- Two pallets (`SOURCE`, `DEST`), source has 2 items with quantity > 0.

**Steps**
1. Super admin: `/super-admin/warehouse/pallets` → kebab on SOURCE → **Move Items**.
2. Reorganize panel opens with SOURCE preselected as source. Choose DEST as
   destination, move 5 boxes of item X.
3. Click **Confirm Move**.
4. Empty out SOURCE entirely, then return to the pallets table.
5. Use the kebab on the now-empty SOURCE pallet → **Retire Pallet**, confirm.

**Assertions**
- `pallet_items` rows updated: source quantities decremented, destination
  rows created or incremented. Totals match.
- Audit log entry per move (`pallet_movements` table) with from/to.
- After step 5: SOURCE pallet has `status = 'retired'`. The **Retire Pallet**
  menu item is hidden for any pallet whose status ≠ `empty`.

---

## Scenario 7 — Low stock & predictive reorder alerts (Tasks 5.1 & 5.2)

This is the most important Phase 5 scenario for Dev A — it validates the
notification system end-to-end.

### 7a — Warehouse low stock alert

**Setup**
- Warehouse has notification preferences row scoped to the warehouse location
  (or org-wide fallback). `low_stock_enabled = true`, alert email set to a
  reachable inbox.
- Item E warehouse stock = 50; threshold for item E = 100 (i.e., already
  below threshold).

**Steps**
1. Trigger the `send-low-stock-alert` edge function (manually or via scheduled
   cron) targeting the org.
2. Check the inbox.

**Assertions**
- Email arrives with subject prefixed `[Warehouse]`.
- Email body shows the **WAREHOUSE ALERT** badge in the header.
- Action buttons link to `/super-admin/...` routes (not `/admin/...`).
- Row in `email_delivery_logs` with `email_type = 'low_stock_alert'`,
  `metadata.is_warehouse = true`, `status = 'sent'`.

### 7b — Store low stock alert (regression check)

**Setup**
- Store 1 has 1 item below threshold.

**Steps**
1. Trigger `send-low-stock-alert`.

**Assertions**
- Email subject does **not** contain `[Warehouse]`.
- No warehouse badge in the header.
- Action buttons link to `/admin/...` routes.
- `email_delivery_logs` row has `metadata.is_warehouse = false` (or unset).

### 7c — Predictive reorder alert

**Setup**
- At least 2 items with non-zero burn rate so `get_reorder_alerts()` returns
  rows. Easiest seeding: backdate `inventory_logs` of `change_type = 'fulfillment'`
  to create a 4-week burn-rate history for items F and G.

**Steps**
1. Invoke `send-reorder-alert` edge function with `{ organization_id }`.

**Assertions**
- Email arrives with the "Reorder Alert" template, summary cards showing
  critical/warning/watch counts.
- Each item card shows: name, SKU, current stock, weekly burn, weeks remaining,
  urgency badge, recommendation.
- "View analytics" button links to `/super-admin/warehouse/analytics`.
- Row in `email_delivery_logs` with `email_type = 'reorder_alert'`,
  `status = 'sent'`. Metadata includes the lead-time/buffer days used.
- Re-running the function with no critical/warning/watch items returns a
  no-op (no email sent, no log row, function returns 200 with `skipped: true`).

---

## Pass criteria (Phase 5 sign-off)

All seven scenarios must pass on the staging environment with the production
Resend key swapped to a sandbox sender. Any failure blocks Phase 5 release.

After a successful run, paste the email message IDs and the relevant
`email_delivery_logs` row IDs into the Phase 5 Linear ticket as evidence.
