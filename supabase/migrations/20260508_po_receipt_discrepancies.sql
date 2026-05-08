-- PO Receiving — whole-box invariant for discrepancies.
--
-- Splits `quantity_received` into `full_boxes_received` (palletizable) and
-- `partial_box_units` (loose remainder), captures a structured reason for the
-- partial, and gates the `receive_purchase_order` RPC on those rules. Phase B
-- of the receiving wizard reads `full_boxes_received` so loose units never
-- reach pallet assignment.

-- ── 1. Discrepancy columns ────────────────────────────────────────────────
ALTER TABLE purchase_order_items
  ADD COLUMN IF NOT EXISTS full_boxes_received   INTEGER,
  ADD COLUMN IF NOT EXISTS partial_box_units     INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partial_box_reason    TEXT,
  ADD COLUMN IF NOT EXISTS partial_box_note      TEXT,
  ADD COLUMN IF NOT EXISTS overage_acknowledged  BOOLEAN NOT NULL DEFAULT FALSE;

-- ── 2. Backfill BEFORE adding constraints ─────────────────────────────────
-- Existing already-received POs may have non-whole-box quantities. Tag them
-- with `miscount_pending_recount` so the constraint allows them through;
-- super admin can re-classify later.
UPDATE purchase_order_items
SET    full_boxes_received = FLOOR(quantity_received::numeric / NULLIF(pieces_per_box, 0))::INTEGER,
       partial_box_units   = (COALESCE(quantity_received, 0)::INTEGER) % NULLIF(pieces_per_box, 0),
       partial_box_reason  = CASE
                               WHEN (COALESCE(quantity_received, 0)::INTEGER) % NULLIF(pieces_per_box, 0) > 0
                                 THEN 'miscount_pending_recount'
                               ELSE NULL
                             END,
       partial_box_note    = CASE
                               WHEN (COALESCE(quantity_received, 0)::INTEGER) % NULLIF(pieces_per_box, 0) > 0
                                 THEN 'Backfilled — reason not captured at receipt time.'
                               ELSE NULL
                             END
WHERE  quantity_received IS NOT NULL
  AND  pieces_per_box IS NOT NULL
  AND  pieces_per_box > 0
  AND  full_boxes_received IS NULL;

-- ── 3. CHECK constraints ──────────────────────────────────────────────────
ALTER TABLE purchase_order_items
  DROP CONSTRAINT IF EXISTS poi_partial_box_reason_chk,
  DROP CONSTRAINT IF EXISTS poi_partial_box_units_range_chk,
  DROP CONSTRAINT IF EXISTS poi_partial_box_units_ppb1_chk,
  DROP CONSTRAINT IF EXISTS poi_partial_box_reason_required_chk;

ALTER TABLE purchase_order_items
  ADD CONSTRAINT poi_partial_box_reason_chk
  CHECK (
    partial_box_reason IS NULL
    OR partial_box_reason IN (
      'damaged_in_transit',
      'supplier_short_pack',
      'miscount_pending_recount',
      'sample_pulled_qc',
      'other'
    )
  );

ALTER TABLE purchase_order_items
  ADD CONSTRAINT poi_partial_box_units_range_chk
  CHECK (partial_box_units >= 0
         AND (pieces_per_box IS NULL
              OR pieces_per_box <= 0
              OR partial_box_units < pieces_per_box));

ALTER TABLE purchase_order_items
  ADD CONSTRAINT poi_partial_box_units_ppb1_chk
  CHECK (pieces_per_box <> 1 OR partial_box_units = 0);

ALTER TABLE purchase_order_items
  ADD CONSTRAINT poi_partial_box_reason_required_chk
  CHECK (partial_box_units = 0 OR partial_box_reason IS NOT NULL);

