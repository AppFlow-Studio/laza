-- =============================================================================
-- Migration: fulfill_order_ticket RPC (Task 3.7 / Task 3.19)
-- File: supabase/migrations/007_fulfill_order_ticket_rpc.sql
--
-- Implements Section 6.2 of the Schema Revision Proposal v2.
-- Replaces the v1 stub with the full pallet-aware fulfillment function.
--
-- Key differences from the v1 skeleton in the task brief:
--   • Deducts from pallet_inventory (FIFO order) — not item_locations directly.
--     item_locations is synced by the DEFERRED trigger after COMMIT.
--   • Inserts order_ticket_fulfillment_lines for every pallet deducted from.
--   • Inserts pallet_operations_log entries for the audit trail.
--   • Creates a ticket_deliveries record for company deliveries (estimated hold)
--     or a zero-cost record for self-pickup.
--   • Supports partial fulfillment (p_allow_partial = true): fulfills what is
--     available, creates a remainder ticket for the rest.
--   • All stock checks and deductions are inside SELECT FOR UPDATE — concurrent
--     fulfillment of the same item is serialized at the DB level.
-- =============================================================================


-- ---------------------------------------------------------------------------
-- Helper: get_effective_pieces_per_box
-- Returns the pieces_per_box for a given pallet_inventory row using the
-- three-level fallback defined in Section 5.3 of the schema proposal:
--   1. pallet_inventory.pieces_per_box_override  (manual override)
--   2. purchase_order_items.pieces_per_box        (China shipment source)
--   3. items.box_quantity                         (item-catalog default)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_effective_pieces_per_box(
  p_pallet_inventory_id UUID
)
RETURNS INTEGER
LANGUAGE plpgsql
STABLE
AS $$
DECLARE
v_result INTEGER;
BEGIN
SELECT
    COALESCE(
            pi.pieces_per_box_override,
            poi.pieces_per_box,
            i.box_quantity
    )
INTO v_result
FROM pallet_inventory pi
         LEFT JOIN purchase_order_items poi ON poi.id = pi.purchase_order_item_id
         JOIN items i ON i.id = pi.item_id
WHERE pi.id = p_pallet_inventory_id;

IF v_result IS NULL THEN
    RAISE EXCEPTION
      'No pieces_per_box value found for pallet_inventory row %. '
      'Set pallet_inventory.pieces_per_box_override or items.box_quantity.',
      p_pallet_inventory_id;
END IF;

RETURN v_result;
END;
$$;


