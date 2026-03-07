-- ============================================================
-- Migration: 006_cost_columns.sql
-- Task 1.31 — Add cost columns to existing tables
-- Depends on: 1.2 (box_quantity on items), 1.5 (order_ticket_items),
--             005_warehouse_cost_tracking.sql (purchase_orders exist)
-- ============================================================

-- ── items table ──────────────────────────────────────────────

ALTER TABLE items
  ADD COLUMN current_unit_cost NUMERIC(10,4) NULL;

ALTER TABLE items
  ADD COLUMN cbm_per_carton NUMERIC(10,4) NULL;

-- ── order_ticket_items table ──────────────────────────────────

ALTER TABLE order_ticket_items
  ADD COLUMN unit_cost_at_time NUMERIC(10,4) NULL;

ALTER TABLE order_ticket_items
  ADD COLUMN line_total NUMERIC(12,2) NULL;

-- ── CHECK constraints ─────────────────────────────────────────

ALTER TABLE items
  ADD CONSTRAINT items_current_unit_cost_positive
  CHECK (current_unit_cost IS NULL OR current_unit_cost > 0);

ALTER TABLE items
  ADD CONSTRAINT items_cbm_per_carton_positive
  CHECK (cbm_per_carton IS NULL OR cbm_per_carton > 0);

ALTER TABLE order_ticket_items
  ADD CONSTRAINT order_ticket_items_unit_cost_positive
  CHECK (unit_cost_at_time IS NULL OR unit_cost_at_time > 0);

ALTER TABLE order_ticket_items
  ADD CONSTRAINT order_ticket_items_line_total_nonneg
  CHECK (line_total IS NULL OR line_total >= 0);

-- ── Comments ──────────────────────────────────────────────────

COMMENT ON COLUMN items.current_unit_cost IS
  'Latest landed cost from most recent received PO. '
  'NULL until first PO is received. '
  'Updated by receive_purchase_order() RPC (task 1.33). '
  'Snapshotted to order_ticket_items.unit_cost_at_time on fulfillment.';

COMMENT ON COLUMN items.cbm_per_carton IS
  'Default cubic metres per carton for this item. '
  'Pre-fills purchase_order_items.cbm on new PO creation '
  'but can be overridden per order. NULL for items not '
  'ordered from China in cartons.';

COMMENT ON COLUMN order_ticket_items.unit_cost_at_time IS
  'Snapshot of items.current_unit_cost at moment of fulfillment. '
  'Set by fulfill_order_ticket() RPC (task 3.7 update). '
  'NULL until ticket is fulfilled. Locks the price permanently '
  'so later PO arrivals do not change invoice values.';

COMMENT ON COLUMN order_ticket_items.line_total IS
  'fulfilled_units × unit_cost_at_time. '
  'Calculated and stored at fulfillment time — not computed on read. '
  'NULL until ticket is fulfilled. Used for internal store invoicing.';

-- ── Seed cbm_per_carton ───────────────────────────────────────
-- ⚠ BLOCKED: client must provide exact item names and CBM values
-- from the Carton Calculator Excel before this block can run.
-- Run ALTER TABLE statements above independently if needed.
-- Add seed UPDATEs here once client confirms the data.