-- ── 4. RPC — receive_purchase_order ───────────────────────────────────────
-- Accepts the same JSONB payload but reads new optional keys per item:
--   partial_box_reason, partial_box_note, overage_acknowledged.
-- Rejects fractional-box receipts that lack a reason, and overages that
-- aren't explicitly acknowledged.
CREATE OR REPLACE FUNCTION receive_purchase_order(
  p_purchase_order_id   UUID,
  p_user_id             TEXT,
  p_received_items      JSONB
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_po                    purchase_orders%ROWTYPE;
  v_warehouse_location_id UUID;

  v_received_item         JSONB;
  v_item_id               BIGINT;
  v_qty_received          INTEGER;
  v_qty_ordered           NUMERIC(10,2);
  v_pieces_per_box        INTEGER;
  v_full_boxes            INTEGER;
  v_partial_units         INTEGER;
  v_reason                TEXT;
  v_note                  TEXT;
  v_overage_ack           BOOLEAN;
  v_unit_cost_after       NUMERIC(10,4);
  v_unit_price_before     NUMERIC(10,4);
  v_prev_quantity         NUMERIC(10,2);
  v_new_quantity          NUMERIC(10,2);
  v_item_location_id      UUID;

  v_items_received        INTEGER := 0;
  v_items_skipped         INTEGER := 0;
  v_total_units_received  NUMERIC(10,2) := 0;

  v_item_results          JSONB := '[]'::JSONB;
BEGIN

  -- ── 1. Lock and fetch the PO ─────────────────────────────────────────
  SELECT * INTO v_po
  FROM   purchase_orders
  WHERE  id = p_purchase_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase_order_not_found'
      USING DETAIL = p_purchase_order_id::TEXT;
  END IF;

  IF v_po.status = 'received' THEN
    RAISE EXCEPTION 'po_already_received'
      USING DETAIL = 'PO ' || p_purchase_order_id::TEXT ||
                     ' has already been received.';
  END IF;

  IF v_po.status NOT IN ('arrived', 'in_transit') THEN
    RAISE EXCEPTION 'po_not_receivable'
      USING DETAIL = 'PO status is ' || v_po.status ||
                     '. Only arrived or in_transit POs can be received.';
  END IF;

  IF p_received_items IS NULL OR jsonb_array_length(p_received_items) = 0 THEN
    RAISE EXCEPTION 'received_items_empty'
      USING DETAIL = 'p_received_items must contain at least one item.';
  END IF;

  SELECT id INTO v_warehouse_location_id
  FROM   locations
  WHERE  organization_id = v_po.organization_id
    AND  location_type   = 'warehouse'
  LIMIT 1;

  IF v_warehouse_location_id IS NULL THEN
    RAISE EXCEPTION 'warehouse_location_not_found'
      USING DETAIL = 'No warehouse location found for organization ' ||
                     v_po.organization_id;
  END IF;

  -- ── 2. Process each received item ────────────────────────────────────
  FOR v_received_item IN SELECT * FROM jsonb_array_elements(p_received_items)
  LOOP
    v_item_id      := (v_received_item->>'item_id')::BIGINT;
    v_qty_received := (v_received_item->>'quantity_received')::INTEGER;
    v_reason       := NULLIF(v_received_item->>'partial_box_reason', '');
    v_note         := NULLIF(v_received_item->>'partial_box_note', '');
    v_overage_ack  := COALESCE((v_received_item->>'overage_acknowledged')::BOOLEAN, FALSE);

    SELECT quantity_ordered, pieces_per_box, unit_cost_after, unit_price_before
    INTO   v_qty_ordered, v_pieces_per_box, v_unit_cost_after, v_unit_price_before
    FROM   purchase_order_items
    WHERE  purchase_order_id = p_purchase_order_id
      AND  item_id           = v_item_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'item_not_in_po'
        USING DETAIL = 'Item ' || v_item_id::TEXT ||
                       ' is not in PO ' || p_purchase_order_id::TEXT;
    END IF;

    IF v_qty_received IS NULL THEN
      v_qty_received := v_qty_ordered::INTEGER;
    END IF;

    IF v_qty_received < 0 THEN
      RAISE EXCEPTION 'invalid_quantity_received'
        USING DETAIL = 'quantity_received cannot be negative for item ' ||
                       v_item_id::TEXT;
    END IF;

    -- Whole-box split
    IF v_pieces_per_box IS NULL OR v_pieces_per_box <= 0 THEN
      v_full_boxes    := v_qty_received;  -- treat as one-pcs-per-box
      v_partial_units := 0;
    ELSE
      v_full_boxes    := v_qty_received / v_pieces_per_box;
      v_partial_units := v_qty_received % v_pieces_per_box;
    END IF;

    -- Defensive: pcs_per_box = 1 ⇒ no partials possible
    IF v_pieces_per_box = 1 AND v_partial_units <> 0 THEN
      RAISE EXCEPTION 'invalid_partial_for_unit_box'
        USING DETAIL = 'Item ' || v_item_id::TEXT ||
                       ' has pieces_per_box=1; partial-box units cannot occur.';
    END IF;

    -- Reason required when there's a loose-units remainder
    IF v_partial_units > 0 AND v_reason IS NULL THEN
      RAISE EXCEPTION 'partial_box_reason_required'
        USING DETAIL = 'Item ' || v_item_id::TEXT ||
                       ' has ' || v_partial_units::TEXT ||
                       ' loose units; partial_box_reason is required.';
    END IF;

    IF v_reason IS NOT NULL AND v_reason NOT IN (
      'damaged_in_transit',
      'supplier_short_pack',
      'miscount_pending_recount',
      'sample_pulled_qc',
      'other'
    ) THEN
      RAISE EXCEPTION 'invalid_partial_box_reason'
        USING DETAIL = 'partial_box_reason must be one of: damaged_in_transit, supplier_short_pack, miscount_pending_recount, sample_pulled_qc, other';
    END IF;

    -- Overage requires explicit acknowledgement
    IF v_qty_received > v_qty_ordered AND NOT v_overage_ack THEN
      RAISE EXCEPTION 'overage_not_acknowledged'
        USING DETAIL = 'Item ' || v_item_id::TEXT ||
                       ' received ' || v_qty_received::TEXT ||
                       ' but ordered ' || v_qty_ordered::TEXT ||
                       '. Set overage_acknowledged=true to confirm.';
    END IF;

    IF v_qty_received = 0 THEN
      UPDATE purchase_order_items
      SET    quantity_received    = 0,
             full_boxes_received  = 0,
             partial_box_units    = 0,
             partial_box_reason   = NULL,
             partial_box_note     = NULL,
             overage_acknowledged = FALSE
      WHERE  purchase_order_id = p_purchase_order_id
        AND  item_id           = v_item_id;

      v_items_skipped := v_items_skipped + 1;
      v_item_results  := v_item_results || jsonb_build_object(
        'item_id',          v_item_id,
        'qty_received',     0,
        'qty_ordered',      v_qty_ordered,
        'skipped',          true,
        'skip_reason',      'quantity_received is zero'
      );
      CONTINUE;
    END IF;

    -- ── 2a. Upsert warehouse item_locations ──────────────────────────
    SELECT id, current_quantity
    INTO   v_item_location_id, v_prev_quantity
    FROM   item_locations
    WHERE  item_id      = v_item_id
      AND  location_id  = v_warehouse_location_id
      AND  storage_space_id IS NULL
    FOR UPDATE;

    IF FOUND THEN
      v_new_quantity := v_prev_quantity + v_qty_received;
      UPDATE item_locations
      SET    current_quantity = v_new_quantity,
             last_updated     = NOW()
      WHERE  id = v_item_location_id;
    ELSE
      v_prev_quantity := 0;
      v_new_quantity  := v_qty_received;
      INSERT INTO item_locations (
        organization_id, item_id, location_id, storage_space_id,
        current_quantity, last_updated
      ) VALUES (
        v_po.organization_id, v_item_id, v_warehouse_location_id, NULL,
        v_new_quantity, NOW()
      )
      RETURNING id INTO v_item_location_id;
    END IF;

    -- ── 2b. Inventory log ────────────────────────────────────────────
    INSERT INTO inventory_logs (
      organization_id, item_id, location_id, storage_space_id,
      user_id, previous_quantity, new_quantity, quantity_change,
      action_type, notes
    ) VALUES (
      v_po.organization_id, v_item_id, v_warehouse_location_id, NULL,
      p_user_id, v_prev_quantity, v_new_quantity, v_qty_received,
      'received',
      'PO received: ' || v_po.po_number ||
        CASE WHEN v_qty_received <> v_qty_ordered
             THEN ' (ordered ' || v_qty_ordered::TEXT ||
                  ', received ' || v_qty_received::TEXT ||
                  CASE WHEN v_partial_units > 0
                       THEN ', partial ' || v_partial_units::TEXT ||
                            ' [' || v_reason || ']'
                       ELSE ''
                  END ||
                  ')'
             ELSE ''
        END
    );

    -- ── 2c. Cost history snapshot ───────────────────────────────────
    INSERT INTO item_cost_history (
      organization_id, item_id, purchase_order_id,
      unit_price_before, unit_cost_after, effective_date
    ) VALUES (
      v_po.organization_id, v_item_id, p_purchase_order_id,
      v_unit_price_before, v_unit_cost_after,
      COALESCE(v_po.actual_arrival, CURRENT_DATE)
    )
    ON CONFLICT (item_id, purchase_order_id) DO NOTHING;

    UPDATE items
    SET    current_unit_cost = v_unit_cost_after
    WHERE  id = v_item_id;

    -- ── 2d. Persist split + discrepancy fields ──────────────────────
    UPDATE purchase_order_items
    SET    quantity_received    = v_qty_received,
           full_boxes_received  = v_full_boxes,
           partial_box_units    = v_partial_units,
           partial_box_reason   = v_reason,
           partial_box_note     = v_note,
           overage_acknowledged = v_overage_ack
    WHERE  purchase_order_id = p_purchase_order_id
      AND  item_id           = v_item_id;

    v_items_received       := v_items_received + 1;
    v_total_units_received := v_total_units_received + v_qty_received;

    v_item_results := v_item_results || jsonb_build_object(
      'item_id',             v_item_id,
      'qty_ordered',         v_qty_ordered,
      'qty_received',        v_qty_received,
      'full_boxes_received', v_full_boxes,
      'partial_box_units',   v_partial_units,
      'partial_box_reason',  v_reason,
      'discrepancy',         v_qty_received <> v_qty_ordered,
      'prev_warehouse_qty',  v_prev_quantity,
      'new_warehouse_qty',   v_new_quantity,
      'unit_cost_after',     v_unit_cost_after
    );

  END LOOP;

  UPDATE purchase_orders
  SET    status         = 'received',
         actual_arrival = COALESCE(actual_arrival, CURRENT_DATE)
  WHERE  id = p_purchase_order_id;

  RETURN jsonb_build_object(
    'po_id',                p_purchase_order_id,
    'po_number',            v_po.po_number,
    'status',               'received',
    'items_received',       v_items_received,
    'items_skipped',        v_items_skipped,
    'total_units_received', v_total_units_received,
    'has_discrepancies',    EXISTS (
                              SELECT 1
                              FROM   jsonb_array_elements(v_item_results) r
                              WHERE  (r->>'discrepancy')::BOOLEAN = TRUE
                            ),
    'items',                v_item_results
  );
END;
$$;

GRANT EXECUTE ON FUNCTION receive_purchase_order(UUID, TEXT, JSONB)
  TO authenticated;