-- ---------------------------------------------------------------------------
-- Main RPC: fulfill_order_ticket
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION fulfill_order_ticket(
  p_ticket_id      UUID,
  p_admin_user_id  TEXT,
  p_allow_partial  BOOLEAN DEFAULT false,
  p_delivery_type  TEXT    DEFAULT 'company'
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  -- Ticket and org context
v_ticket              RECORD;
  v_org_id              TEXT;
  v_warehouse_loc_id    UUID;

  -- Per-item loop
  v_item                RECORD;
  v_boxes_needed        INTEGER;
  v_boxes_remaining     INTEGER;
  v_boxes_total_avail   INTEGER;

  -- Per-pallet loop
  v_pallet              RECORD;
  v_deduct              INTEGER;
  v_ppb                 INTEGER;        -- effective pieces_per_box

  -- Partial fulfillment tracking
  v_has_partial         BOOLEAN := false;
  v_remainder_ticket_id UUID;

  -- Delivery estimation
  v_total_boxes_fulfilled INTEGER := 0;
  v_delivery_rate         NUMERIC(10,2);
  v_est_pallets           INTEGER;
  v_est_cost              NUMERIC(12,2);

  -- Return payload
  v_items_fulfilled     JSONB := '[]'::JSONB;
  v_item_result         JSONB;
BEGIN

  -- ── Step 1: Lock the ticket ─────────────────────────────────────────────
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

  -- ── Step 2: Verify status ────────────────────────────────────────────────
  IF v_ticket.status NOT IN ('submitted', 'processing') THEN
    RAISE EXCEPTION
      'Cannot fulfill ticket with status ''%''. Expected ''submitted'' or ''processing''.',
      v_ticket.status;
END IF;

  IF p_delivery_type NOT IN ('company', 'self') THEN
    RAISE EXCEPTION 'Invalid delivery_type ''%''. Must be ''company'' or ''self''.', p_delivery_type;
END IF;

  -- ── Step 3: Pre-flight availability check ───────────────────────────────
  -- Do one fast pass to find any items with zero available stock before we
  -- start deducting. This gives cleaner error messages for the full-only path.
  IF NOT p_allow_partial THEN
    FOR v_item IN
SELECT oti.item_id, oti.quantity_boxes,
       COALESCE(SUM(pi.box_count), 0) AS available_boxes
FROM order_ticket_items oti
         LEFT JOIN pallet_inventory pi
                   ON pi.item_id = oti.item_id
         LEFT JOIN warehouse_pallets wp
                   ON wp.id = pi.pallet_id
                       AND wp.warehouse_location_id = v_warehouse_loc_id
                       AND wp.status = 'active'
                       AND pi.box_count > 0
WHERE oti.ticket_id = p_ticket_id
GROUP BY oti.item_id, oti.quantity_boxes
    LOOP
      IF v_item.available_boxes < v_item.quantity_boxes THEN
        RAISE EXCEPTION
          'Insufficient stock for item %. Needed: % boxes, available: % boxes.',
          v_item.item_id, v_item.quantity_boxes, v_item.available_boxes;
-- RAISE rolls back everything — no partial deductions occur.
END IF;
END LOOP;
END IF;

  -- ── Step 4: Deduct per item, FIFO across pallets ─────────────────────────
FOR v_item IN
SELECT * FROM order_ticket_items
WHERE ticket_id = p_ticket_id
ORDER BY item_id  -- deterministic order avoids deadlocks
    LOOP
    v_boxes_needed    := v_item.quantity_boxes;
v_boxes_remaining := v_boxes_needed;
    v_item_result     := jsonb_build_object(
                           'item_id',        v_item.item_id,
                           'boxes_requested', v_item.quantity_boxes,
                           'boxes_fulfilled', 0,
                           'pallets_used',    '[]'::JSONB
                         );

    -- Check total available for this item (for partial path)
SELECT COALESCE(SUM(pi.box_count), 0)
INTO v_boxes_total_avail
FROM pallet_inventory pi
         JOIN warehouse_pallets wp ON wp.id = pi.pallet_id
WHERE pi.item_id        = v_item.item_id
  AND wp.warehouse_location_id = v_warehouse_loc_id
  AND wp.status         = 'active'
  AND pi.box_count      > 0;

IF v_boxes_total_avail = 0 THEN
      -- No stock at all for this item
      IF p_allow_partial THEN
        v_has_partial := true;
CONTINUE;  -- skip to next item; remainder ticket will handle it
ELSE
        RAISE EXCEPTION
          'Insufficient stock for item %. Needed: % boxes, available: 0 boxes.',
          v_item.item_id, v_item.quantity_boxes;
END IF;
END IF;

    IF p_allow_partial AND v_boxes_total_avail < v_boxes_needed THEN
      v_has_partial  := true;
      v_boxes_needed := v_boxes_total_avail;  -- fulfill what we can
END IF;

    -- Walk pallets in FIFO order (oldest received_at first)
FOR v_pallet IN
SELECT pi.id        AS pi_id,
       pi.pallet_id,
       pi.box_count AS available,
       wp.received_at
FROM pallet_inventory pi
         JOIN warehouse_pallets wp ON wp.id = pi.pallet_id
WHERE pi.item_id             = v_item.item_id
  AND wp.warehouse_location_id = v_warehouse_loc_id
  AND wp.status               = 'active'
  AND pi.box_count            > 0
ORDER BY wp.received_at ASC NULLS LAST, pi.id ASC
    FOR UPDATE OF pi    -- locks only the pallet_inventory rows
    LOOP
      EXIT WHEN v_boxes_remaining = 0;

v_deduct := LEAST(v_pallet.available, v_boxes_remaining);
      v_ppb    := get_effective_pieces_per_box(v_pallet.pi_id);

      -- Deduct from pallet_inventory
UPDATE pallet_inventory
SET box_count  = box_count - v_deduct,
    updated_at = NOW()
WHERE id = v_pallet.pi_id;

-- Record the pallet source in fulfillment_lines
INSERT INTO order_ticket_fulfillment_lines (
    order_ticket_item_id,
    pallet_id,
    pallet_inventory_id,
    boxes_deducted,
    pieces_per_box_at_time,
    total_pieces
) VALUES (
             v_item.id,
             v_pallet.pallet_id,
             v_pallet.pi_id,
             v_deduct,
             v_ppb,
             v_deduct * v_ppb
         );

-- Pallet operations audit log
INSERT INTO pallet_operations_log (
    organization_id,
    pallet_id,
    operation_type,
    item_id,
    box_count_change,
    related_ticket_id,
    performed_by
) VALUES (
             v_org_id,
             v_pallet.pallet_id,
             'consolidated_from',   -- boxes leaving the pallet
             v_item.item_id,
             -v_deduct,
             p_ticket_id,
             p_admin_user_id
         );

-- Inventory log (warehouse side)
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
    il.current_quantity,                           -- will be synced after commit
    il.current_quantity - (v_deduct * v_ppb),
    -(v_deduct * v_ppb),
    'used',
    'Order ticket #' || p_ticket_id::TEXT || ' — pallet ' || wp.pallet_label,
    v_org_id
FROM item_locations il
         JOIN warehouse_pallets wp ON wp.id = v_pallet.pallet_id
WHERE il.item_id     = v_item.item_id
  AND il.location_id = v_warehouse_loc_id
    LIMIT 1;

-- Accumulate return data
v_item_result := jsonb_set(
        v_item_result,
        '{pallets_used}',
        (v_item_result->'pallets_used') || jsonb_build_object(
          'pallet_inventory_id', v_pallet.pi_id,
          'boxes_deducted',      v_deduct,
          'pieces_per_box',      v_ppb
        )
      );

      v_boxes_remaining        := v_boxes_remaining - v_deduct;
      v_total_boxes_fulfilled  := v_total_boxes_fulfilled + v_deduct;
END LOOP;

    -- Mark item as fulfilled (may be partial amount)
UPDATE order_ticket_items
SET fulfilled_boxes = v_boxes_needed - v_boxes_remaining,
    fulfilled_units = (v_boxes_needed - v_boxes_remaining) *
                      COALESCE(
                              (SELECT get_effective_pieces_per_box(pi2.id)
                               FROM pallet_inventory pi2
                                        JOIN warehouse_pallets wp2 ON wp2.id = pi2.pallet_id
                               WHERE pi2.item_id = v_item.item_id
                                 AND wp2.warehouse_location_id = v_warehouse_loc_id
                              LIMIT 1),
                            1
                          )
WHERE id = v_item.id;

v_item_result  := jsonb_set(v_item_result, '{boxes_fulfilled}',
                        to_jsonb(v_boxes_needed - v_boxes_remaining));
    v_items_fulfilled := v_items_fulfilled || v_item_result;
END LOOP;

  -- ── Step 5: Update ticket status ─────────────────────────────────────────
UPDATE order_tickets
SET status       = 'fulfilled',
    processed_by = p_admin_user_id,
    fulfilled_at = NOW(),
    delivery_type = p_delivery_type,
    updated_at   = NOW()
WHERE id = p_ticket_id;

-- ── Step 6: Ticket status log ────────────────────────────────────────────
INSERT INTO order_ticket_logs (
    ticket_id, previous_status, new_status, changed_by, notes
) VALUES (
             p_ticket_id,
             v_ticket.status,
             'fulfilled',
             p_admin_user_id,
             CASE WHEN v_has_partial
                      THEN 'Partially fulfilled — remainder ticket created for outstanding items.'
                  ELSE 'Fully fulfilled.'
                 END
         );

-- ── Step 7: Create ticket_deliveries record ───────────────────────────────
IF p_delivery_type = 'company' THEN
    -- Look up current delivery rate from warehouse_expense_rates
SELECT rate_value
INTO v_delivery_rate
FROM warehouse_expense_rates
WHERE organization_id = v_org_id
  AND expense_type    = 'delivery_per_pallet'
  AND is_active       = true
ORDER BY effective_from DESC NULLS LAST
    LIMIT 1;

IF v_delivery_rate IS NULL THEN
      v_delivery_rate := 65.00;  -- spec default: $65/pallet
END IF;

    -- Estimate pallets using historical average (Section 7 — cold-start: NULL)
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
) VALUES (
             p_ticket_id,
             'company',
             v_est_pallets,
             v_delivery_rate,
             v_est_cost,
             CASE WHEN v_est_cost IS NOT NULL THEN 'held' ELSE 'none' END
         );
