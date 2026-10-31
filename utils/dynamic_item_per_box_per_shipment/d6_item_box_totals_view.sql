-- ============================================================
-- D6 — Create item_box_totals view (the "Totals View")
-- Migration: 012_item_box_totals_view
-- Depends on: D1 (po_item_box_configs)
-- ============================================================
--
-- One row per item per organization.
-- Aggregates across ALL received shipments (all POs, all configs).
--
-- Columns:
--   organization_id        — for RLS filtering
--   item_id                — FK to items
--   item_name              — items.name
--   sku                    — items.sku
--   total_boxes_received   — SUM of all config box_counts ever received
--   total_pieces_received  — SUM of all config total_pieces ever received
--   weighted_avg_per_box   — total_pieces_received / total_boxes_received
--   current_default_per_box— items.box_quantity (the live default)
--   shipment_count         — number of distinct POs that included this item
--   current_warehouse_boxes— live box count from active pallet_inventory rows
-- ============================================================

CREATE OR REPLACE VIEW item_box_totals AS
WITH

-- All box config rows joined up to their item, scoped by org via PO
config_base AS (
  SELECT
    po.organization_id,
    poi.item_id,
    po.id                    AS purchase_order_id,
    cfg.box_count,
    cfg.total_pieces          -- generated column: pieces_per_box * box_count
  FROM po_item_box_configs   cfg
  JOIN purchase_order_items  poi ON poi.id  = cfg.purchase_order_item_id
  JOIN purchase_orders       po  ON po.id   = poi.purchase_order_id
),

-- Aggregate totals per org + item
config_agg AS (
  SELECT
    organization_id,
    item_id,
    SUM(box_count)                                         AS total_boxes_received,
    SUM(total_pieces)                                      AS total_pieces_received,
    COUNT(DISTINCT purchase_order_id)                      AS shipment_count
  FROM config_base
  GROUP BY organization_id, item_id
),

-- Live warehouse stock: current (not initial) box_count on active pallets
warehouse_stock AS (
  SELECT
    wp.organization_id,
    pi.item_id,
    SUM(pi.box_count)   AS current_warehouse_boxes
  FROM pallet_inventory  pi
  JOIN warehouse_pallets wp ON wp.id = pi.pallet_id
  WHERE wp.status = 'active'
    AND pi.box_count > 0
  GROUP BY wp.organization_id, pi.item_id
)

SELECT
  i.organization_id,
  i.id                                                         AS item_id,
  i.name                                                       AS item_name,
  i.sku,

  -- Historical totals (NULL if item has never been in a PO with box configs)
  COALESCE(ca.total_boxes_received,  0)                        AS total_boxes_received,
  COALESCE(ca.total_pieces_received, 0)                        AS total_pieces_received,

  -- Weighted average: total pieces / total boxes across all configs
  CASE
    WHEN COALESCE(ca.total_boxes_received, 0) > 0
    THEN ROUND(
           ca.total_pieces_received::NUMERIC / ca.total_boxes_received,
           2
         )
    ELSE NULL
  END                                                          AS weighted_avg_per_box,

  -- Current live default (auto-updated by D4 to dominant config)
  i.box_quantity                                               AS current_default_per_box,

  COALESCE(ca.shipment_count, 0)                               AS shipment_count,

  -- Live stock from active pallets (NULL = not currently in warehouse)
  COALESCE(ws.current_warehouse_boxes, 0)                      AS current_warehouse_boxes

FROM items             i
LEFT JOIN config_agg   ca ON ca.organization_id = i.organization_id
                          AND ca.item_id        = i.id
LEFT JOIN warehouse_stock ws ON ws.organization_id = i.organization_id
                             AND ws.item_id         = i.id

-- Only include items that belong to an org with warehouse activity,
-- or that have at least some box config history
WHERE (ca.item_id IS NOT NULL OR ws.item_id IS NOT NULL);

-- ── Comments ─────────────────────────────────────────────────

COMMENT ON VIEW item_box_totals IS
  'Aggregate totals per item across all received shipments (the Totals View).
   Used by the Item Detail Drawer Overview tab and F1 query hooks.
   One row per item. LEFT JOINs mean items with no PO history are excluded.
   current_warehouse_boxes reflects only active pallets with box_count > 0.
   weighted_avg_per_box = total_pieces_received / total_boxes_received across
   all po_item_box_configs rows for this item.';

-- ── RLS note ─────────────────────────────────────────────────
-- Views in Postgres inherit the RLS of their underlying tables.
-- pallet_inventory and warehouse_pallets already have RLS enabled,
-- so super_admin sees their org only, and employees see nothing.
-- No additional RLS policy is needed on the view itself.

-- ── Grant ────────────────────────────────────────────────────
GRANT SELECT ON item_box_totals TO authenticated;