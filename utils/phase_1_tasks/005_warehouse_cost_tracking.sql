-- ============================================================
-- Migration: 005_warehouse_cost_tracking.sql
-- Task 1.26 — Create purchase_orders table
-- ============================================================
-- Tracks each overseas (China) purchase order.
-- Replaces the Carton Calculator sheet header data.
-- Shared fees (office_fee, shipping_fee) are stored here
-- and allocated down to line items via purchase_order_items.
-- ============================================================


-- ------------------------------------------------------------
-- TABLE: purchase_orders
-- ------------------------------------------------------------

CREATE TABLE purchase_orders (
  id                  UUID          NOT NULL DEFAULT gen_random_uuid(),
  organization_id     TEXT          NOT NULL,
  po_number           TEXT          NOT NULL,
  supplier_name       TEXT,                                    -- nullable per spec; UI defaults to 'China Supplier'
  status              TEXT          NOT NULL DEFAULT 'draft',

  -- Dates
  order_date          DATE,
  expected_arrival    DATE,
  actual_arrival      DATE,

  -- Cost summary (populated / updated by recalculate_po_costs RPC — task 1.32)
  subtotal_before     NUMERIC(12,2)   NOT NULL DEFAULT 0,  -- sum of all line item total_price_before
  office_fee          NUMERIC(12,2)   NOT NULL DEFAULT 0,  -- shared office fee to allocate
  shipping_fee        NUMERIC(12,2)   NOT NULL DEFAULT 0,  -- shared shipping fee to allocate
  total_cbm           NUMERIC(10,4),                       -- sum of all line item CBM; NULL until items added
  total_pallets       INTEGER,                              -- number of pallets in this shipment

  notes               TEXT,

  -- Audit
  created_by          TEXT          NOT NULL,  -- FK → users(id), SET NULL on user deletion
  created_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at          TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- Constraints
  CONSTRAINT purchase_orders_pkey
    PRIMARY KEY (id),

  CONSTRAINT purchase_orders_org_fk
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE,

  CONSTRAINT purchase_orders_created_by_fk
    FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON DELETE RESTRICT,   -- prevent deleting a user who owns POs; reassign first

  -- po_number must be unique within an organization
  CONSTRAINT purchase_orders_po_number_org_unique
    UNIQUE (organization_id, po_number),

  -- Valid status values
  CONSTRAINT purchase_orders_status_check
    CHECK (status IN (
      'draft',
      'submitted',
      'in_transit',
      'arrived',
      'received',
      'cancelled'
    )),

  -- Fees and totals are NOT NULL DEFAULT 0; must remain non-negative
  CONSTRAINT purchase_orders_office_fee_nonneg
    CHECK (office_fee >= 0),

  CONSTRAINT purchase_orders_shipping_fee_nonneg
    CHECK (shipping_fee >= 0),

  CONSTRAINT purchase_orders_subtotal_nonneg
    CHECK (subtotal_before >= 0),

  CONSTRAINT purchase_orders_total_cbm_nonneg
    CHECK (total_cbm IS NULL OR total_cbm >= 0),

  CONSTRAINT purchase_orders_total_pallets_pos
    CHECK (total_pallets IS NULL OR total_pallets > 0)
);

-- ------------------------------------------------------------
-- TRIGGER: auto-update updated_at
-- ------------------------------------------------------------

CREATE TRIGGER purchase_orders_updated_at
  BEFORE UPDATE ON purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

-- Primary query pattern: list POs for an org, filtered by status
CREATE INDEX purchase_orders_org_status_idx
  ON purchase_orders (organization_id, status);

-- Secondary query pattern: recent POs first
CREATE INDEX purchase_orders_created_at_idx
  ON purchase_orders (created_at DESC);

-- ------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Super admin: full CRUD on all POs within their organization.
-- Uses the is_super_admin() helper function created in task 1.7.
-- The organization_id check scopes access to their own org only.

CREATE POLICY "super_admin_all_purchase_orders"
  ON purchase_orders
  FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    AND organization_id = (
      SELECT organization_id
      FROM users
      WHERE id = requesting_user_id()
    )
  )
  WITH CHECK (
    is_super_admin()
    AND organization_id = (
      SELECT organization_id
      FROM users
      WHERE id = requesting_user_id()
    )
  );

-- Admin and employee: zero rows.
-- No explicit policy needed — RLS default-deny covers this.
-- The super_admin policy above is the only grant.

-- Service role bypass is handled automatically by Supabase
-- (service role key bypasses RLS entirely).

-- ------------------------------------------------------------
-- COMMENTS
-- ------------------------------------------------------------

COMMENT ON TABLE purchase_orders IS
  'Tracks each overseas (China) purchase order. '
  'Shared fees (office_fee, shipping_fee) are allocated across '
  'line items in purchase_order_items via recalculate_po_costs(). '
  'Super admin access only.';

COMMENT ON COLUMN purchase_orders.po_number IS
  'Human-readable PO identifier, unique per organization. '
  'Format is determined by the application layer (e.g. PO-2026-001).';

COMMENT ON COLUMN purchase_orders.subtotal_before IS
  'Sum of all purchase_order_items.total_price_before. '
  'Defaults to 0 on a new draft PO. Kept in sync by recalculate_po_costs() RPC (task 1.32).';

COMMENT ON COLUMN purchase_orders.office_fee IS
  'Shared office/handling fee for this shipment. Defaults to 0. '
  'Allocated proportionally across items by CBM share '
  'via recalculate_po_costs() RPC (task 1.32).';

COMMENT ON COLUMN purchase_orders.shipping_fee IS
  'Shared freight/shipping fee for this shipment. Defaults to 0. '
  'Allocated proportionally across items by CBM share '
  'via recalculate_po_costs() RPC (task 1.32).';

