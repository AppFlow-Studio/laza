-- ============================================================
-- D3 — Backfill po_item_box_configs from existing PO data
-- Migration: 009_backfill_po_item_box_configs
-- Depends on: D1 (po_item_box_configs), D2 (has_mixed_configs)
-- ============================================================

-- ─── 1. BACKFILL ────────────────────────────────────────────
-- For every purchase_order_items row that has a pieces_per_box value,
-- create one po_item_box_configs row.
--
-- box_count resolution:
--   1st choice: cartons      (actual carton count recorded at PO creation)
--   2nd choice: quantity_ordered (total pieces — fallback if cartons is NULL)
--
-- ON CONFLICT: safe to re-run. If a config row already exists for this
-- (purchase_order_item_id, pieces_per_box) pair (e.g. from a test insert),
-- we update box_count to the correct value rather than failing.

INSERT INTO po_item_box_configs (
  purchase_order_item_id,
  pieces_per_box,
  box_count,
  notes
)
SELECT
  id                                        AS purchase_order_item_id,
  pieces_per_box,
  COALESCE(cartons, quantity_ordered)::INTEGER AS box_count,
  'Backfilled from purchase_order_items during D3 migration'
FROM purchase_order_items
WHERE pieces_per_box IS NOT NULL
  AND pieces_per_box > 0
  AND COALESCE(cartons, quantity_ordered) IS NOT NULL
  AND COALESCE(cartons, quantity_ordered) > 0
ON CONFLICT (purchase_order_item_id, pieces_per_box)
DO UPDATE SET
  box_count = EXCLUDED.box_count,
  notes     = EXCLUDED.notes;

-- ─── 2. REPORT ──────────────────────────────────────────────
-- Quick summary so you can verify in the SQL editor output.

DO $$
DECLARE
  v_total_poi        INTEGER;
  v_eligible_poi     INTEGER;
  v_configs_inserted INTEGER;
  v_skipped          INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_total_poi FROM purchase_order_items;

  SELECT COUNT(*) INTO v_eligible_poi
    FROM purchase_order_items
   WHERE pieces_per_box IS NOT NULL
     AND pieces_per_box > 0
     AND COALESCE(cartons, quantity_ordered) IS NOT NULL
     AND COALESCE(cartons, quantity_ordered) > 0;

  SELECT COUNT(*) INTO v_configs_inserted FROM po_item_box_configs;

  v_skipped := v_total_poi - v_eligible_poi;

  RAISE NOTICE '=== D3 Backfill Summary ===';
  RAISE NOTICE 'Total purchase_order_items rows : %', v_total_poi;
  RAISE NOTICE 'Eligible for backfill           : %', v_eligible_poi;
  RAISE NOTICE 'Skipped (NULL pieces_per_box    : %', v_skipped;
  RAISE NOTICE 'po_item_box_configs total rows  : %', v_configs_inserted;
END;
$$;

-- ─── 3. VERIFY has_mixed_configs is consistent ──────────────
-- The D2 trigger handles future inserts automatically.
-- Re-run the D2 backfill UPDATE here as a safety net in case
-- D3 was applied before D2's backfill ran.

UPDATE purchase_order_items poi
   SET has_mixed_configs = (
     SELECT COUNT(*) > 1
       FROM po_item_box_configs
      WHERE purchase_order_item_id = poi.id
   );