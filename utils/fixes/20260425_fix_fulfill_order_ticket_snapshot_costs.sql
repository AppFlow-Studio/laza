-- Fix: fulfill_order_ticket does not snapshot unit_cost_at_time, line_total,
-- or line_cost into order_ticket_items at fulfillment time.
-- Per 006_cost_columns.sql / b1_3_oti_price_columns.sql:
--   unit_cost_at_time = items.current_unit_cost at moment of fulfillment
--   line_total        = fulfilled_units × unit_price_at_time  (store-facing)
--   line_cost         = fulfilled_units × unit_cost_at_time   (super-admin margin)
--
-- Replace the UPDATE order_ticket_items block (step 4 inner loop) to also
-- write these columns. Applied after all FIFO deduction loops complete so
-- fulfilled_boxes / fulfilled_units are already set.

DROP FUNCTION IF EXISTS public.fulfill_order_ticket(uuid, text, boolean, text);

CREATE OR REPLACE FUNCTION public.fulfill_order_ticket(
  p_ticket_id     UUID,
  p_admin_user_id TEXT,
  p_allow_partial BOOLEAN,
  p_delivery_type TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
DECLARE
  v_ticket                RECORD;
  v_org_id                TEXT;
  v_warehouse_loc_id      UUID;
  v_item                  RECORD;
  v_boxes_needed          INTEGER;
  v_boxes_remaining       INTEGER;
  v_boxes_total_avail     INTEGER;
  v_pallet                RECORD;
  v_deduct                INTEGER;
  v_ppb                   INTEGER;
  v_pieces_deducted       INTEGER;
  v_has_partial           BOOLEAN := false;
  v_remainder_ticket_id   UUID;
  v_total_boxes_fulfilled INTEGER := 0;
  v_delivery_rate         NUMERIC(10,2);
  v_est_pallets           INTEGER;
  v_est_cost              NUMERIC(12,2);
  v_items_fulfilled       JSONB := '[]'::JSONB;
  v_item_result           JSONB;
  v_unit_cost             NUMERIC(10,4);
  v_unit_price            NUMERIC;
BEGIN

  -- ── 0. Permission check ──────────────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_admin_user_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: only super_admin can fulfill order tickets';
  END IF;

  -- ── 1. Lock the ticket ───────────────────────────────────────────────────────
  SELECT ot.*, l.organization_id AS org_id_from_loc
  INTO v_ticket
  FROM order_tickets ot
  JOIN locations l ON l.id = ot.warehouse_location_id
  WHERE ot.id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket % not found.', p_ticket_id;
  END IF;

  v_org_id           := v_ticket.organization_id;
  v_warehouse_loc_id := v_ticket.warehouse_location_id;

  -- ── 2. Verify status ─────────────────────────────────────────────────────────
  IF v_ticket.status NOT IN ('submitted', 'processing') THEN
    RAISE EXCEPTION
      'Cannot fulfill ticket with status "%". Expected "submitted" or "processing".',
      v_ticket.status;
  END IF;

  IF p_delivery_type NOT IN ('company', 'self') THEN
    RAISE EXCEPTION
      'Invalid delivery_type "%". Must be "company" or "self".',
      p_delivery_type;
  END IF;

  -- ── 3. Pre-flight availability check (full-only path) ────────────────────────
  IF NOT p_allow_partial THEN
    FOR v_item IN
      SELECT
        oti.item_id,
        oti.quantity_boxes,
        COALESCE(SUM(pi.box_count), 0) AS available_boxes
      FROM order_ticket_items oti
      INNER JOIN warehouse_pallets wp
        ON  wp.warehouse_location_id = v_warehouse_loc_id
        AND wp.status = 'active'
      INNER JOIN pallet_inventory pi
        ON  pi.pallet_id = wp.id
        AND pi.item_id   = oti.item_id
        AND pi.box_count > 0
      WHERE oti.ticket_id = p_ticket_id
      GROUP BY oti.item_id, oti.quantity_boxes
    LOOP
      IF v_item.available_boxes < v_item.quantity_boxes THEN
        RAISE EXCEPTION
          'Insufficient stock for item %. Needed: % boxes, available: % boxes.',
          v_item.item_id, v_item.quantity_boxes, v_item.available_boxes;
      END IF;
    END LOOP;
  END IF;

  -- ── 4. FIFO deduction per item across pallets ────────────────────────────────
  FOR v_item IN
    SELECT *
    FROM order_ticket_items
    WHERE ticket_id = p_ticket_id
    ORDER BY item_id
  LOOP
    v_boxes_needed    := v_item.quantity_boxes;
    v_boxes_remaining := v_boxes_needed;
    v_pieces_deducted := 0;

    v_item_result := jsonb_build_object(
      'item_id',        v_item.item_id,
      'boxes_requested', v_item.quantity_boxes,
      'boxes_fulfilled', 0,
      'pallets_used',   '[]'::JSONB
    );

    SELECT COALESCE(SUM(pi.box_count), 0)
    INTO v_boxes_total_avail
    FROM pallet_inventory pi
    JOIN warehouse_pallets wp ON wp.id = pi.pallet_id
    WHERE pi.item_id = v_item.item_id
      AND wp.warehouse_location_id = v_warehouse_loc_id
      AND wp.status = 'active'
      AND pi.box_count > 0;

    IF v_boxes_total_avail = 0 THEN
      IF p_allow_partial THEN
        v_has_partial := true;
        CONTINUE;
      ELSE
        RAISE EXCEPTION
          'Insufficient stock for item %. Needed: % boxes, available: 0 boxes.',
          v_item.item_id, v_item.quantity_boxes;
      END IF;
    END IF;

    IF p_allow_partial AND v_boxes_total_avail < v_boxes_needed THEN
      v_has_partial     := true;
      v_boxes_needed    := v_boxes_total_avail;
      v_boxes_remaining := v_boxes_needed;
    END IF;

    FOR v_pallet IN
      SELECT
        pi.id           AS pi_id,
        pi.pallet_id,
        pi.box_count    AS available,
        wp.received_at
      FROM pallet_inventory pi
      JOIN warehouse_pallets wp ON wp.id = pi.pallet_id
      WHERE pi.item_id = v_item.item_id
        AND wp.warehouse_location_id = v_warehouse_loc_id
        AND wp.status = 'active'
        AND pi.box_count > 0
      ORDER BY wp.received_at ASC NULLS LAST, pi.id ASC
      FOR UPDATE OF pi
    LOOP
      EXIT WHEN v_boxes_remaining = 0;

      v_deduct := LEAST(v_pallet.available, v_boxes_remaining);
      v_ppb    := get_effective_pieces_per_box(v_pallet.pi_id);

      UPDATE pallet_inventory
      SET
        box_count  = box_count - v_deduct,
        updated_at = NOW()
      WHERE id = v_pallet.pi_id;

      INSERT INTO order_ticket_fulfillment_lines (
        order_ticket_item_id,
        pallet_id,
        pallet_inventory_id,
        boxes_deducted,
        pieces_per_box_at_time,
        total_pieces
      )
      VALUES (
        v_item.id,
        v_pallet.pallet_id,
        v_pallet.pi_id,
        v_deduct,
        v_ppb,
        v_deduct * v_ppb
      );

      INSERT INTO pallet_operations_log (
        organization_id,
        pallet_id,
        operation_type,
        item_id,
        box_count_change,
        related_ticket_id,
        performed_by
      )
      VALUES (
        v_org_id,
        v_pallet.pallet_id,
        'consolidated_from',
        v_item.item_id,
        -v_deduct,
        p_ticket_id,
        p_admin_user_id
      );

      v_item_result := jsonb_set(
        v_item_result,
        '{pallets_used}',
        (v_item_result->'pallets_used') || jsonb_build_object(
          'pallet_inventory_id', v_pallet.pi_id,
          'boxes_deducted',      v_deduct,
          'pieces_per_box',      v_ppb
        )
      );

      v_pieces_deducted       := v_pieces_deducted + (v_deduct * v_ppb);
      v_boxes_remaining       := v_boxes_remaining - v_deduct;
      v_total_boxes_fulfilled := v_total_boxes_fulfilled + v_deduct;
    END LOOP;

    UPDATE item_locations
    SET current_quantity = GREATEST(0, current_quantity - v_pieces_deducted)
    WHERE item_id    = v_item.item_id
      AND location_id = v_warehouse_loc_id;

    INSERT INTO inventory_logs (
      item_id,
      location_id,
      user_id,
      previous_quantity,
      new_quantity,
      quantity_change,
      action_type,
      notes,
      organization_id
    )
    SELECT
      v_item.item_id,
      v_warehouse_loc_id,
      p_admin_user_id,
      il.current_quantity + v_pieces_deducted,
      il.current_quantity,
      -v_pieces_deducted,
      'used',
      'Order ticket #' || p_ticket_id::TEXT,
      v_org_id
    FROM item_locations il
    WHERE il.item_id    = v_item.item_id
      AND il.location_id = v_warehouse_loc_id;

    -- Snapshot unit_cost_at_time from items.current_unit_cost and compute
    -- line_cost / line_total so margin analysis works without live lookups.
    SELECT current_unit_cost INTO v_unit_cost
    FROM items WHERE id = v_item.item_id;

    SELECT unit_price_at_time INTO v_unit_price
    FROM order_ticket_items WHERE id = v_item.id;

    UPDATE order_ticket_items
    SET
      fulfilled_boxes    = v_boxes_needed - v_boxes_remaining,
      fulfilled_units    = v_pieces_deducted,
      unit_cost_at_time  = v_unit_cost,
      line_cost          = CASE
                             WHEN v_unit_cost IS NOT NULL
                             THEN v_pieces_deducted * v_unit_cost
                             ELSE NULL
                           END,
      line_total         = CASE
                             WHEN v_unit_price IS NOT NULL
                             THEN v_pieces_deducted * v_unit_price
                             ELSE NULL
                           END
    WHERE id = v_item.id;

    v_item_result := jsonb_set(
      v_item_result,
      '{boxes_fulfilled}',
      to_jsonb(v_boxes_needed - v_boxes_remaining)
    );

    v_items_fulfilled := v_items_fulfilled || v_item_result;
  END LOOP;

  -- ── 5. Update ticket status ──────────────────────────────────────────────────
  UPDATE order_tickets
  SET
    status        = 'fulfilled',
    processed_by  = p_admin_user_id,
    fulfilled_at  = NOW(),
    delivery_type = p_delivery_type,
    updated_at    = NOW()
  WHERE id = p_ticket_id;

  INSERT INTO order_ticket_logs (
    ticket_id,
    previous_status,
    new_status,
    changed_by,
    notes
  )
  VALUES (
    p_ticket_id,
    v_ticket.status,
    'fulfilled',
    p_admin_user_id,
    CASE
      WHEN v_has_partial
        THEN 'Partially fulfilled — remainder ticket created for outstanding items.'
      ELSE 'Fully fulfilled.'
    END
  );

  -- ── 6. Create delivery record ────────────────────────────────────────────────
  IF p_delivery_type = 'company' THEN

    SELECT default_rate
    INTO v_delivery_rate
    FROM warehouse_expense_rates
    WHERE organization_id = v_org_id
      AND expense_type = 'pallet_delivery'
    LIMIT 1;

    IF v_delivery_rate IS NULL THEN
      v_delivery_rate := 65.00;
    END IF;

    SELECT estimated_pallets
    INTO v_est_pallets
    FROM get_delivery_pallet_estimate(v_org_id, v_total_boxes_fulfilled);

    v_est_cost := CASE
      WHEN v_est_pallets IS NOT NULL THEN v_est_pallets * v_delivery_rate
      ELSE NULL
    END;

    INSERT INTO ticket_deliveries (
      ticket_id,
      delivery_type,
      estimated_pallet_count,
      delivery_rate_at_time,
      estimated_cost,
      payment_status
    )
    VALUES (
      p_ticket_id,
      'company',
      v_est_pallets,
      v_delivery_rate,
      v_est_cost,
      CASE WHEN v_est_cost IS NOT NULL THEN 'held' ELSE 'none' END
    );
  ELSE
    INSERT INTO ticket_deliveries (
      ticket_id,
      delivery_type,
      actual_pallet_count,
      delivery_rate_at_time,
      actual_cost,
      payment_status
    )
    VALUES (
      p_ticket_id,
      'self',
      0,
      0,
      0,
      'none'
    );
  END IF;

  -- ── 7. Create remainder ticket if partial ────────────────────────────────────
  IF v_has_partial THEN
    INSERT INTO order_tickets (
      organization_id,
      requesting_location_id,
      warehouse_location_id,
      status,
      requested_by,
      parent_ticket_id,
      notes,
      submitted_at
    )
    SELECT
      v_org_id,
      requesting_location_id,
      warehouse_location_id,
      'submitted',
      requested_by,
      p_ticket_id,
      'Auto-created remainder from partial fulfillment of ticket #' || p_ticket_id::TEXT,
      NOW()
    FROM order_tickets
    WHERE id = p_ticket_id
    RETURNING id INTO v_remainder_ticket_id;

    INSERT INTO order_ticket_items (
      ticket_id,
      item_id,
      quantity_boxes,
      quantity_units
    )
    SELECT
      v_remainder_ticket_id,
      oti.item_id,
      oti.quantity_boxes - COALESCE(oti.fulfilled_boxes, 0),
      oti.quantity_units - COALESCE(oti.fulfilled_units, 0)
    FROM order_ticket_items oti
    WHERE oti.ticket_id = p_ticket_id
      AND (
        oti.fulfilled_boxes IS NULL
        OR oti.fulfilled_boxes < oti.quantity_boxes
      );

    INSERT INTO order_ticket_logs (
      ticket_id,
      previous_status,
      new_status,
      changed_by,
      notes
    )
    VALUES (
      v_remainder_ticket_id,
      NULL,
      'submitted',
      p_admin_user_id,
      'Remainder ticket auto-created from partial fulfillment of #' || p_ticket_id::TEXT
    );
  END IF;

  RETURN json_build_object(
    'success',               true,
    'ticket_id',             p_ticket_id,
    'fulfillment_type',      CASE WHEN v_has_partial THEN 'partial' ELSE 'full' END,
    'remainder_ticket_id',   v_remainder_ticket_id,
    'items_fulfilled',       v_items_fulfilled,
    'total_boxes_fulfilled', v_total_boxes_fulfilled,
    'delivery_type',         p_delivery_type
  );

EXCEPTION
  WHEN OTHERS THEN
    RAISE EXCEPTION 'fulfill_order_ticket failed: %', SQLERRM;
END;
$function$;

REVOKE ALL ON FUNCTION public.fulfill_order_ticket(UUID, TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fulfill_order_ticket(UUID, TEXT, BOOLEAN, TEXT)
  TO authenticated;