COMMENT ON COLUMN purchase_orders.total_cbm IS
  'Total cubic metres for this shipment. '
  'Sum of all purchase_order_items.cbm. NULL until items are added. '
  'Kept in sync by recalculate_po_costs() RPC (task 1.32).';

COMMENT ON COLUMN purchase_orders.created_by IS
  'User ID of the super admin who created the PO. NOT NULL. '
  'ON DELETE RESTRICT — reassign or archive POs before deleting the user.';


-- ============================================================
-- Task 1.27 — Create purchase_order_items table
-- ============================================================
-- One row per item per PO.
-- Stores both the raw supplier data (before fees) and the
-- fully allocated landed cost (after fees), replicating the
-- per-row logic of the Carton Calculator spreadsheet.
--
-- Computed columns (cbm_share, allocated fees, totals) are
-- written by the recalculate_po_costs() RPC (task 1.32)
-- whenever the Super Admin changes fees or quantities on a draft.
-- They default to 0 so the row is always valid on INSERT.
-- ============================================================


-- ------------------------------------------------------------
-- TABLE: purchase_order_items
-- ------------------------------------------------------------

CREATE TABLE purchase_order_items (
  id                      UUID              NOT NULL DEFAULT gen_random_uuid(),
  purchase_order_id       UUID              NOT NULL,
  item_id                 BIGINT            NOT NULL,

  -- ── Raw supplier data (entered by Super Admin) ───────────

  -- Total units ordered from supplier for this line.
  -- NUMERIC(10,2) to match item_locations.current_quantity type
  -- and to allow fractional units if needed in future (e.g. 0.5 kg).
  -- In practice always a whole number (100000, 50000, etc.).
  quantity_ordered        NUMERIC(10,2)     NOT NULL,

  -- Supplier unit price before any fee allocation.
  -- e.g. Paper Bag (Big) = $0.09, Spork = $0.047
  unit_price_before       NUMERIC(10,4)     NOT NULL,

  -- quantity_ordered × unit_price_before.
  -- Stored (not computed column) so it survives price updates.
  -- Kept in sync by recalculate_po_costs() RPC (task 1.32).
  total_price_before      NUMERIC(12,2)     NOT NULL DEFAULT 0,

  -- Units per carton/case, from supplier packaging.
  -- e.g. Paper Bag (Big) = 250, Plastic Cups 16oz = 1000.
  -- Nullable: some items may not come in cartons.
  -- Pre-fills from items.box_quantity (task 1.2) but can be
  -- overridden per PO.
  pieces_per_carton       INTEGER,

  -- quantity_ordered / pieces_per_carton.
  -- e.g. 100000 / 250 = 400 cartons.
  -- Nullable until pieces_per_carton is provided.
  -- Kept in sync by recalculate_po_costs() RPC.
  cartons                 NUMERIC(10,2),

  -- ── CBM (cubic metres) data ──────────────────────────────

  -- Physical volume this line item occupies in the shipment.
  -- e.g. Paper Bag (Big) = 22.4 CBM, Plastic Cups 16oz = 18.2 CBM.
  -- Nullable: entered by Super Admin, pre-fills from items.cbm_per_carton
  -- (task 1.21) but can be overridden per PO.
  cbm                     NUMERIC(10,4),

  -- cbm / purchase_orders.total_cbm — this item's proportion
  -- of the total shipment volume. Drives fee allocation.
  -- e.g. 22.4 / 175.217 ≈ 0.127812 for Paper Bag (Big).
  -- NULL until total_cbm can be calculated (requires all line items).
  -- Written by recalculate_po_costs() RPC.
  cbm_share               NUMERIC(8,6),

  -- ── Allocated shared costs ───────────────────────────────
  -- Both written by recalculate_po_costs() RPC (task 1.32).
  -- Default 0 so rows are valid before the first recalculation.

  -- cbm_share × purchase_orders.office_fee
  -- e.g. 0.127812 × $5,400 ≈ $690.18
  allocated_office_fee    NUMERIC(12,2)     NOT NULL DEFAULT 0,

  -- cbm_share × purchase_orders.shipping_fee
  -- e.g. 0.127812 × $37,500 ≈ $4,792.95
  allocated_shipping_fee  NUMERIC(12,2)     NOT NULL DEFAULT 0,

  -- ── Landed cost totals ───────────────────────────────────

  -- total_price_before + allocated_office_fee + allocated_shipping_fee.
  -- e.g. Paper Bag (Big): $9,000 + $690 + $4,793 ≈ $14,483
  -- Default 0; written by recalculate_po_costs() RPC.
  total_cost_after        NUMERIC(12,2)     NOT NULL DEFAULT 0,

  -- total_cost_after / quantity_ordered — THE landed unit cost.
  -- e.g. Paper Bag (Big): $14,483 / 100,000 ≈ $0.1448/unit.
  -- This value is what gets written to items.current_unit_cost
  -- when the PO is received (via receive_purchase_order() RPC, task 1.33).
  -- Default 0; written by recalculate_po_costs() RPC.
  unit_cost_after         NUMERIC(10,4)     NOT NULL DEFAULT 0,

  -- ── Receiving ────────────────────────────────────────────

  -- Actual units counted when shipment physically arrives.
  -- Defaults to NULL; set during "Mark as Received" flow.
  -- May differ from quantity_ordered (short shipments, damage, etc.).
  -- Used by receive_purchase_order() RPC (task 1.33) to update
  -- warehouse stock with the actual received count.
  quantity_received       NUMERIC(10,2),

  -- ── Constraints ──────────────────────────────────────────

  CONSTRAINT purchase_order_items_pkey
    PRIMARY KEY (id),

  -- Each item appears at most once per PO.
  -- Enforces task spec requirement: "Duplicate items per PO are rejected."
  CONSTRAINT purchase_order_items_po_item_unique
    UNIQUE (purchase_order_id, item_id),

  CONSTRAINT purchase_order_items_po_fk
    FOREIGN KEY (purchase_order_id)
    REFERENCES purchase_orders(id)
    ON DELETE CASCADE,    -- deleting a PO removes all its line items

  CONSTRAINT purchase_order_items_item_fk
    FOREIGN KEY (item_id)
    REFERENCES items(id)
    ON DELETE RESTRICT,   -- can't delete an item that has PO history

  -- Quantities must be positive
  CONSTRAINT purchase_order_items_qty_ordered_pos
    CHECK (quantity_ordered > 0),

  CONSTRAINT purchase_order_items_qty_received_pos
    CHECK (quantity_received IS NULL OR quantity_received >= 0),

  -- Prices and costs must be non-negative
  CONSTRAINT purchase_order_items_unit_price_nonneg
    CHECK (unit_price_before >= 0),

  CONSTRAINT purchase_order_items_total_price_nonneg
    CHECK (total_price_before >= 0),

  CONSTRAINT purchase_order_items_cbm_nonneg
    CHECK (cbm IS NULL OR cbm > 0),

  -- cbm_share is a proportion: 0 to 1 inclusive
  CONSTRAINT purchase_order_items_cbm_share_range
    CHECK (cbm_share IS NULL OR (cbm_share >= 0 AND cbm_share <= 1)),

  CONSTRAINT purchase_order_items_alloc_office_nonneg
    CHECK (allocated_office_fee >= 0),

  CONSTRAINT purchase_order_items_alloc_shipping_nonneg
    CHECK (allocated_shipping_fee >= 0),

  CONSTRAINT purchase_order_items_total_after_nonneg
    CHECK (total_cost_after >= 0),

  CONSTRAINT purchase_order_items_unit_after_nonneg
    CHECK (unit_cost_after >= 0),

  CONSTRAINT purchase_order_items_pieces_per_carton_pos
    CHECK (pieces_per_carton IS NULL OR pieces_per_carton > 0),

  CONSTRAINT purchase_order_items_cartons_pos
    CHECK (cartons IS NULL OR cartons > 0)
);

