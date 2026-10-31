-- ============================================================
-- D9 — Enhance warehouse_inventory_overview with config_source
-- Migration: 015_warehouse_inventory_overview_config_source
-- Depends on: D1 (po_item_box_configs)
-- Priority: P2 NICE
-- ============================================================
--
-- Adds a single computed column config_source TEXT to the existing
-- warehouse_inventory_overview view. No other columns are changed.
--
-- config_source values (mirrors the three-level resolution order
-- defined in Schema Revision Proposal v2, Section 5.3):
--
--   'pallet_override'  — pallet_inventory.pieces_per_box_override IS NOT NULL
--                        (local item or manual correction)
--
--   'po_box_config'    — override is NULL but a po_item_box_configs row
--                        exists for this pallet's purchase_order_item_id
--                        (standard China shipment with config rows)
--
--   'item_default'     — neither override nor config row: falls back to
--                        items.box_quantity
--
-- This column lets the UI show a small provenance badge on each pallet
-- row so the Super Admin can see at a glance where the pieces_per_box
-- figure came from, without having to open the item detail drawer.
-- ============================================================

-- Drop first to avoid column ordering/rename conflicts with CREATE OR REPLACE.
-- Any views or functions depending on warehouse_inventory_overview must be
-- recreated after this migration if they reference it directly.
DROP VIEW IF EXISTS warehouse_inventory_overview;

CREATE VIEW warehouse_inventory_overview AS
SELECT
  -- ── pallet_inventory core ───────────────────────────────
  pi.id                                                     AS pallet_inventory_id,
  pi.pallet_id,
  pi.item_id,
  pi.purchase_order_item_id,
  pi.box_count,
  pi.initial_box_count,
  pi.pieces_per_box_override,
  pi.created_at                                             AS inventory_created_at,
  pi.updated_at                                             AS inventory_updated_at,

  -- ── warehouse_pallets ────────────────────────────────────
  wp.organization_id,
  wp.pallet_label,
  wp.status                                                 AS pallet_status,
  wp.storage_space_id,
  wp.warehouse_location_id,
  wp.purchase_order_id,
  wp.received_at,

  -- ── items ────────────────────────────────────────────────
  i.name                                                    AS item_name,
  COALESCE(i.short_label, i.name)                           AS item_display_label,
  i.sku,
  i.box_quantity                                            AS item_default_ppb,

  -- ── purchase_order_items (nullable — NULL for local items) ─
  poi.pieces_per_box                                        AS po_pieces_per_box,
  poi.has_mixed_configs,

  -- ── Effective pieces_per_box (three-level resolution) ────
  -- Resolution order:
  --   1. pallet_inventory.pieces_per_box_override  (local / manual)
  --   2. purchase_order_items.pieces_per_box        (PO dominant config)
  --   3. items.box_quantity                         (catalog default)
  COALESCE(
    pi.pieces_per_box_override,
    poi.pieces_per_box,
    i.box_quantity
  )                                                         AS effective_ppb,

  -- ── Derived total pieces on this pallet row ──────────────
  pi.box_count * COALESCE(
    pi.pieces_per_box_override,
    poi.pieces_per_box,
    i.box_quantity
  )                                                         AS total_pieces,

  -- ── D9: config_source ────────────────────────────────────
  -- Tells the UI exactly where effective_ppb came from.
  CASE
    WHEN pi.pieces_per_box_override IS NOT NULL
      THEN 'pallet_override'

    WHEN poi.id IS NOT NULL AND EXISTS (
      SELECT 1
      FROM po_item_box_configs cfg
      WHERE cfg.purchase_order_item_id = pi.purchase_order_item_id
    )
      THEN 'po_box_config'

    ELSE 'item_default'
  END                                                       AS config_source

FROM pallet_inventory       pi
JOIN warehouse_pallets      wp  ON wp.id  = pi.pallet_id
JOIN items                  i   ON i.id   = pi.item_id
LEFT JOIN purchase_order_items poi ON poi.id = pi.purchase_order_item_id;

-- ── Comments ─────────────────────────────────────────────────

COMMENT ON VIEW warehouse_inventory_overview IS
  'Pre-joined view over pallet_inventory, warehouse_pallets, items, and
   purchase_order_items. Powers the warehouse inventory UI queries.
   effective_ppb follows the three-level resolution order from Schema v2 §5.3:
   pallet_override → po_pieces_per_box → item_default.
   config_source (added in D9) indicates which level was used for each row,
   enabling the UI to show a provenance badge without an extra join.
   Not materialized — data changes too frequently for a materialized view.';

-- ── Grant ────────────────────────────────────────────────────
-- Re-grant after DROP + CREATE (permissions are lost on DROP).
GRANT SELECT ON warehouse_inventory_overview TO authenticated;