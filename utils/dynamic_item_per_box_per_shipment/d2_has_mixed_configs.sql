-- ============================================================
-- D2 — Add has_mixed_configs column to purchase_order_items
-- Migration: 008_has_mixed_configs
-- Depends on: D1 (po_item_box_configs table)
-- ============================================================

-- ─── 1. COLUMN ──────────────────────────────────────────────

ALTER TABLE purchase_order_items
  ADD COLUMN has_mixed_configs BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN purchase_order_items.has_mixed_configs IS
  'True when this PO line has more than one po_item_box_configs row
   (i.e. boxes arrived with different pieces_per_box values).
   Auto-maintained by the sync_has_mixed_configs trigger on po_item_box_configs.
   Allows quick filtering without a JOIN.';

-- ─── 2. SYNC TRIGGER ────────────────────────────────────────
-- Fires after INSERT / UPDATE / DELETE on po_item_box_configs.
-- Recalculates has_mixed_configs for the affected purchase_order_item.

CREATE OR REPLACE FUNCTION sync_has_mixed_configs()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_poi_id UUID;
  v_config_count INTEGER;
BEGIN
  -- Determine which purchase_order_item was affected
  IF TG_OP = 'DELETE' THEN
    v_poi_id := OLD.purchase_order_item_id;
  ELSE
    v_poi_id := NEW.purchase_order_item_id;
  END IF;

  -- Count distinct configs for that PO line
  SELECT COUNT(*)
    INTO v_config_count
    FROM po_item_box_configs
   WHERE purchase_order_item_id = v_poi_id;

  -- Update the flag
  UPDATE purchase_order_items
     SET has_mixed_configs = (v_config_count > 1)
   WHERE id = v_poi_id;

  RETURN NULL; -- AFTER trigger, return value is ignored
END;
$$;

CREATE TRIGGER sync_has_mixed_configs
  AFTER INSERT OR UPDATE OR DELETE
  ON po_item_box_configs
  FOR EACH ROW
  EXECUTE FUNCTION sync_has_mixed_configs();

-- ─── 3. BACKFILL current rows ───────────────────────────────
-- Set has_mixed_configs correctly for any po_item_box_configs
-- rows that already exist (e.g. from a D1 test insert).

UPDATE purchase_order_items poi
   SET has_mixed_configs = (
     SELECT COUNT(*) > 1
       FROM po_item_box_configs
      WHERE purchase_order_item_id = poi.id
   );