-- ------------------------------------------------------------
-- TRIGGER: auto-update purchase_orders.updated_at on line item change
-- ------------------------------------------------------------
-- When any line item is inserted, updated, or deleted,
-- touch the parent PO's updated_at. This keeps the PO list
-- sorted correctly by last-modified without a separate query.

CREATE OR REPLACE FUNCTION touch_purchase_order_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE purchase_orders
  SET    updated_at = NOW()
  WHERE  id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER purchase_order_items_touch_parent
  AFTER INSERT OR UPDATE OR DELETE ON purchase_order_items
  FOR EACH ROW
  EXECUTE FUNCTION touch_purchase_order_updated_at();

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

-- Primary access pattern: fetch all line items for a PO
-- (e.g. when opening PO detail page or running recalculate_po_costs)
CREATE INDEX purchase_order_items_po_id_idx
  ON purchase_order_items (purchase_order_id);

-- Secondary: look up all POs that contain a given item
-- (used by item cost history queries and item deletion guard)
CREATE INDEX purchase_order_items_item_id_idx
  ON purchase_order_items (item_id);

-- ------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE purchase_order_items ENABLE ROW LEVEL SECURITY;

-- Access follows the parent purchase_orders row.
-- A user can read/write a line item if and only if they can
-- read/write the parent PO — i.e. they are a super_admin in
-- the same organization as the PO.
--
-- JOIN to purchase_orders rather than duplicating organization_id
-- on this table. This keeps org scoping in one place and ensures
-- purchase_order_items RLS can never get out of sync with
-- purchase_orders RLS.

CREATE POLICY "super_admin_all_purchase_order_items"
  ON purchase_order_items
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM   purchase_orders po
      WHERE  po.id = purchase_order_items.purchase_order_id
        AND  is_super_admin()
        AND  po.organization_id = (
               SELECT organization_id
               FROM   users
               WHERE  id = requesting_user_id()
             )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM   purchase_orders po
      WHERE  po.id = purchase_order_items.purchase_order_id
        AND  is_super_admin()
        AND  po.organization_id = (
               SELECT organization_id
               FROM   users
               WHERE  id = requesting_user_id()
             )
    )
  );

-- Admin and employee: zero rows (RLS default-deny).
-- Service role bypasses RLS automatically.

-- ------------------------------------------------------------
-- COMMENTS
-- ------------------------------------------------------------

COMMENT ON TABLE purchase_order_items IS
  'Line items for each overseas purchase order. '
  'One row per item per PO. Stores raw supplier data plus '
  'CBM-based cost allocation fields that replicate the Carton '
  'Calculator spreadsheet logic. Computed columns (cbm_share, '
  'allocated fees, totals) are written by recalculate_po_costs() '
  'RPC (task 1.32). Landed unit cost is written to '
  'items.current_unit_cost by receive_purchase_order() (task 1.33).';

COMMENT ON COLUMN purchase_order_items.quantity_ordered IS
  'Total units ordered from supplier. In practice always a whole '
  'number (e.g. 100000 bags) but stored as NUMERIC(10,2) to match '
  'item_locations.current_quantity and allow edge cases.';

COMMENT ON COLUMN purchase_order_items.pieces_per_carton IS
  'Units per shipping carton/case for this line item on this PO. '
  'Pre-fills from items.box_quantity but can be overridden. '
  'NULL for items not shipped in cartons.';

