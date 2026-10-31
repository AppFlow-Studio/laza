-- ============================================================
-- D8 — Create get_item_shipment_history RPC
-- Migration: 014_get_item_shipment_history_rpc
-- Depends on: D1 (po_item_box_configs), D7 (item_shipment_breakdown)
-- Priority: P1 SHOULD
-- ============================================================
--
-- Returns one JSON object per shipment (PO) that contained this item,
-- with a nested box_configs array per PO line — ready for the
-- Item Detail Drawer Shipment History tab (F3).
--
-- Return shape (array of):
-- {
--   purchase_order_item_id: UUID,
--   po_id:                  UUID,
--   po_number:              TEXT,
--   po_date:                DATE,
--   actual_arrival:         DATE,
--   supplier_name:          TEXT,
--   po_line_total_boxes:    INTEGER,
--   po_line_total_pieces:   INTEGER,
--   has_mixed_configs:      BOOLEAN,
--   box_configs: [
--     {
--       config_id:           UUID,
--       pieces_per_box:      INTEGER,
--       box_count:           INTEGER,
--       total_pieces:        INTEGER,
--       notes:               TEXT | null
--     }
--   ]
-- }
-- ============================================================

CREATE OR REPLACE FUNCTION get_item_shipment_history(
  p_item_id         BIGINT,
  p_organization_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
  v_result JSONB;
BEGIN

  -- ── 1. Permission check ──────────────────────────────────
  -- super_admin only — must belong to the requested org
  IF NOT EXISTS (
    SELECT 1
    FROM users u
    JOIN members m ON m.user_id = u.id
    WHERE u.id        = requesting_user_id()
      AND u.role      = 'super_admin'
      AND m.organization_id = p_organization_id::TEXT
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: super_admin access required';
  END IF;

  -- ── 2. Verify item belongs to org ────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM items
    WHERE id              = p_item_id
      AND organization_id = p_organization_id::TEXT
  ) THEN
    RAISE EXCEPTION 'ITEM_NOT_FOUND: item % not found in org %',
      p_item_id, p_organization_id;
  END IF;

  -- ── 3. Build nested JSON ─────────────────────────────────
  -- Group by PO line, aggregate configs into a nested array.
  -- Pulls directly from item_shipment_breakdown view so filter
  -- logic (arrived/received POs only) is inherited automatically.
  SELECT COALESCE(
    jsonb_agg(
      jsonb_build_object(
        'purchase_order_item_id', shipment.purchase_order_item_id,
        'po_id',                  shipment.po_id,
        'po_number',              shipment.po_number,
        'po_date',                shipment.po_date,
        'actual_arrival',         shipment.actual_arrival,
        'supplier_name',          shipment.supplier_name,
        'po_line_total_boxes',    shipment.po_line_total_boxes,
        'po_line_total_pieces',   shipment.po_line_total_pieces,
        'has_mixed_configs',      shipment.has_mixed_configs,
        'box_configs',            shipment.box_configs
      )
      ORDER BY
        shipment.actual_arrival DESC NULLS LAST,
        shipment.po_date        DESC
    ),
    '[]'::JSONB
  )
  INTO v_result
  FROM (
    -- One row per PO line — configs collapsed into a JSON array
    SELECT
      purchase_order_item_id,
      po_id,
      po_number,
      po_date,
      actual_arrival,
      supplier_name,
      po_line_total_boxes,
      po_line_total_pieces,
      has_mixed_configs,
      jsonb_agg(
        jsonb_build_object(
          'config_id',      config_id,
          'pieces_per_box', config_pieces_per_box,
          'box_count',      config_box_count,
          'total_pieces',   config_total_pieces,
          'notes',          config_notes
        )
        ORDER BY config_box_count DESC  -- dominant config first
      ) AS box_configs
    FROM item_shipment_breakdown
    WHERE item_id         = p_item_id
      AND organization_id = p_organization_id::TEXT
    GROUP BY
      purchase_order_item_id,
      po_id,
      po_number,
      po_date,
      actual_arrival,
      supplier_name,
      po_line_total_boxes,
      po_line_total_pieces,
      has_mixed_configs
  ) shipment;

  RETURN v_result;

END;
$$;

-- ── Grant ─────────────────────────────────────────────────────
GRANT EXECUTE ON FUNCTION get_item_shipment_history(BIGINT, UUID)
  TO authenticated;

-- ── Comment ───────────────────────────────────────────────────
COMMENT ON FUNCTION get_item_shipment_history(BIGINT, UUID) IS
  'Returns shipment history for a single item as a JSONB array.
   Each element is one PO line with a nested box_configs array.
   Used by the Item Detail Drawer Shipment History tab (F3).
   Only includes POs with status = arrived or received (via item_shipment_breakdown view).
   Ordered by actual_arrival DESC. super_admin only.';