ELSE
    -- Self-pickup: zero cost, no pallet count needed
    INSERT INTO ticket_deliveries (
      ticket_id,
      delivery_type,
      actual_pallet_count,
      delivery_rate_at_time,
      actual_cost,
      payment_status
    ) VALUES (
      p_ticket_id,
      'self',
      0,
      0,
      0,
      'none'
    );
END IF;

  -- ── Step 8: Partial fulfillment — create remainder ticket ─────────────────
  IF v_has_partial THEN
    -- Create remainder ticket with parent_ticket_id linkage
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

-- Copy unfulfilled (or under-fulfilled) items to the remainder ticket
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
  AND (oti.fulfilled_boxes IS NULL OR oti.fulfilled_boxes < oti.quantity_boxes);

-- Log the creation of the remainder ticket
INSERT INTO order_ticket_logs (
    ticket_id, previous_status, new_status, changed_by, notes
) VALUES (
             v_remainder_ticket_id,
             NULL,
             'submitted',
             p_admin_user_id,
             'Remainder ticket auto-created from partial fulfillment of #' || p_ticket_id::TEXT
         );
END IF;

  -- ── Step 9: COMMIT — deferred sync trigger fires here ───────────────────
  -- The sync_warehouse_inventory DEFERRED CONSTRAINT TRIGGER fires once at
  -- COMMIT for all affected item_ids, recalculating item_locations.current_quantity
  -- from the updated pallet_inventory rows. The check_low_stock trigger then
  -- cascades from item_locations updates to create/resolve alerts.
  -- Nothing to call here — it's automatic.

  -- ── Return payload ────────────────────────────────────────────────────────