COMMENT ON COLUMN purchase_order_items.cbm IS
  'Cubic metres occupied by this line item in the shipment. '
  'Pre-fills from items.cbm_per_carton (task 1.21) but can be '
  'overridden per PO. Drives proportional fee allocation.';

COMMENT ON COLUMN purchase_order_items.cbm_share IS
  'This item''s share of total shipment volume: cbm / total_cbm. '
  'Drives fee allocation. Written by recalculate_po_costs() RPC. '
  'NULL until all line items have CBM values and total_cbm is known.';

COMMENT ON COLUMN purchase_order_items.unit_cost_after IS
  'THE landed cost per unit: total_cost_after / quantity_ordered. '
  'This is the value written to items.current_unit_cost when the '
  'PO is received, and snapshotted to '
  'order_ticket_items.unit_cost_at_time on fulfillment.';

COMMENT ON COLUMN purchase_order_items.quantity_received IS
  'Actual units counted when shipment physically arrives. '
  'Set during "Mark as Received" flow. May differ from '
  'quantity_ordered (short shipments, damage). Used by '
  'receive_purchase_order() RPC (task 1.33) to update warehouse stock.';


-- ============================================================
-- Task 1.28 — Create warehouse_expenses table
-- ============================================================
-- Ledger for all warehouse operating costs.
-- Replaces any outside tracking (spreadsheets, notes) the
-- Super Admin does for pallet delivery, unloading, rent, etc.
--
-- Each row is a single expense event.
-- Current known rates (from Warehouse_Cost_Tracking_Plan.docx):
--   pallet_delivery : $65 / pallet
--   container_unload: dynamic (no fixed rate yet — client to confirm)
--   delivery        : dynamic / optional (self vs. company)
--   pallet_rent     : $16–$25 / pallet / month
--
-- Design principles:
--   • amount and rate_per_pallet are stored at time of entry.
--     Changing default rates (task 1.29) never alters historical rows.
--   • is_self_delivered only applies to delivery-type expenses.
--   • period_start / period_end only apply to recurring expenses
--     (pallet_rent, and optionally other).
--   • pallet_count and rate_per_pallet must be set together or
--     not at all — enforced by CHECK constraint.
-- ============================================================


-- ------------------------------------------------------------
-- TABLE: warehouse_expenses
-- ------------------------------------------------------------

CREATE TABLE warehouse_expenses (
  id                      UUID            NOT NULL DEFAULT gen_random_uuid(),

  -- Organization scope (stored directly — avoids JOIN in every RLS check)
  organization_id         TEXT            NOT NULL,

  -- Which warehouse this expense belongs to.
  -- Must be a location with location_type = 'warehouse' (task 1.1).
  -- Enforced at application layer; DB stores the FK only.
  warehouse_location_id   UUID            NOT NULL,

  -- Optional link to the PO that caused this expense.
  -- NULL for recurring/standing expenses (e.g. monthly pallet rent).
  -- Set for shipment-specific expenses (delivery, unload on arrival).
  purchase_order_id       UUID,

  -- ── Expense classification ────────────────────────────────

  -- pallet_delivery : per-pallet delivery to warehouse ($65/pallet)
  -- container_unload: unloading container on arrival (rate TBD by client)
  -- delivery        : transport to warehouse — may be self-delivered ($0)
  -- pallet_rent     : monthly storage rent per pallet ($16–$25/pallet)
  -- other           : any other warehouse operating cost
  expense_type            TEXT            NOT NULL,

  -- ── Cost ─────────────────────────────────────────────────

  -- Total dollar amount for this expense entry.
  -- For self-delivered expenses this should be 0.00, not NULL.
  -- Defaults to 0; always required (NOT NULL).
  amount                  NUMERIC(12,2)   NOT NULL DEFAULT 0,

  -- ── Pallet-based calculation audit trail ─────────────────
  -- Both nullable — not all expense types involve pallets (e.g. 'other').
  -- But if one is set the other MUST be set too (see constraint below).
  -- Storing rate_per_pallet at time of entry is critical:
  -- if the default rate changes in warehouse_expense_rates (task 1.29),
  -- historical records remain accurate.

  -- Number of pallets this expense covers.
  pallet_count            INTEGER,

  -- Rate used to calculate this entry (e.g. $65.00, $16.00).
  -- Snapshots the rate from warehouse_expense_rates at time of entry.
  rate_per_pallet         NUMERIC(10,2),

  -- ── Date / period ─────────────────────────────────────────

  -- The date this expense was incurred (required).
  expense_date            DATE            NOT NULL,

  -- Billing period for recurring expenses (pallet_rent, other).
  -- Both NULL for one-off expenses (delivery, unload).
  -- If either is set, both must be set (see constraint below).
  period_start            DATE,
  period_end              DATE,

  -- ── Delivery-specific flag ────────────────────────────────

  -- True when the warehouse picks up the shipment itself (no charge).
  -- Only meaningful when expense_type = 'delivery'.
  -- NULL on all other expense types (see constraint below).
  is_self_delivered       BOOLEAN,

  -- ── Metadata ──────────────────────────────────────────────

  notes                   TEXT,

  created_by              TEXT            NOT NULL,
  created_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- ── Constraints ───────────────────────────────────────────

  CONSTRAINT warehouse_expenses_pkey
    PRIMARY KEY (id),

  CONSTRAINT warehouse_expenses_org_fk
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE,

  CONSTRAINT warehouse_expenses_location_fk
    FOREIGN KEY (warehouse_location_id)
    REFERENCES locations(id)
    ON DELETE RESTRICT,  -- don't delete a warehouse that has expense history

  CONSTRAINT warehouse_expenses_po_fk
    FOREIGN KEY (purchase_order_id)
    REFERENCES purchase_orders(id)
    ON DELETE SET NULL,  -- PO deletion keeps the expense record; just unlinks it

  CONSTRAINT warehouse_expenses_created_by_fk
    FOREIGN KEY (created_by)
    REFERENCES users(id)
    ON DELETE RESTRICT,  -- financial records must preserve their creator

  -- Valid expense types
  CONSTRAINT warehouse_expenses_type_check
    CHECK (expense_type IN (
      'pallet_delivery',
      'container_unload',
      'delivery',
      'pallet_rent',
      'other'
    )),

  -- Amount must be non-negative (self-delivered = $0.00, not NULL)
  CONSTRAINT warehouse_expenses_amount_nonneg
    CHECK (amount >= 0),

  -- pallet_count must be positive when provided
  CONSTRAINT warehouse_expenses_pallet_count_pos
    CHECK (pallet_count IS NULL OR pallet_count > 0),

  -- rate_per_pallet must be non-negative when provided
  CONSTRAINT warehouse_expenses_rate_nonneg
    CHECK (rate_per_pallet IS NULL OR rate_per_pallet >= 0),

  -- pallet_count and rate_per_pallet must be set together or not at all.
  -- Prevents entries where pallet_count is known but rate is missing
  -- (or vice versa), which would make the audit trail incomplete.
  CONSTRAINT warehouse_expenses_pallet_fields_together
    CHECK (
      (pallet_count IS NULL) = (rate_per_pallet IS NULL)
    ),

  -- period_start and period_end must be set together or not at all
  CONSTRAINT warehouse_expenses_period_fields_together
    CHECK (
      (period_start IS NULL) = (period_end IS NULL)
    ),

  -- period_end must be after period_start when both are set
  CONSTRAINT warehouse_expenses_period_order
    CHECK (
      period_start IS NULL OR period_end > period_start
    ),

  -- Billing periods only make sense for recurring expense types.
  -- pallet_rent always has a period; 'other' may optionally have one.
  -- One-off types (pallet_delivery, container_unload, delivery)
  -- should never have a billing period.
  CONSTRAINT warehouse_expenses_period_type_check
    CHECK (
      period_start IS NULL
      OR expense_type IN ('pallet_rent', 'other')
    ),

  -- is_self_delivered only applies to delivery-type expenses.
  -- On all other expense types it must be NULL to avoid confusion.
  CONSTRAINT warehouse_expenses_self_delivered_type_check
    CHECK (
      is_self_delivered IS NULL
      OR expense_type = 'delivery'
    )
);

