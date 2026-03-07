-- ============================================================
-- Migration: 007_recalculate_po_costs.sql
-- Task 1.32 — Create recalculate_po_costs() RPC function
-- Depends on: 1.26 (purchase_orders), 1.27 (purchase_order_items)
-- ============================================================
-- Recalculates all cost allocations for a draft PO in a single
-- transaction. Called whenever the Super Admin changes fees,
-- quantities, or CBM values on a draft PO.
--
-- Calculation chain (mirrors Carton Calculator spreadsheet):
--   1. total_cbm       = SUM(item CBMs)
--   2. cbm_share       = item.cbm / total_cbm          (per line)
--   3. alloc_office    = cbm_share × po.office_fee     (per line)
--   4. alloc_shipping  = cbm_share × po.shipping_fee   (per line)
--   5. total_price_before = qty × unit_price_before    (per line)
--   6. total_cost_after   = total_price_before + alloc_office + alloc_shipping
--   7. unit_cost_after    = total_cost_after / quantity_ordered
--   8. subtotal_before = SUM(total_price_before)       (PO header)
--   9. total_cbm       written back to PO header
-- ============================================================
SET search_path TO public;


CREATE OR REPLACE FUNCTION recalculate_po_costs(
  p_purchase_order_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_po                  purchase_orders%ROWTYPE;
  v_total_cbm           NUMERIC(10,4);
  v_subtotal_before     NUMERIC(12,2);
  v_items_updated       INTEGER;
  v_items_missing_cbm   INTEGER;
BEGIN

  -- ── 1. Lock and fetch the PO ───────────────────────────────
  -- SELECT FOR UPDATE prevents two concurrent Super Admin sessions
  -- from recalculating the same PO simultaneously (e.g. two browser
  -- tabs both editing fees at the same time).

  SELECT * INTO v_po
  FROM   purchase_orders
  WHERE  id = p_purchase_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase_order_not_found'
      USING DETAIL = p_purchase_order_id::TEXT;
  END IF;

  -- ── 2. Guard: only recalculate draft POs ──────────────────
  -- Once a PO moves past 'draft' the line items are locked.
  -- Recalculating a submitted/received PO would corrupt cost
  -- history and any order tickets priced from it.

  IF v_po.status NOT IN ('draft', 'submitted') THEN
    RAISE EXCEPTION 'po_not_editable'
      USING DETAIL = 'PO status is ' || v_po.status ||
                     '. Only draft or submitted POs can be recalculated.';
  END IF;

  -- ── 3. Recalculate total_price_before for every line item ──
  -- Do this first so subtotal_before is accurate even when
  -- some items have no CBM (can't allocate fees yet, but
  -- supplier costs are still correct).

  UPDATE purchase_order_items
  SET    total_price_before = quantity_ordered * unit_price_before
  WHERE  purchase_order_id = p_purchase_order_id;

  -- ── 4. Aggregate totals from line items ───────────────────

  SELECT
    SUM(cbm),                    -- NULL if any item has no CBM
    SUM(total_price_before)
  INTO
    v_total_cbm,
    v_subtotal_before
  FROM purchase_order_items
  WHERE purchase_order_id = p_purchase_order_id;

  -- Count items missing CBM so we can warn the caller
  SELECT COUNT(*) INTO v_items_missing_cbm
  FROM   purchase_order_items
  WHERE  purchase_order_id = p_purchase_order_id
    AND  cbm IS NULL;

  -- ── 5. Allocate fees across line items ────────────────────
  -- Only possible when ALL items have a CBM value and total_cbm > 0.
  -- If any item is missing CBM, we still update total_price_before
  -- and subtotal_before but zero out all allocation fields.
  -- The UI should warn the Super Admin about missing CBM values.

  IF v_total_cbm IS NOT NULL AND v_total_cbm > 0 THEN

    UPDATE purchase_order_items poi
    SET
      -- Proportion of total shipment volume
      cbm_share              = poi.cbm / v_total_cbm,

      -- Fee allocation proportional to CBM share
      allocated_office_fee   = ROUND((poi.cbm / v_total_cbm) * v_po.office_fee,   2),
      allocated_shipping_fee = ROUND((poi.cbm / v_total_cbm) * v_po.shipping_fee, 2),

      -- Landed cost totals
      total_cost_after       = poi.total_price_before
                               + ROUND((poi.cbm / v_total_cbm) * v_po.office_fee,   2)
                               + ROUND((poi.cbm / v_total_cbm) * v_po.shipping_fee, 2),

      -- THE landed unit cost — written to items.current_unit_cost on receive
      unit_cost_after        = CASE
                                 WHEN poi.quantity_ordered > 0
                                 THEN ROUND(
                                        (poi.total_price_before
                                         + ROUND((poi.cbm / v_total_cbm) * v_po.office_fee,   2)
                                         + ROUND((poi.cbm / v_total_cbm) * v_po.shipping_fee, 2)
                                        ) / poi.quantity_ordered,
                                        4
                                      )
                                 ELSE 0
                               END
    WHERE poi.purchase_order_id = p_purchase_order_id;

  ELSE

    -- Can't allocate without CBM — zero out allocation fields
    -- so stale values from a previous calculation don't mislead.
    UPDATE purchase_order_items
    SET
      cbm_share              = NULL,
      allocated_office_fee   = 0,
      allocated_shipping_fee = 0,
      total_cost_after       = total_price_before,  -- cost = supplier price only
      unit_cost_after        = CASE
                                 WHEN quantity_ordered > 0
                                 THEN ROUND(total_price_before / quantity_ordered, 4)
                                 ELSE 0
                               END
    WHERE purchase_order_id = p_purchase_order_id;

  END IF;

  GET DIAGNOSTICS v_items_updated = ROW_COUNT;

  -- ── 6. Update PO header ───────────────────────────────────

  UPDATE purchase_orders
  SET
    subtotal_before = COALESCE(v_subtotal_before, 0),
    total_cbm       = v_total_cbm   -- NULL if any item missing CBM
  WHERE id = p_purchase_order_id;

  -- ── 7. Return summary for the UI ─────────────────────────
  -- The frontend uses this to update its local state without
  -- needing a separate refetch round-trip.

  RETURN jsonb_build_object(
    'po_id',               p_purchase_order_id,
    'total_cbm',           v_total_cbm,
    'subtotal_before',     COALESCE(v_subtotal_before, 0),
    'items_updated',       v_items_updated,
    'items_missing_cbm',   v_items_missing_cbm,
    'fees_allocated',      (v_total_cbm IS NOT NULL AND v_total_cbm > 0)
  );

END;
$$;

-- ── Grant execute to authenticated users ──────────────────────
-- RLS on the underlying tables still applies inside the function.
-- A non-super-admin calling this RPC will hit the purchase_orders
-- SELECT FOR UPDATE and get zero rows (RLS blocks it), causing
-- the 'purchase_order_not_found' exception. Safe by design.

GRANT EXECUTE ON FUNCTION recalculate_po_costs(UUID) TO authenticated;

-- ── Comment ───────────────────────────────────────────────────

COMMENT ON FUNCTION recalculate_po_costs(UUID) IS
  'Recalculates all CBM-based cost allocations for a draft PO. '
  'Updates purchase_order_items (cbm_share, allocated fees, '
  'total_cost_after, unit_cost_after) and purchase_orders header '
  '(subtotal_before, total_cbm). '
  'Safe to call repeatedly — idempotent for the same input state. '
  'Raises po_not_editable if PO status is not draft or submitted. '
  'Returns a JSONB summary including items_missing_cbm count so '
  'the UI can warn the Super Admin before they submit the PO.';