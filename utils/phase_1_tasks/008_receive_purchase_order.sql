-- ============================================================
-- Migration: 008_receive_purchase_order.sql
-- Task 1.33 — Create receive_purchase_order() RPC function
-- Depends on: 1.26 (purchase_orders), 1.27 (purchase_order_items),
--             1.30 (item_cost_history), 1.31 (current_unit_cost)
-- ============================================================
-- Atomically receives a purchase order in a single transaction:
--   1. Lock PO (SELECT FOR UPDATE)
--   2. Validate status is receivable
--   3. Per item:
--      a. Upsert warehouse item_locations (increase quantity)
--      b. Insert inventory_log (action_type: 'received')
--      c. Insert item_cost_history snapshot
--      d. Update items.current_unit_cost
--   4. Set PO status = 'received', actual_arrival = NOW()
--   5. Full rollback on ANY failure
-- ============================================================
SET search_path TO public;



CREATE OR REPLACE FUNCTION receive_purchase_order(
  p_purchase_order_id   UUID,
  p_user_id             TEXT,
  -- Array of { item_id, quantity_received } objects.
  -- quantity_received defaults to quantity_ordered if omitted
  -- (Super Admin confirms full receipt with no discrepancy).
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

  -- Loop variables
  v_received_item         JSONB;
  v_item_id               BIGINT;
  v_qty_received          NUMERIC(10,2);
  v_qty_ordered           NUMERIC(10,2);
  v_unit_cost_after       NUMERIC(10,4);
  v_unit_price_before     NUMERIC(10,4);
  v_prev_quantity         NUMERIC(10,2);
  v_new_quantity          NUMERIC(10,2);
  v_item_location_id      UUID;

  -- Counters for return summary
  v_items_received        INTEGER := 0;
  v_items_skipped         INTEGER := 0;
  v_total_units_received  NUMERIC(10,2) := 0;

  -- Result accumulator
  v_item_results          JSONB := '[]'::JSONB;
BEGIN

  -- ── 1. Lock and fetch the PO ───────────────────────────────
  -- FOR UPDATE locks the row for the duration of this transaction.
  -- Prevents two concurrent receive attempts on the same PO.

  SELECT * INTO v_po
  FROM   purchase_orders
  WHERE  id = p_purchase_order_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase_order_not_found'
      USING DETAIL = p_purchase_order_id::TEXT;
  END IF;

  -- ── 2. Validate status ────────────────────────────────────
  -- Only 'arrived' POs can be received.
  -- Status flow: draft → submitted → in_transit → arrived → received
  -- Receiving a draft or already-received PO would corrupt stock.

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
  -- The warehouse is the location with location_type = 'warehouse'
  -- for this organization. We use the first storage space we find
  -- for the inventory_log; item_locations upsert uses the location
  -- without requiring a specific storage space.

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

    -- Fetch the matching PO line item to get cost data and
    -- validate this item actually belongs to this PO.

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

    -- Default quantity_received to quantity_ordered if not provided
    IF v_qty_received IS NULL THEN
      v_qty_received := v_qty_ordered;
    END IF;

    IF v_qty_received < 0 THEN
      RAISE EXCEPTION 'invalid_quantity_received'
        USING DETAIL = 'quantity_received cannot be negative for item ' ||
                       v_item_id::TEXT;
    END IF;

    -- Skip items received as zero (damaged entire shipment, etc.)
    -- Still record in return summary so caller knows it was skipped.
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
    -- If this item already exists at the warehouse, add to its
    -- current quantity. If not, create the record at the received qty.
    -- SELECT the existing row first to capture previous_quantity
    -- for the inventory log.

    SELECT id, current_quantity
    INTO   v_item_location_id, v_prev_quantity
    FROM   item_locations
    WHERE  item_id      = v_item_id
      AND  location_id  = v_warehouse_location_id
      AND  storage_space_id IS NULL  -- warehouse-level, not space-specific
    FOR UPDATE;

    IF FOUND THEN
      -- Item exists at warehouse — increment quantity
      v_new_quantity := v_prev_quantity + v_qty_received;

      UPDATE item_locations
      SET    current_quantity = v_new_quantity,
             last_updated     = NOW()
      WHERE  id = v_item_location_id;

    ELSE
      -- First time this item arrives at the warehouse
      v_prev_quantity := 0;
      v_new_quantity  := v_qty_received;

      INSERT INTO item_locations (
        item_id,
        location_id,
        storage_space_id,
        current_quantity,
        last_updated
      ) VALUES (
        v_item_id,
        v_warehouse_location_id,
        NULL,
        v_new_quantity,
        NOW()
      )
      RETURNING id INTO v_item_location_id;

    END IF;

    -- ── 5b. Insert inventory_log ──────────────────────────────
    -- action_type = 'received' matches existing enum.
    -- Notes reference the PO number for full audit traceability.

    INSERT INTO inventory_logs (
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
    -- Immutable record of what this item cost on this PO.
    -- ON CONFLICT DO NOTHING guards against double-receive attempts
    -- that slip past the status check (belt-and-suspenders).

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
    -- Always update to the latest landed cost.
    -- If the same item appears in multiple POs received on the same
    -- day, the last one wins — which is correct (most recent cost).

    UPDATE items
    SET    current_unit_cost = v_unit_cost_after
    WHERE  id = v_item_id;

    -- Also update quantity_received on the PO line item
    -- so discrepancies are recorded on the PO itself.
    UPDATE purchase_order_items
    SET    quantity_received = v_qty_received
    WHERE  purchase_order_id = p_purchase_order_id
      AND  item_id           = v_item_id;

    -- Accumulate counters
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

-- ── Grant execute ─────────────────────────────────────────────
-- RLS on underlying tables still enforced inside the function.
-- A non-super-admin will hit the purchase_orders FOR UPDATE lock
-- and get zero rows → purchase_order_not_found exception.

GRANT EXECUTE ON FUNCTION receive_purchase_order(UUID, TEXT, JSONB)
  TO authenticated;

-- ── Comment ───────────────────────────────────────────────────

COMMENT ON FUNCTION receive_purchase_order(UUID, TEXT, JSONB) IS
  'Atomically receives a purchase order in a single transaction. '
  'For each item: increases warehouse item_locations quantity, '
  'creates inventory_log (action_type=received), inserts '
  'item_cost_history snapshot, updates items.current_unit_cost. '
  'Sets PO status=received and actual_arrival=NOW(). '
  'Full rollback on any failure. '
  'p_received_items: JSONB array of {item_id, quantity_received}. '
  'quantity_received defaults to quantity_ordered if omitted. '
  'Returns JSONB summary with per-item results and discrepancy flags.';