-- ------------------------------------------------------------
-- TRIGGER: auto-update updated_at
-- ------------------------------------------------------------

CREATE TRIGGER warehouse_expenses_updated_at
  BEFORE UPDATE ON warehouse_expenses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

-- Primary query pattern: list expenses for an org, filtered by date
-- (used on the Warehouse Expenses ledger page)
CREATE INDEX warehouse_expenses_org_date_idx
  ON warehouse_expenses (organization_id, expense_date DESC);

-- Filter by warehouse location (for multi-warehouse future support)
CREATE INDEX warehouse_expenses_location_idx
  ON warehouse_expenses (warehouse_location_id);

-- Filter by expense type (for analytics breakdown by type)
CREATE INDEX warehouse_expenses_type_idx
  ON warehouse_expenses (organization_id, expense_type);

-- Look up expenses linked to a specific PO
-- (shown on PO detail page alongside landed cost calculation)
CREATE INDEX warehouse_expenses_po_id_idx
  ON warehouse_expenses (purchase_order_id)
  WHERE purchase_order_id IS NOT NULL;

-- ------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE warehouse_expenses ENABLE ROW LEVEL SECURITY;

-- Super admin only: full CRUD scoped to their organization.
-- organization_id is stored directly on this table (no JOIN needed)
-- for RLS performance — this query runs on every expense row read.

CREATE POLICY "super_admin_all_warehouse_expenses"
  ON warehouse_expenses
  FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    AND organization_id = (
      SELECT organization_id
      FROM   users
      WHERE  id = requesting_user_id()
    )
  )
  WITH CHECK (
    is_super_admin()
    AND organization_id = (
      SELECT organization_id
      FROM   users
      WHERE  id = requesting_user_id()
    )
  );

-- Admin and employee: zero rows (RLS default-deny).
-- Service role bypasses RLS automatically.

-- ------------------------------------------------------------
-- COMMENTS
-- ------------------------------------------------------------

COMMENT ON TABLE warehouse_expenses IS
  'Ledger for all warehouse operating costs. '
  'Replaces external spreadsheet tracking of pallet delivery, '
  'container unload, delivery, and monthly pallet rent. '
  'Each row is a single expense event. rate_per_pallet is '
  'snapshotted at entry time — changing default rates in '
  'warehouse_expense_rates (task 1.29) never alters historical rows. '
  'Super admin access only.';

COMMENT ON COLUMN warehouse_expenses.purchase_order_id IS
  'Optional link to the PO that triggered this expense. '
  'NULL for recurring/standing expenses (monthly rent). '
  'ON DELETE SET NULL — PO deletion preserves the expense record.';

COMMENT ON COLUMN warehouse_expenses.amount IS
  'Total dollar amount for this expense. '
  'For self-delivered shipments set to 0.00, not NULL. '
  'NOT NULL DEFAULT 0.';

