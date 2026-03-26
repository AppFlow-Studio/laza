-- ============================================================
-- D1 — Create po_item_box_configs table + RLS + indexes
-- Migration: 007_po_item_box_configs
-- Depends on: purchase_order_items table
-- ============================================================

-- ─── 1. TABLE ───────────────────────────────────────────────

CREATE TABLE po_item_box_configs (
  id                      UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_order_item_id  UUID          NOT NULL
                                          REFERENCES purchase_order_items(id)
                                          ON DELETE CASCADE,
  pieces_per_box          INTEGER       NOT NULL CHECK (pieces_per_box > 0),
  box_count               INTEGER       NOT NULL CHECK (box_count > 0),
  total_pieces            INTEGER       GENERATED ALWAYS AS (pieces_per_box * box_count) STORED,
  notes                   TEXT,
  created_at              TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_po_item_box_configs_item_ppb
    UNIQUE (purchase_order_item_id, pieces_per_box)
);

-- ─── 2. INDEX ───────────────────────────────────────────────

CREATE INDEX idx_po_item_box_configs_poi
  ON po_item_box_configs (purchase_order_item_id);

-- ─── 3. ROW-LEVEL SECURITY ──────────────────────────────────

ALTER TABLE po_item_box_configs ENABLE ROW LEVEL SECURITY;

-- Super Admin: full CRUD on configs that belong to their organization
CREATE POLICY "super_admin_full_crud_po_item_box_configs"
  ON po_item_box_configs
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.purchase_order_id
      JOIN users u ON u.id = requesting_user_id()
        AND u.role = 'super_admin'
      WHERE poi.id = po_item_box_configs.purchase_order_item_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.purchase_order_id
      JOIN users u ON u.id = requesting_user_id()
        AND u.role = 'super_admin'
      WHERE poi.id = po_item_box_configs.purchase_order_item_id
    )
  );

-- Admin: read-only, access via parent PO (same org, role = 'admin')
CREATE POLICY "admin_read_po_item_box_configs"
  ON po_item_box_configs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM purchase_order_items poi
      JOIN purchase_orders po ON po.id = poi.purchase_order_id
      JOIN users u ON u.id = requesting_user_id()
        AND u.role = 'admin'
      WHERE poi.id = po_item_box_configs.purchase_order_item_id
    )
  );

-- Employee: no access (no policy = no rows returned)

-- ─── 4. COMMENT ─────────────────────────────────────────────

COMMENT ON TABLE po_item_box_configs IS
  'One row per distinct box-size configuration within a purchase order line item.
   Supports mixed-box shipments (e.g. 4 boxes × 7,000 + 6 boxes × 5,000 of the same item).
   total_pieces is a generated column: pieces_per_box × box_count.
   Part of the Dynamic Items-Per-Box Per Shipment Tracking System (task D1).';

COMMENT ON COLUMN po_item_box_configs.purchase_order_item_id IS 'FK to purchase_order_items. Cascades on delete.';
COMMENT ON COLUMN po_item_box_configs.pieces_per_box          IS 'How many individual units are in each box for this configuration group.';
COMMENT ON COLUMN po_item_box_configs.box_count               IS 'Number of boxes that use this pieces_per_box value in this PO line.';
COMMENT ON COLUMN po_item_box_configs.total_pieces            IS 'Generated: pieces_per_box × box_count. Never set manually.';
COMMENT ON COLUMN po_item_box_configs.notes                   IS 'Optional free-text note (e.g. supplier label variance, manual recount).';