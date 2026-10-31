-- Fix: receive_purchase_order() omits organization_id from two INSERTs:
--
--   1. item_locations — column default was dropped by 20260418_drop_item_locations_org_default.sql,
--      so inserts write NULL. Rows are invisible through RLS.
--
--   2. inventory_logs — column default is '' (empty string), which fails the FK constraint
--      against organizations (no org has an empty-string id) → FK violation error on receive.
--
-- Fix: pass v_po.organization_id explicitly in both INSERTs.

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
  v_warehouse_space_id    UUID;

  v_received_item         JSONB;
  v_item_id               BIGINT;
  v_qty_received          NUMERIC(10,2);
  v_qty_ordered           NUMERIC(10,2);
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

  -- ── 1. Lock and fetch the PO ───────────────────────────────
  SELECT * INTO v_po
  FROM   purchase_orders
  WHERE  id = p_purchase_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase_order_not_found'
      USING DETAIL = p_purchase_order_id::TEXT;
  END IF;

  -- ── 2. Validate status ────────────────────────────────────
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

  -- ── 3. Validate p_received_items is not empty ─────────────
  IF p_received_items IS NULL OR jsonb_array_length(p_received_items) = 0 THEN
    RAISE EXCEPTION 'received_items_empty'
      USING DETAIL = 'p_received_items must contain at least one item.';
  END IF;

  -- ── 4. Resolve the warehouse location ────────────────────
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

  -- ── 5. Process each received item ─────────────────────────
  FOR v_received_item IN SELECT * FROM jsonb_array_elements(p_received_items)
  LOOP

    v_item_id      := (v_received_item->>'item_id')::BIGINT;
    v_qty_received := (v_received_item->>'quantity_received')::NUMERIC(10,2);

    SELECT
      quantity_ordered,
      unit_cost_after,
      unit_price_before
    INTO
      v_qty_ordered,
      v_unit_cost_after,
      v_unit_price_before
    FROM purchase_order_items
    WHERE purchase_order_id = p_purchase_order_id
      AND item_id           = v_item_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'item_not_in_po'
        USING DETAIL = 'Item ' || v_item_id::TEXT ||
                       ' is not in PO ' || p_purchase_order_id::TEXT;
    END IF;

    IF v_qty_received IS NULL THEN
      v_qty_received := v_qty_ordered;
    END IF;

    IF v_qty_received < 0 THEN
      RAISE EXCEPTION 'invalid_quantity_received'
        USING DETAIL = 'quantity_received cannot be negative for item ' ||
                       v_item_id::TEXT;
    END IF;

    IF v_qty_received = 0 THEN
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

    -- ── 5a. Upsert warehouse item_locations ─────────────────
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
        organization_id,
        item_id,
        location_id,
        storage_space_id,
        current_quantity,
        last_updated
      ) VALUES (
        v_po.organization_id,
        v_item_id,
        v_warehouse_location_id,
        NULL,
        v_new_quantity,
        NOW()
      )
      RETURNING id INTO v_item_location_id;

    END IF;

    -- ── 5b. Insert inventory_log ──────────────────────────────
    INSERT INTO inventory_logs (
      organization_id,
      item_id,
      location_id,
      storage_space_id,
      user_id,
      previous_quantity,
      new_quantity,
      quantity_change,
      action_type,
      notes
    ) VALUES (
      v_po.organization_id,
      v_item_id,
      v_warehouse_location_id,
      NULL,
      p_user_id,
      v_prev_quantity,
      v_new_quantity,
      v_qty_received,
      'received',
      'PO received: ' || v_po.po_number ||
        CASE WHEN v_qty_received <> v_qty_ordered
             THEN ' (ordered ' || v_qty_ordered::TEXT ||
                  ', received ' || v_qty_received::TEXT || ')'
             ELSE ''
        END
    );

    -- ── 5c. Insert item_cost_history snapshot ─────────────────
    INSERT INTO item_cost_history (
      organization_id,
      item_id,
      purchase_order_id,
      unit_price_before,
      unit_cost_after,
      effective_date
    ) VALUES (
      v_po.organization_id,
      v_item_id,
      p_purchase_order_id,
      v_unit_price_before,
      v_unit_cost_after,
      COALESCE(v_po.actual_arrival, CURRENT_DATE)
    )
    ON CONFLICT (item_id, purchase_order_id) DO NOTHING;

    -- ── 5d. Update items.current_unit_cost ────────────────────
    UPDATE items
    SET    current_unit_cost = v_unit_cost_after
    WHERE  id = v_item_id;

    UPDATE purchase_order_items
    SET    quantity_received = v_qty_received
    WHERE  purchase_order_id = p_purchase_order_id
      AND  item_id           = v_item_id;

    v_items_received       := v_items_received + 1;
    v_total_units_received := v_total_units_received + v_qty_received;

    v_item_results := v_item_results || jsonb_build_object(
      'item_id',            v_item_id,
      'qty_ordered',        v_qty_ordered,
      'qty_received',       v_qty_received,
      'discrepancy',        v_qty_received <> v_qty_ordered,
      'prev_warehouse_qty', v_prev_quantity,
      'new_warehouse_qty',  v_new_quantity,
      'unit_cost_after',    v_unit_cost_after
    );

  END LOOP;

  -- ── 6. Mark PO as received ────────────────────────────────
  UPDATE purchase_orders
  SET
    status         = 'received',
    actual_arrival = COALESCE(actual_arrival, CURRENT_DATE)
  WHERE id = p_purchase_order_id;

  -- ── 7. Return summary ─────────────────────────────────────
  RETURN jsonb_build_object(
    'po_id',                 p_purchase_order_id,
    'po_number',             v_po.po_number,
    'status',                'received',
    'items_received',        v_items_received,
    'items_skipped',         v_items_skipped,
    'total_units_received',  v_total_units_received,
    'has_discrepancies',     EXISTS (
                               SELECT 1
                               FROM   jsonb_array_elements(v_item_results) r
                               WHERE  (r->>'discrepancy')::BOOLEAN = true
                             ),
    'items',                 v_item_results
  );

END;
$$;

GRANT EXECUTE ON FUNCTION receive_purchase_order(UUID, TEXT, JSONB)
  TO authenticated;