COMMENT ON COLUMN warehouse_expenses.rate_per_pallet IS
  'The rate used when calculating this entry (e.g. $65.00). '
  'Snapshotted from warehouse_expense_rates at time of entry. '
  'Preserved even if the default rate changes later. '
  'Must be set whenever pallet_count is set (and vice versa).';

COMMENT ON COLUMN warehouse_expenses.period_start IS
  'Billing period start for recurring expenses (pallet_rent, other). '
  'NULL for one-off expenses. Must be set with period_end.';

COMMENT ON COLUMN warehouse_expenses.period_end IS
  'Billing period end for recurring expenses (pallet_rent, other). '
  'Must be after period_start. NULL for one-off expenses.';

COMMENT ON COLUMN warehouse_expenses.is_self_delivered IS
  'True when the warehouse self-delivers (no charge). '
  'Only valid when expense_type = ''delivery''. '
  'NULL on all other expense types.';


-- ============================================================
-- Task 1.29 — Create warehouse_expense_rates table
-- ============================================================
-- Stores the current default rate for each warehouse expense type.
-- One row per expense type per organization.
--
-- Purpose: pre-fill rate_per_pallet when a Super Admin creates a
-- new warehouse_expenses entry, so they only enter pallet_count
-- and the total auto-calculates.
--
-- Critical design rule: this table only affects NEW expense entries.
-- warehouse_expenses.rate_per_pallet is snapshotted at entry time
-- and is NEVER updated when rates change here. Historical records
-- always reflect the rate that was actually charged.
--
-- Known rates from Warehouse_Cost_Tracking_Plan.docx §2.2:
--   pallet_delivery : $65.00 / pallet   (is_optional = false)
--   container_unload: $0.00  / pallet   (is_optional = false, rate TBD)
--   delivery        : $0.00  / pallet   (is_optional = true — self vs. company)
--   pallet_rent     : $16.00 / pallet   (is_optional = false, range $16–$25)
--
-- Note: container_unload and pallet_rent final rates are TBD —
-- client to confirm before seeding (see §11 of the plan doc).
-- The values above are safe starting defaults; Super Admin updates
-- them from the "Manage Rates" panel before first use.
-- ============================================================


-- ------------------------------------------------------------
-- TABLE: warehouse_expense_rates
-- ------------------------------------------------------------

CREATE TABLE warehouse_expense_rates (
  id                UUID            NOT NULL DEFAULT gen_random_uuid(),
  organization_id   TEXT            NOT NULL,

  -- Must match the expense_type values in warehouse_expenses.
  -- UNIQUE constraint below ensures one active rate per type per org.
  expense_type      TEXT            NOT NULL,

  -- The current default rate. Used to pre-fill new expense entries.
  -- For flat-rate expenses (no per-pallet calculation) this is the
  -- total default amount. For per_pallet types it is the per-unit rate.
  -- NOT NULL — if the rate is genuinely unknown, set 0 and update
  -- once confirmed. This prevents silent NULL * pallet_count = NULL.
  default_rate      NUMERIC(10,2)   NOT NULL DEFAULT 0,

  -- How the rate is applied when calculating expense totals:
  --   per_pallet : amount = default_rate × pallet_count
  --   flat       : amount = default_rate (one-time charge, ignore pallets)
  --   per_cbm    : amount = default_rate × cbm (reserved for future use)
  rate_unit         TEXT            NOT NULL DEFAULT 'per_pallet',

  -- Whether the Super Admin can skip this expense type when logging
  -- a shipment arrival. Optional expenses (delivery) can be omitted
  -- if self-delivered. Non-optional expenses (pallet_delivery,
  -- container_unload, pallet_rent) should always be logged.
  is_optional       BOOLEAN         NOT NULL DEFAULT false,

  -- No created_at — this table is configuration, not a ledger.
  -- updated_at tracks when the Super Admin last changed a rate.
  updated_at        TIMESTAMPTZ     NOT NULL DEFAULT NOW(),

  -- ── Constraints ───────────────────────────────────────────

  CONSTRAINT warehouse_expense_rates_pkey
    PRIMARY KEY (id),

  CONSTRAINT warehouse_expense_rates_org_fk
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE,

  -- One active rate per expense type per organization.
  -- Application upserts on this constraint when Super Admin updates a rate.
  CONSTRAINT warehouse_expense_rates_org_type_unique
    UNIQUE (organization_id, expense_type),

  -- expense_type must match warehouse_expenses valid values.
  -- Keeping these in sync prevents a rate row for a type that
  -- can never be used.
  CONSTRAINT warehouse_expense_rates_type_check
    CHECK (expense_type IN (
      'pallet_delivery',
      'container_unload',
      'delivery',
      'pallet_rent',
      'other'
    )),

  CONSTRAINT warehouse_expense_rates_rate_nonneg
    CHECK (default_rate >= 0),

  CONSTRAINT warehouse_expense_rates_unit_check
    CHECK (rate_unit IN ('per_pallet', 'flat', 'per_cbm'))
);

-- ------------------------------------------------------------
-- TRIGGER: auto-update updated_at
-- ------------------------------------------------------------
-- Reuses the existing update_updated_at_column() trigger function
-- (created in the base schema migration).

CREATE TRIGGER warehouse_expense_rates_updated_at
  BEFORE UPDATE ON warehouse_expense_rates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

-- Primary access pattern: fetch all rates for an org
-- (called when opening "Manage Rates" panel or creating a new expense)
CREATE INDEX warehouse_expense_rates_org_idx
  ON warehouse_expense_rates (organization_id);

-- ------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE warehouse_expense_rates ENABLE ROW LEVEL SECURITY;

-- Super admin: full CRUD — read rates and update them from the UI.
-- Admin/employee: no access (RLS default-deny).