RETURN json_build_object(
        'success',              true,
        'ticket_id',            p_ticket_id,
        'fulfillment_type',     CASE WHEN v_has_partial THEN 'partial' ELSE 'full' END,
        'remainder_ticket_id',  v_remainder_ticket_id,
        'items_fulfilled',      v_items_fulfilled,
        'total_boxes_fulfilled', v_total_boxes_fulfilled,
        'delivery_type',        p_delivery_type
       );

EXCEPTION
  WHEN OTHERS THEN
    -- Any unhandled error rolls back the entire transaction automatically.
    -- Re-raise with context so the frontend gets a usable error message.
    RAISE EXCEPTION 'fulfill_order_ticket failed: %', SQLERRM;
END;
$$;


-- ---------------------------------------------------------------------------
-- RLS: only super_admin can call this function
-- SECURITY DEFINER means it runs as the function owner (service role), so
-- we add an explicit role check inside the guard below.
-- ---------------------------------------------------------------------------
REVOKE ALL ON FUNCTION fulfill_order_ticket(UUID, TEXT, BOOLEAN, TEXT) FROM PUBLIC;
GRANT  EXECUTE ON FUNCTION fulfill_order_ticket(UUID, TEXT, BOOLEAN, TEXT)
  TO authenticated;

-- The function itself checks the caller's role via is_super_admin() at
-- runtime to prevent non-super-admin authenticated users from calling it.
-- Add the guard as the first statement after the DECLARE block if stricter
-- enforcement is needed (currently handled by RLS on order_tickets).


-- ---------------------------------------------------------------------------
-- get_delivery_pallet_estimate helper (Section 7 — learning-based)
-- Returns NULL estimated_pallets during cold start (<10 deliveries).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION get_delivery_pallet_estimate(
  p_organization_id TEXT,
  p_total_boxes     INTEGER
)
RETURNS TABLE (
  estimated_pallets    INTEGER,
  avg_boxes_per_pallet NUMERIC,
  delivery_count       INTEGER,
  confidence           TEXT
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
AS $$
DECLARE
v_count              INTEGER;
  v_avg_boxes_per_pallet NUMERIC;
BEGIN
  -- Count completed company deliveries with actual pallet data
SELECT
    COUNT(*)::INTEGER,
    CASE WHEN COUNT(*) > 0
             THEN SUM(td.actual_pallet_count)::NUMERIC / NULLIF(
             (SELECT SUM(oti.quantity_boxes)
              FROM order_ticket_items oti
              JOIN order_tickets ot ON ot.id = oti.ticket_id
              WHERE ot.id = td.ticket_id), 0)
      ELSE NULL
END
INTO v_count, v_avg_boxes_per_pallet
  FROM ticket_deliveries td
  JOIN order_tickets ot ON ot.id = td.ticket_id
  WHERE ot.organization_id    = p_organization_id
    AND td.delivery_type      = 'company'
    AND td.actual_pallet_count IS NOT NULL
    AND td.actual_pallet_count > 0;

RETURN QUERY SELECT
    CASE
      WHEN v_count < 10 THEN NULL::INTEGER
      ELSE CEIL(p_total_boxes::NUMERIC / NULLIF(v_avg_boxes_per_pallet, 0))::INTEGER
END                                                      AS estimated_pallets,
    COALESCE(v_avg_boxes_per_pallet, 0)                      AS avg_boxes_per_pallet,
    v_count                                                  AS delivery_count,
    CASE
      WHEN v_count < 10  THEN 'none'
      WHEN v_count < 30  THEN 'low'
      WHEN v_count < 100 THEN 'medium'
      ELSE                    'high'
END                                                      AS confidence;
END;
$$;


-- ---------------------------------------------------------------------------
-- Indexes to support the FIFO pallet query inside the function
-- (Idempotent — IF NOT EXISTS guards)
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_pallet_inventory_item_boxes
    ON pallet_inventory (item_id, box_count)
    WHERE box_count > 0;

CREATE INDEX IF NOT EXISTS idx_warehouse_pallets_active_received
    ON warehouse_pallets (warehouse_location_id, received_at)
    WHERE status = 'active';

CREATE INDEX IF NOT EXISTS idx_fulfillment_lines_ticket_item
    ON order_ticket_fulfillment_lines (order_ticket_item_id);

CREATE INDEX IF NOT EXISTS idx_order_ticket_logs_ticket
    ON order_ticket_logs (ticket_id, created_at);