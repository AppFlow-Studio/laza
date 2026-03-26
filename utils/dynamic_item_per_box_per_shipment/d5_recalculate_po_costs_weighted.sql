-- ============================================================
-- D5 — Update recalculate_po_costs for variable pieces_per_box
-- Migration: 011_recalculate_po_costs_weighted_ppb
-- Depends on: D1 (po_item_box_configs)
-- Priority: P1 SHOULD
-- ============================================================
--
-- What changes:
--   The existing recalculate_po_costs() recalculates CBM-based cost
--   allocation across PO line items. Previously it assumed a single
--   static pieces_per_box per line.
--
--   With mixed box configs, unit_cost_after must use the correct
--   total piece count: SUM(pieces_per_box * box_count) across ALL
--   po_item_box_configs rows for that PO line — the weighted total.
--
--   If no po_item_box_configs rows exist yet for a line (pre-D3 data
--   or locally-sourced items), we fall back to the existing
--   purchase_order_items.pieces_per_box × cartons calculation.
-- ============================================================

CREATE OR REPLACE FUNCTION recalculate_po_costs(
  p_purchase_order_id UUID
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_total_cbm          NUMERIC(10,4);
  v_office_fee         NUMERIC(12,2);
  v_shipping_fee       NUMERIC(12,2);

  r                    RECORD;
  v_cbm_share          NUMERIC(8,6);
  v_alloc_office       NUMERIC(12,2);
  v_alloc_shipping     NUMERIC(12,2);
  v_total_cost_after   NUMERIC(12,2);
  v_unit_cost_after    NUMERIC(10,4);

  -- Weighted total pieces for this PO line
  v_weighted_pieces    NUMERIC(12,2);
BEGIN
  -- ── 1. Load PO-level shared fees and total CBM ───────────
  SELECT
    COALESCE(SUM(poi.cbm), 0),
    po.office_fee,
    po.shipping_fee
  INTO
    v_total_cbm,
    v_office_fee,
    v_shipping_fee
  FROM purchase_orders po
  JOIN purchase_order_items poi ON poi.purchase_order_id = po.id
  WHERE po.id = p_purchase_order_id
  GROUP BY po.office_fee, po.shipping_fee;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PO_NOT_FOUND: purchase order % does not exist', p_purchase_order_id;
  END IF;

  -- ── 2. Recalculate each line item ────────────────────────
  FOR r IN
    SELECT
      poi.id,
      poi.item_id,
      poi.quantity_ordered,
      poi.unit_price_before,
      poi.total_price_before,
      poi.cbm,
      poi.cartons,
      poi.pieces_per_box
    FROM purchase_order_items poi
    WHERE poi.purchase_order_id = p_purchase_order_id
  LOOP

    -- ── 2a. CBM share ──────────────────────────────────────
    IF v_total_cbm > 0 AND r.cbm IS NOT NULL THEN
      v_cbm_share := r.cbm / v_total_cbm;
    ELSE
      v_cbm_share := 0;
    END IF;

    -- ── 2b. Allocated fees ─────────────────────────────────
    v_alloc_office   := ROUND(v_cbm_share * v_office_fee,   2);
    v_alloc_shipping := ROUND(v_cbm_share * v_shipping_fee, 2);

    -- ── 2c. Weighted total pieces from po_item_box_configs ─
    --
    --   Preferred: SUM(pieces_per_box * box_count) from config rows.
    --   This is the true total pieces for this PO line including all
    --   mixed-box configurations.
    --
    --   Fallback: quantity_ordered (total pieces ordered) from the
    --   PO line itself, which is what the original function used.
    --   Used when no config rows exist yet.
    SELECT COALESCE(SUM(cfg.total_pieces), 0)
      INTO v_weighted_pieces
      FROM po_item_box_configs cfg
     WHERE cfg.purchase_order_item_id = r.id;

    IF v_weighted_pieces = 0 THEN
      -- Fall back to quantity_ordered (total pieces on the PO line)
      v_weighted_pieces := r.quantity_ordered;
    END IF;

    -- ── 2d. Total and unit cost after fees ─────────────────
    v_total_cost_after := ROUND(r.total_price_before + v_alloc_office + v_alloc_shipping, 2);

    IF v_weighted_pieces > 0 THEN
      v_unit_cost_after := ROUND(v_total_cost_after / v_weighted_pieces, 4);
    ELSE
      -- Edge case: no pieces on this line — set unit cost to supplier price
      v_unit_cost_after := r.unit_price_before;
    END IF;

    -- ── 2e. Write back to purchase_order_items ─────────────
    UPDATE purchase_order_items
       SET cbm_share              = v_cbm_share,
           allocated_office_fee   = v_alloc_office,
           allocated_shipping_fee = v_alloc_shipping,
           total_cost_after       = v_total_cost_after,
           unit_cost_after        = v_unit_cost_after
     WHERE id = r.id;

  END LOOP;

  -- ── 3. Update PO-level totals ────────────────────────────
  UPDATE purchase_orders
     SET subtotal_before = (
           SELECT COALESCE(SUM(total_price_before), 0)
             FROM purchase_order_items
            WHERE purchase_order_id = p_purchase_order_id
         ),
         total_cbm = v_total_cbm,
         updated_at = NOW()
   WHERE id = p_purchase_order_id;

END;
$$;

GRANT EXECUTE ON FUNCTION recalculate_po_costs(UUID) TO authenticated;

-- ── Re-run for all existing POs so their unit costs reflect
--    any box configs that were backfilled in D3.
--    Wrapped in a DO block so a failure on one PO doesn't
--    abort the whole migration — it just logs a warning.

DO $$
DECLARE
  v_po_id     UUID;
  v_po_number TEXT;
  v_count     INTEGER := 0;
  v_errors    INTEGER := 0;
BEGIN
  FOR v_po_id, v_po_number IN
    SELECT id, po_number
      FROM purchase_orders
     ORDER BY created_at
  LOOP
    BEGIN
      PERFORM recalculate_po_costs(v_po_id);
      v_count := v_count + 1;
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'recalculate_po_costs failed for PO % (%): %',
        v_po_number, v_po_id, SQLERRM;
      v_errors := v_errors + 1;
    END;
  END LOOP;

  RAISE NOTICE '=== D5 Recalculation Summary ===';
  RAISE NOTICE 'POs recalculated successfully : %', v_count;
  RAISE NOTICE 'POs with errors (see warnings): %', v_errors;
END;
$$;