CREATE POLICY "super_admin_all_warehouse_expense_rates"
  ON warehouse_expense_rates
  FOR ALL
  TO authenticated
  USING (
    is_super_admin()
    AND organization_id = (
      SELECT organization_id
      FROM   users
      WHERE  id = requesting_user_id()
    )
  )
  WITH CHECK (
    is_super_admin()
    AND organization_id = (
      SELECT organization_id
      FROM   users
      WHERE  id = requesting_user_id()
    )
  );

-- ------------------------------------------------------------
-- SEED DATA
-- ------------------------------------------------------------
-- ⚠  DO NOT hardcode an organization_id here.
--    Org IDs are Clerk-generated at runtime and differ between
--    dev / staging / production environments.
--
-- HOW TO SEED:
--   Option A (recommended): Hook into the Clerk organizationMembership
--   webhook (task 1.12). When the first super_admin is assigned,
--   INSERT these four rows for their organization_id.
--
--   Option B (manual): After task 5.7 Step 3 (assign Super Admin),
--   run the following SQL in the Supabase SQL editor, replacing
--   '<ORG_ID>' with the actual Clerk organization ID:
--
-- INSERT INTO warehouse_expense_rates
--   (organization_id, expense_type, default_rate, rate_unit, is_optional)
-- VALUES
--   ('<ORG_ID>', 'pallet_delivery',  65.00, 'per_pallet', false),
--   ('<ORG_ID>', 'container_unload',  0.00, 'per_pallet', false),  -- ⚠ rate TBD: confirm with client
--   ('<ORG_ID>', 'delivery',          0.00, 'per_pallet', true),   -- $0 until company delivery rate confirmed
--   ('<ORG_ID>', 'pallet_rent',      16.00, 'per_pallet', false)   -- ⚠ range $16–$25: confirm with client
-- ON CONFLICT (organization_id, expense_type) DO NOTHING;
--
-- container_unload and pallet_rent rates are placeholders.
-- Update them via the Super Admin "Manage Rates" panel before
-- logging the first shipment. See Warehouse_Cost_Tracking_Plan.docx §11.

-- ------------------------------------------------------------
-- COMMENTS
-- ------------------------------------------------------------

COMMENT ON TABLE warehouse_expense_rates IS
  'Default rates for each warehouse expense type. '
  'One row per expense type per organization. '
  'Used to pre-fill warehouse_expenses entries — Super Admin '
  'enters pallet_count and the total auto-calculates. '
  'Changing a rate here only affects new entries; '
  'historical warehouse_expenses rows preserve their original '
  'rate_per_pallet snapshot. Super admin access only.';

COMMENT ON COLUMN warehouse_expense_rates.default_rate IS
  'Current default rate. For per_pallet types: rate × pallet_count = amount. '
  'NOT NULL DEFAULT 0 — use 0 for unknown rates until confirmed by client, '
  'never NULL (NULL × pallet_count = NULL breaks auto-calculation).';

COMMENT ON COLUMN warehouse_expense_rates.rate_unit IS
  'How the rate is applied: '
  'per_pallet = default_rate × pallet_count, '
  'flat = default_rate is the total (no multiplier), '
  'per_cbm = default_rate × cbm (reserved for future use).';

COMMENT ON COLUMN warehouse_expense_rates.is_optional IS
  'Whether this expense type can be skipped when logging a shipment. '
  'True for delivery (may be self-delivered at $0). '
  'False for pallet_delivery, container_unload, pallet_rent — '
  'these should always be logged.';

COMMENT ON COLUMN warehouse_expense_rates.updated_at IS
  'When the Super Admin last changed this rate. '
  'No created_at — this is configuration state, not a ledger. '
  'Auto-updated by trigger on every UPDATE.';


-- ============================================================
-- Task 1.30 -- Create item_cost_history table
-- ============================================================
-- Immutable price snapshots -- one row per item per PO receive.
-- Written by receive_purchase_order() RPC (task 1.33).
-- Never updated after creation.
--
-- Purpose: creates a time-series of landed costs per item so the
-- Super Admin can track price trends (is pistachio getting more
-- expensive? is paper bag shipping cost creeping up?).
--
-- Relationship to other tables:
--   purchase_order_items  : source of truth for the cost math;
--                           item_cost_history is a derived snapshot.
--   items.current_unit_cost : the LATEST value from this table;
--                           updated by receive_purchase_order().
--
-- Both item and PO FKs are CASCADE:
--   item_id CASCADE         : deleting an item removes its cost history.1
--   purchase_order_id CASCADE : snapshots are derived from the PO;
--                             if the PO is deleted the snapshots go too.
--   The financial source of truth is purchase_order_items, not here.
-- ============================================================


-- ------------------------------------------------------------
-- TABLE: item_cost_history
-- ------------------------------------------------------------

