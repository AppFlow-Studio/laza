-- ============================================================
-- D7 — Create item_shipment_breakdown view
--      (the "Per Box Per Shipment View")
-- Migration: 013_item_shipment_breakdown_view
-- Depends on: D1 (po_item_box_configs), D2 (has_mixed_configs)
-- ============================================================
--
-- One row per po_item_box_configs row — i.e. one row per
-- distinct pieces_per_box configuration per PO line item.
--
-- A single PO line with mixed configs produces MULTIPLE rows
-- (one per config), all sharing the same po_number / po_date.
-- The frontend groups by purchase_order_item_id and uses
-- has_mixed_configs to decide whether to show the "Mixed" badge
-- and expand the config sub-rows.
--
-- Columns:
--   organization_id        — for org-scoping on the frontend
--   item_id                — FK to items
--   item_name              — items.name
--   sku                    — items.sku
--   purchase_order_item_id — FK to purchase_order_items (grouping key)
--   po_id                  — FK to purchase_orders
--   po_number              — human-readable PO identifier
--   po_date                — purchase_orders.order_date
--   actual_arrival         — purchase_orders.actual_arrival
--   supplier_name          — purchase_orders.supplier_name
--   config_pieces_per_box  — this config row's pieces_per_box
--   config_box_count       — this config row's box_count
--   config_total_pieces    — generated: pieces_per_box * box_count
--   po_line_total_boxes    — SUM of all config box_counts for this PO line
--   po_line_total_pieces   — SUM of all config total_pieces for this PO line
--   has_mixed_configs      — true when PO line has > 1 config row
-- ============================================================

CREATE OR REPLACE VIEW item_shipment_breakdown AS
WITH

-- Pre-aggregate totals per PO line so we can show them on every row
po_line_totals AS (
  SELECT
    purchase_order_item_id,
    SUM(box_count)    AS po_line_total_boxes,
    SUM(total_pieces) AS po_line_total_pieces
  FROM po_item_box_configs
  GROUP BY purchase_order_item_id
)

SELECT
  po.organization_id,
  poi.item_id,
  i.name                       AS item_name,
  i.sku,

  -- Grouping key for the frontend expandable rows
  cfg.purchase_order_item_id,

  -- PO identifiers
  po.id                        AS po_id,
  po.po_number,
  po.order_date                AS po_date,
  po.actual_arrival,
  po.supplier_name,

  -- This specific config row
  cfg.id                       AS config_id,
  cfg.pieces_per_box           AS config_pieces_per_box,
  cfg.box_count                AS config_box_count,
  cfg.total_pieces             AS config_total_pieces,   -- generated column
  cfg.notes                    AS config_notes,
  cfg.created_at               AS config_created_at,

  -- PO line rollup (same value on every config row for this line)
  plt.po_line_total_boxes,
  plt.po_line_total_pieces,

  -- Mixed flag — drives "Mixed" badge and row expansion in the UI
  poi.has_mixed_configs

FROM po_item_box_configs    cfg
JOIN purchase_order_items   poi ON poi.id  = cfg.purchase_order_item_id
JOIN purchase_orders        po  ON po.id   = poi.purchase_order_id
JOIN items                  i   ON i.id    = poi.item_id
JOIN po_line_totals         plt ON plt.purchase_order_item_id = cfg.purchase_order_item_id

-- Only surface shipments that have actually arrived or been received
-- (avoids showing in-progress POs in the history view)
WHERE po.status IN ('arrived', 'received')

ORDER BY
  po.organization_id,
  poi.item_id,
  po.actual_arrival DESC NULLS LAST,
  po.order_date     DESC,
  cfg.box_count     DESC;   -- dominant config first within a line

-- ── Comments ─────────────────────────────────────────────────

COMMENT ON VIEW item_shipment_breakdown IS
  'Per-shipment, per-item breakdown of box configurations (the Per Box Per Shipment View).
   One row per po_item_box_configs entry. A PO line with mixed configs produces
   multiple rows sharing the same purchase_order_item_id.
   Frontend groups by purchase_order_item_id and uses has_mixed_configs to render
   the Mixed badge and expandable config sub-rows.
   Used by the Item Detail Drawer Shipment History tab (F3) and D8 RPC.
   Only includes POs with status = arrived or received.';

-- ── RLS note ─────────────────────────────────────────────────
-- RLS on purchase_orders (org-scoped) propagates through this view.
-- super_admin sees only their org. Employees see nothing (no policy
-- on purchase_orders for employee role).

-- ── Grant ────────────────────────────────────────────────────
GRANT SELECT ON item_shipment_breakdown TO authenticated;