CREATE TABLE item_cost_history (
  id                  UUID              NOT NULL DEFAULT gen_random_uuid(),

  -- Stored directly for RLS and analytics query performance.
  -- Avoids a JOIN to purchase_orders on every cost trend query.
  organization_id     TEXT              NOT NULL,

  item_id             BIGINT            NOT NULL,
  purchase_order_id   UUID              NOT NULL,

  -- ---- Cost snapshot ------------------------------------------

  -- Supplier unit price for this item on this PO, before fee
  -- allocation. Copied from purchase_order_items.unit_price_before.
  -- Useful for separating "supplier price went up" from
  -- "shipping fees went up" in trend analysis.
  unit_price_before   NUMERIC(10,4)     NOT NULL,

  -- Fully loaded landed cost per unit after CBM-based fee allocation.
  -- Copied from purchase_order_items.unit_cost_after.
  -- This is the value written to items.current_unit_cost and used
  -- as the transfer price on order tickets.
  unit_cost_after     NUMERIC(10,4)     NOT NULL,

  -- The date this cost became the active landed cost.
  -- Set to purchase_orders.actual_arrival by receive_purchase_order()
  -- RPC (task 1.33). Used as the x-axis for cost trend charts.
  -- NOT NULL -- a snapshot without a date is useless for trend queries.
  effective_date      DATE              NOT NULL,

  -- No updated_at -- rows are written once and never modified.
  -- Mutating a cost snapshot would corrupt the trend history.
  created_at          TIMESTAMPTZ       NOT NULL DEFAULT NOW(),

  -- ---- Constraints --------------------------------------------

  CONSTRAINT item_cost_history_pkey
    PRIMARY KEY (id),

  CONSTRAINT item_cost_history_org_fk
    FOREIGN KEY (organization_id)
    REFERENCES organizations(id)
    ON DELETE CASCADE,

  -- CASCADE: deleting an item removes its cost history.
  CONSTRAINT item_cost_history_item_fk
    FOREIGN KEY (item_id)
    REFERENCES items(id)
    ON DELETE CASCADE,

  -- CASCADE: deleting a PO removes its cost snapshots.
  -- The financial source of truth is purchase_order_items.
  CONSTRAINT item_cost_history_po_fk
    FOREIGN KEY (purchase_order_id)
    REFERENCES purchase_orders(id)
    ON DELETE CASCADE,

  -- One snapshot per item per PO.
  -- receive_purchase_order() creates exactly one row per item.
  -- Prevents double-receiving the same PO from creating duplicate
  -- history entries that corrupt trend calculations.
  CONSTRAINT item_cost_history_item_po_unique
    UNIQUE (item_id, purchase_order_id),

  CONSTRAINT item_cost_history_unit_price_nonneg
    CHECK (unit_price_before >= 0),

  CONSTRAINT item_cost_history_unit_cost_nonneg
    CHECK (unit_cost_after >= 0),

  -- Sanity check: landed cost must be >= supplier price.
  -- Fee allocation only adds to the cost, never reduces it.
  -- Catches bugs in recalculate_po_costs() before they corrupt
  -- cost history and propagate to items.current_unit_cost.
  CONSTRAINT item_cost_history_cost_gte_price
    CHECK (unit_cost_after >= unit_price_before)
);

-- ------------------------------------------------------------
-- INDEXES
-- ------------------------------------------------------------

-- Primary trend query: "show me this item's cost over time"
-- ORDER BY effective_date DESC -- most recent cost first.
-- Also supports range scans: "what was the cost on date X?"
CREATE INDEX item_cost_history_item_date_idx
  ON item_cost_history (item_id, effective_date DESC);

-- Cross-item analytics: "which items had the biggest cost change
-- in the last 3 months?" -- scan by org + date range.
CREATE INDEX item_cost_history_org_date_idx
  ON item_cost_history (organization_id, effective_date DESC);

-- Lookup all snapshots created from a specific PO
-- (shown on PO detail page and used when auditing a receive event).
CREATE INDEX item_cost_history_po_id_idx
  ON item_cost_history (purchase_order_id);

-- ------------------------------------------------------------
-- ROW-LEVEL SECURITY
-- ------------------------------------------------------------

ALTER TABLE item_cost_history ENABLE ROW LEVEL SECURITY;

-- Super admin: SELECT + INSERT only.
-- No UPDATE or DELETE policies -- rows are immutable once written.
-- Splitting into separate policies enforces immutability at the
-- database level, not just by application convention.
-- Service role can still correct rows directly if needed.

CREATE POLICY "super_admin_select_item_cost_history"
  ON item_cost_history
  FOR SELECT
  TO authenticated
  USING (
    is_super_admin()
    AND organization_id = (
      SELECT organization_id
      FROM   users
      WHERE  id = requesting_user_id()
    )
  );

CREATE POLICY "super_admin_insert_item_cost_history"
  ON item_cost_history
  FOR INSERT
  TO authenticated
  WITH CHECK (
    is_super_admin()
    AND organization_id = (
      SELECT organization_id
      FROM   users
      WHERE  id = requesting_user_id()
    )
  );

-- ------------------------------------------------------------
-- COMMENTS
-- ------------------------------------------------------------

COMMENT ON TABLE item_cost_history IS
  'Immutable cost snapshots -- one row per item per PO receive. '
  'Written by receive_purchase_order() RPC (task 1.33), never updated. '
  'Provides a time-series of landed costs per item for trend analysis. '
  'items.current_unit_cost always reflects the latest row here. '
  'Super admin SELECT + INSERT only; no UPDATE or DELETE via RLS.';

COMMENT ON COLUMN item_cost_history.unit_price_before IS
  'Supplier price per unit before fee allocation. '
  'Copied from purchase_order_items.unit_price_before at receive time. '
  'Enables separating supplier price changes from shipping cost changes '
  'in trend analysis.';

COMMENT ON COLUMN item_cost_history.unit_cost_after IS
  'Fully landed cost per unit after CBM-based fee allocation. '
  'Copied from purchase_order_items.unit_cost_after at receive time. '
  'This is the transfer price used on order tickets until the next PO.';

COMMENT ON COLUMN item_cost_history.effective_date IS
  'Date this cost became the active landed cost. '
  'Set to purchase_orders.actual_arrival by receive_purchase_order() RPC. '
  'Used as the x-axis on cost trend charts. NOT NULL.';

COMMENT ON COLUMN item_cost_history.created_at IS
  'When this snapshot row was inserted (database receive time). '
  'Distinct from effective_date, which is the business date '
  'the cost became active. No updated_at -- rows are immutable.';
