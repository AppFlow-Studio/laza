-- Catch-up migration: bring production (egvvoomdtysbpnstlram) schema in line with dev (tgcfddsianjssvdksnbu).
-- Generated from live catalogs on 2026-10-31. Additive only: nothing that exists only on prod is dropped.
BEGIN;
SET LOCAL check_function_bodies = off;

-- 1. New tables
CREATE TABLE IF NOT EXISTS public."inventory_update_requests" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "org_id" text NOT NULL,
  "location_id" uuid NOT NULL,
  "storage_space_id" uuid,
  "item_id" bigint NOT NULL,
  "requested_by" text NOT NULL,
  "action_type" text NOT NULL,
  "new_quantity" numeric NOT NULL,
  "previous_quantity" numeric DEFAULT 0 NOT NULL,
  "notes" text,
  "status" text DEFAULT 'pending'::text NOT NULL,
  "reviewed_by" text,
  "reviewed_at" timestamp with time zone,
  "review_note" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."item_cost_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "item_id" bigint NOT NULL,
  "purchase_order_id" uuid NOT NULL,
  "unit_price_before" numeric(10,4) NOT NULL,
  "unit_cost_after" numeric(10,4) NOT NULL,
  "effective_date" date NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."item_warehouse_pricing" (
  "item_id" bigint NOT NULL,
  "warehouse_transfer_price" numeric NOT NULL,
  "currency" text DEFAULT 'USD'::text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_by" text NOT NULL
);
CREATE TABLE IF NOT EXISTS public."order_ticket_fulfillment_lines" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "order_ticket_item_id" uuid NOT NULL,
  "pallet_id" uuid NOT NULL,
  "pallet_inventory_id" uuid NOT NULL,
  "boxes_deducted" integer NOT NULL,
  "pieces_per_box_at_time" integer NOT NULL,
  "total_pieces" integer NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."pallet_inventory" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "pallet_id" uuid NOT NULL,
  "item_id" bigint NOT NULL,
  "purchase_order_item_id" uuid,
  "box_count" integer NOT NULL,
  "initial_box_count" integer NOT NULL,
  "pieces_per_box_override" integer,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."pallet_operations_log" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "pallet_id" uuid NOT NULL,
  "operation_type" text NOT NULL,
  "item_id" bigint,
  "box_count_change" integer,
  "related_pallet_id" uuid,
  "related_ticket_id" uuid,
  "performed_by" text NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."po_item_box_configs" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "purchase_order_item_id" uuid NOT NULL,
  "pieces_per_box" integer NOT NULL,
  "box_count" integer NOT NULL,
  "total_pieces" integer GENERATED ALWAYS AS ((pieces_per_box * box_count)) STORED,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."purchase_order_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "purchase_order_id" uuid NOT NULL,
  "item_id" bigint NOT NULL,
  "quantity_ordered" numeric(10,2) NOT NULL,
  "unit_price_before" numeric(10,4) NOT NULL,
  "total_price_before" numeric(12,2) DEFAULT 0 NOT NULL,
  "pieces_per_carton" integer,
  "cartons" numeric(10,2),
  "cbm" numeric(10,4),
  "cbm_share" numeric(8,6),
  "allocated_office_fee" numeric(12,2) DEFAULT 0 NOT NULL,
  "allocated_shipping_fee" numeric(12,2) DEFAULT 0 NOT NULL,
  "total_cost_after" numeric(12,2) DEFAULT 0 NOT NULL,
  "unit_cost_after" numeric(10,4) DEFAULT 0 NOT NULL,
  "quantity_received" numeric(10,2),
  "pieces_per_box" integer,
  "has_mixed_configs" boolean DEFAULT false NOT NULL,
  "full_boxes_received" integer,
  "partial_box_units" integer DEFAULT 0 NOT NULL,
  "partial_box_reason" text,
  "partial_box_note" text,
  "overage_acknowledged" boolean DEFAULT false NOT NULL
);
CREATE TABLE IF NOT EXISTS public."purchase_orders" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "po_number" text NOT NULL,
  "supplier_name" text,
  "status" text DEFAULT 'draft'::text NOT NULL,
  "order_date" date,
  "expected_arrival" date,
  "actual_arrival" date,
  "subtotal_before" numeric(12,2) DEFAULT 0 NOT NULL,
  "office_fee" numeric(12,2) DEFAULT 0 NOT NULL,
  "shipping_fee" numeric(12,2) DEFAULT 0 NOT NULL,
  "total_cbm" numeric(10,4),
  "total_pallets" integer,
  "notes" text,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "warehouse_location_id" uuid
);
CREATE TABLE IF NOT EXISTS public."store_purchase_items" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "purchase_id" uuid NOT NULL,
  "item_id" bigint NOT NULL,
  "quantity" numeric NOT NULL,
  "unit_cost" numeric NOT NULL,
  "line_total" numeric GENERATED ALWAYS AS ((quantity * unit_cost)) STORED,
  "storage_space_id" uuid
);
CREATE TABLE IF NOT EXISTS public."store_purchases" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "org_id" text NOT NULL,
  "location_id" uuid NOT NULL,
  "purchased_by" text NOT NULL,
  "purchased_at" timestamp with time zone NOT NULL,
  "supplier_name" text,
  "notes" text,
  "total_cost" numeric DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."ticket_deliveries" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "ticket_id" uuid NOT NULL,
  "delivery_type" text NOT NULL,
  "delivered_by" text,
  "estimated_pallet_count" integer,
  "actual_pallet_count" integer,
  "delivery_rate_at_time" numeric(10,2) NOT NULL,
  "estimated_cost" numeric(12,2),
  "actual_cost" numeric(12,2),
  "payment_status" text DEFAULT 'none'::text NOT NULL,
  "dispatched_at" timestamp with time zone,
  "delivered_at" timestamp with time zone,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."user_location_assignments" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "user_id" text NOT NULL,
  "location_id" uuid NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."warehouse_expense_rates" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "expense_type" text NOT NULL,
  "default_rate" numeric(10,2) DEFAULT 0 NOT NULL,
  "rate_unit" text DEFAULT 'per_pallet'::text NOT NULL,
  "is_optional" boolean DEFAULT false NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."warehouse_expenses" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "warehouse_location_id" uuid NOT NULL,
  "purchase_order_id" uuid,
  "expense_type" text NOT NULL,
  "amount" numeric(12,2) DEFAULT 0 NOT NULL,
  "pallet_count" integer,
  "rate_per_pallet" numeric(10,2),
  "expense_date" date NOT NULL,
  "period_start" date,
  "period_end" date,
  "is_self_delivered" boolean,
  "notes" text,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  "title" text
);
CREATE TABLE IF NOT EXISTS public."warehouse_pallets" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "warehouse_location_id" uuid NOT NULL,
  "storage_space_id" uuid,
  "purchase_order_id" uuid,
  "pallet_label" text NOT NULL,
  "status" text DEFAULT 'active'::text NOT NULL,
  "received_at" timestamp with time zone,
  "retired_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."warehouse_rent_snapshots" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "organization_id" text NOT NULL,
  "snapshot_date" date NOT NULL,
  "active_pallet_count" integer NOT NULL,
  "rate_per_pallet" numeric(10,2) NOT NULL,
  "total_cost" numeric(12,2) NOT NULL,
  "notes" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
CREATE TABLE IF NOT EXISTS public."warehouse_transfer_price_history" (
  "id" uuid DEFAULT gen_random_uuid() NOT NULL,
  "item_id" bigint NOT NULL,
  "previous_price" numeric,
  "new_price" numeric NOT NULL,
  "change_source" text NOT NULL,
  "batch_id" uuid,
  "change_reason" text,
  "changed_by" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 2. New columns on existing tables
ALTER TABLE public."daily_summary_preferences" ADD COLUMN IF NOT EXISTS "location_id" uuid;
ALTER TABLE public."items" ADD COLUMN IF NOT EXISTS "is_warehouse_item" boolean DEFAULT false NOT NULL;
ALTER TABLE public."items" ADD COLUMN IF NOT EXISTS "short_label" text;
ALTER TABLE public."locations" ADD COLUMN IF NOT EXISTS "latitude" numeric(10,7);
ALTER TABLE public."locations" ADD COLUMN IF NOT EXISTS "longitude" numeric(10,7);
ALTER TABLE public."notification_preferences" ADD COLUMN IF NOT EXISTS "location_id" uuid;
ALTER TABLE public."order_ticket_items" ADD COLUMN IF NOT EXISTS "line_cost" numeric;
ALTER TABLE public."order_ticket_items" ADD COLUMN IF NOT EXISTS "price_locked_at" timestamp with time zone;
ALTER TABLE public."order_ticket_items" ADD COLUMN IF NOT EXISTS "unit_price_at_time" numeric;
ALTER TABLE public."order_tickets" ADD COLUMN IF NOT EXISTS "delivery_type" text;
ALTER TABLE public."order_tickets" ADD COLUMN IF NOT EXISTS "has_discrepancy" boolean DEFAULT false NOT NULL;
ALTER TABLE public."order_tickets" ADD COLUMN IF NOT EXISTS "title" text;

-- 3. Functions (new + updated to dev version)
-- NEW: approve_inventory_update_request(p_request_id uuid, p_reviewed_
CREATE OR REPLACE FUNCTION public.approve_inventory_update_request(p_request_id uuid, p_reviewed_by text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_req      RECORD;
  v_prev_qty double precision;
BEGIN
  SELECT * INTO v_req
  FROM public.inventory_update_requests
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request % not found or not pending', p_request_id;
  END IF;

  -- Mark approved
  UPDATE public.inventory_update_requests
  SET status      = 'approved',
      reviewed_by = p_reviewed_by,
      reviewed_at = NOW()
  WHERE id = p_request_id;

  -- Get current quantity
  SELECT COALESCE(current_quantity, 0) INTO v_prev_qty
  FROM public.item_locations
  WHERE item_id        = v_req.item_id
    AND location_id    = v_req.location_id
    AND storage_space_id IS NOT DISTINCT FROM v_req.storage_space_id;

  IF NOT FOUND THEN v_prev_qty := 0; END IF;

  -- Apply quantity change
  UPDATE public.item_locations
  SET current_quantity = v_req.new_quantity,
      last_updated     = NOW()
  WHERE item_id        = v_req.item_id
    AND location_id    = v_req.location_id
    AND storage_space_id IS NOT DISTINCT FROM v_req.storage_space_id;

  IF NOT FOUND THEN
    INSERT INTO public.item_locations
      (item_id, location_id, storage_space_id, current_quantity, organization_id, last_updated)
    VALUES
      (v_req.item_id, v_req.location_id, v_req.storage_space_id,
       v_req.new_quantity, v_req.org_id, NOW());
  END IF;

  -- Audit log
  INSERT INTO public.inventory_logs
    (item_id, location_id, storage_space_id, action_type,
     previous_quantity, new_quantity, quantity_change,
     user_id, notes, organization_id)
  VALUES
    (v_req.item_id, v_req.location_id, v_req.storage_space_id, v_req.action_type,
     v_prev_qty, v_req.new_quantity, v_req.new_quantity - v_prev_qty,
     v_req.requested_by, 'Approved request ' || v_req.id::text, v_req.org_id);
END;
$function$;

-- NEW: bulk_apply_markup(p_item_ids bigint[], p_mode text, p_markup_pc
CREATE OR REPLACE FUNCTION public.bulk_apply_markup(p_item_ids bigint[], p_mode text, p_markup_pct numeric, p_reason text DEFAULT NULL::text)
 RETURNS TABLE(item_id bigint, previous_price numeric, new_price numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
#variable_conflict use_column
DECLARE
  v_batch_id  UUID := gen_random_uuid();
  v_actor     TEXT := auth.jwt() ->> 'sub';
BEGIN
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Only super_admin can bulk-apply markup.'
      USING ERRCODE = '42501';
  END IF;

  IF p_mode NOT IN ('percentage_increase', 'markup_over_cost') THEN
    RAISE EXCEPTION 'Invalid mode: %.', p_mode;
  END IF;

  PERFORM set_config('app.price_change_source', 'bulk_markup', true);
  PERFORM set_config('app.price_change_batch_id', v_batch_id::text, true);
  PERFORM set_config('app.price_change_reason', COALESCE(p_reason, ''), true);

  RETURN QUERY
  WITH targets AS (
    SELECT
      i.id           AS tgt_id,
      iwp.warehouse_transfer_price AS old_price,
      CASE p_mode
        WHEN 'percentage_increase'
          THEN ROUND(iwp.warehouse_transfer_price * (1 + p_markup_pct / 100.0), 4)
        WHEN 'markup_over_cost'
          THEN ROUND(i.current_unit_cost  * (1 + p_markup_pct / 100.0), 4)
      END AS computed_new_price
    FROM public.items i
    LEFT JOIN public.item_warehouse_pricing iwp ON iwp.item_id = i.id
    WHERE i.id = ANY(p_item_ids)
      AND i.is_warehouse_item = TRUE
      AND (p_mode <> 'markup_over_cost' OR i.current_unit_cost IS NOT NULL)
  ),
  upserted AS (
    INSERT INTO public.item_warehouse_pricing (item_id, warehouse_transfer_price, updated_by)
    SELECT tgt_id, computed_new_price, v_actor
    FROM targets
    WHERE computed_new_price > 0
    ON CONFLICT (item_id) DO UPDATE
      SET warehouse_transfer_price = EXCLUDED.warehouse_transfer_price,
          updated_by               = EXCLUDED.updated_by,
          updated_at               = NOW()
    RETURNING
      item_warehouse_pricing.item_id AS upserted_id,
      warehouse_transfer_price       AS new_price
  )
  SELECT t.tgt_id, t.old_price, u.new_price
  FROM targets  t
  JOIN upserted u ON u.upserted_id = t.tgt_id;
END; $function$;

-- NEW: check_empty_pallet()
CREATE OR REPLACE FUNCTION public.check_empty_pallet()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF (SELECT COALESCE(SUM(box_count), 0) FROM pallet_inventory WHERE pallet_id = NEW.pallet_id) = 0 THEN
    UPDATE warehouse_pallets SET status = 'empty' WHERE id = NEW.pallet_id AND status = 'active';
  ELSE
    -- Reactivate if boxes are added back to an empty pallet
    UPDATE warehouse_pallets SET status = 'active' WHERE id = NEW.pallet_id AND status = 'empty';
  END IF;
  RETURN NEW;
END;
$function$;

-- UPDATED: check_low_stock_with_notifications()
CREATE OR REPLACE FUNCTION public.check_low_stock_with_notifications()
 RETURNS trigger
 LANGUAGE plpgsql
 SET search_path TO 'public'
AS $function$DECLARE
    min_qty NUMERIC(10, 2);
    item_record RECORD;
    v_alert_id bigint;
    v_organization_id TEXT;
    v_delivery_mode TEXT;
    v_notifications_enabled BOOLEAN;
    v_low_stock_alerts_enabled BOOLEAN;
    v_current_time TIME;
    v_quiet_start TIME;
    v_quiet_end TIME;
    v_urgency_level TEXT;
    v_threshold_record RECORD;
    v_low_threshold NUMERIC(10, 2);
    v_critical_threshold NUMERIC(10, 2);
    v_supabase_url TEXT;
    v_service_role_key TEXT;
    v_previous_quantity NUMERIC(10, 2);
BEGIN
   -- Store previous quantity
    v_previous_quantity := COALESCE(OLD.current_quantity, NEW.current_quantity);

    -- Get item details and storage space specific override
    SELECT
        i.min_quantity,
        il.min_quantity_override,
        i.organization_id
    INTO item_record
    FROM items i
    LEFT JOIN item_locations il ON
        il.item_id::bigint = i.id::bigint
        AND il.location_id = NEW.location_id
        AND il.storage_space_id = NEW.storage_space_id
    WHERE i.id::bigint = NEW.item_id::bigint;
    v_organization_id := item_record.organization_id::TEXT;

    -- Use override if exists, otherwise use item default, otherwise 0
    min_qty := COALESCE(item_record.min_quantity_override, item_record.min_quantity, 0);

    -- Check if quantity is below minimum
    -- Only create alerts for items with storage_space_id
    IF NEW.current_quantity <= min_qty AND NEW.storage_space_id IS NOT NULL THEN
        -- Create or update alert with storage_space_id
        INSERT INTO alerts (item_id, location_id, storage_space_id, alert_type, triggered_at, organization_id)
        VALUES (NEW.item_id::bigint, NEW.location_id, NEW.storage_space_id, 'low_stock', NOW(), v_organization_id )
        ON CONFLICT (item_id, location_id, storage_space_id, alert_type)
        WHERE resolved_at IS NULL AND storage_space_id IS NOT NULL
DO UPDATE SET
    triggered_at = NOW(),
    resolved_at = NULL
RETURNING id INTO v_alert_id;

        -- Check org-wide notification preferences (location_id IS NULL = org-wide default row).
        -- Using org-wide prefs here ensures store-level preference overrides cannot silently
        -- suppress warehouse alerts. The edge function handles per-location routing after
        -- being invoked.
        SELECT
            notifications_enabled,
            low_stock_alerts_enabled,
            low_stock_delivery_mode,
            quiet_hours_start,
            quiet_hours_end
        INTO v_notifications_enabled, v_low_stock_alerts_enabled, v_delivery_mode, v_quiet_start, v_quiet_end
        FROM notification_preferences
        WHERE organization_id = v_organization_id
          AND location_id IS NULL;

        -- Only proceed if notifications are enabled
        IF COALESCE(v_notifications_enabled, false) AND COALESCE(v_low_stock_alerts_enabled, false) THEN
            -- Calculate urgency level
            -- First, try to get custom thresholds from low_stock_thresholds table
            SELECT low_threshold, critical_threshold INTO v_low_threshold, v_critical_threshold
            FROM low_stock_thresholds
            WHERE organization_id = v_organization_id
                AND (
                    (item_id = NEW.item_id) OR
                    (category_id::bigint = (SELECT category_id::bigint FROM items WHERE id = NEW.item_id) AND item_id IS NULL) OR
                    (location_id = NEW.location_id AND item_id IS NULL AND category_id IS NULL)
                )
                AND is_active = true
            ORDER BY
                CASE WHEN item_id IS NOT NULL THEN 1 ELSE 2 END,
                CASE WHEN category_id IS NOT NULL THEN 1 ELSE 2 END
            LIMIT 1;

            -- If no custom threshold found, use the item's min_quantity as the low threshold
            IF v_low_threshold IS NULL THEN
                v_low_threshold := min_qty;
                IF min_qty > 0 THEN
                    v_critical_threshold := min_qty * 0.5;
                ELSE
                    v_critical_threshold := NULL;
                END IF;
            END IF;

            -- Determine urgency based on thresholds
            IF NEW.current_quantity <= 0 THEN
                v_urgency_level := 'out_of_stock';
            ELSIF v_critical_threshold IS NOT NULL AND NEW.current_quantity <= v_critical_threshold THEN
                v_urgency_level := 'critical';
            ELSE
                v_urgency_level := 'low';
            END IF;

            -- Default delivery mode to 'immediate' if not set
            v_delivery_mode := COALESCE(v_delivery_mode, 'immediate');

            -- Check delivery mode and queue/send accordingly
            IF v_delivery_mode = 'immediate' OR v_delivery_mode = 'both' THEN
                -- Check quiet hours
                v_current_time := NOW();
                IF (v_quiet_start IS NULL OR v_quiet_end IS NULL) OR
                   NOT (v_current_time >= v_quiet_start AND v_current_time <= v_quiet_end) THEN
                    -- Queue for immediate sending (will be handled by application layer)
                      PERFORM queue_low_stock_alert(
                        v_alert_id,
                        NEW.item_id,
                        NEW.location_id,
                        NEW.storage_space_id,
                        v_urgency_level,
                        NEW.current_quantity,
                        v_previous_quantity,
                        min_qty
                    );

                    -- Attempt to call edge function for immediate send (best-effort)
                    BEGIN
                            PERFORM net.http_post(
                                url := 'https://egvvoomdtysbpnstlram.supabase.co/functions/v1/send-low-stock-alert',
                                headers := jsonb_build_object(
                                    'Content-Type', 'application/json'
                                ),
                               body := jsonb_build_object(
                                    'alert_id', v_alert_id,
                                    'item_id', NEW.item_id,
                                    'location_id', NEW.location_id,
                                    'storage_space_id', NEW.storage_space_id,
                                    'organization_id', v_organization_id,
                                    'urgency_level', v_urgency_level,
                                    'current_quantity', NEW.current_quantity,
                                    'previous_quantity', COALESCE(OLD.current_quantity, NEW.current_quantity),
                                    'min_quantity', min_qty
                                )::jsonb
                            );
                   EXCEPTION WHEN OTHERS THEN
    RAISE LOG 'http_post failed: %', SQLERRM;
END;
                END IF;
            END IF;

            IF v_delivery_mode = 'digest' OR v_delivery_mode = 'both' THEN
                -- Always queue for digest
                  PERFORM queue_low_stock_alert(
                        v_alert_id,
                        NEW.item_id,
                        NEW.location_id,
                        NEW.storage_space_id,
                        v_urgency_level,
                        NEW.current_quantity,
                        v_previous_quantity,
                        min_qty
                    );
                RAISE log 'Queued For Low Stock Digest %', NEW.item_id;
            END IF;
        END IF;
    ELSE
        -- Resolve existing alert if quantity is now above minimum
        UPDATE alerts
        SET resolved_at = NOW()
        WHERE item_id = NEW.item_id
            AND location_id = NEW.location_id
            AND storage_space_id = NEW.storage_space_id
            AND alert_type = 'low_stock'
            AND resolved_at IS NULL;
    END IF;

    RETURN NEW;
END;$function$;

-- NEW: confirm_delivery(p_ticket_id uuid, p_admin_user_id text, p_actu
CREATE OR REPLACE FUNCTION public.confirm_delivery(p_ticket_id uuid, p_admin_user_id text, p_actual_pallets integer, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_ticket            order_tickets%ROWTYPE;
  v_delivery          ticket_deliveries%ROWTYPE;
  v_actual_cost       NUMERIC(12,2);
  v_cost_delta        NUMERIC(12,2);
BEGIN

  -- ================================================================
  -- STEP 1: Lock and validate the ticket
  -- ================================================================
  SELECT * INTO v_ticket
  FROM order_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket % not found', p_ticket_id;
  END IF;

  IF v_ticket.status != 'in_transit' THEN
    RAISE EXCEPTION
      'Ticket % cannot confirm delivery from status: %. Must be in_transit.',
      p_ticket_id, v_ticket.status;
  END IF;

  -- ================================================================
  -- STEP 2: Lock and validate the delivery record
  -- ================================================================
  SELECT * INTO v_delivery
  FROM ticket_deliveries
  WHERE ticket_id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'No delivery record found for ticket %.',
      p_ticket_id;
  END IF;

  IF v_delivery.delivery_type != 'company' THEN
    RAISE EXCEPTION
      'Ticket % is a self-pickup. confirm_delivery does not apply.',
      p_ticket_id;
  END IF;

  IF p_actual_pallets < 0 THEN
    RAISE EXCEPTION 'actual_pallets cannot be negative.';
  END IF;

  -- ================================================================
  -- STEP 3: Calculate actual cost
  -- ================================================================
  v_actual_cost := p_actual_pallets * v_delivery.delivery_rate_at_time;

  -- How much the actual differs from the estimate
  v_cost_delta := v_actual_cost -
    COALESCE(v_delivery.estimated_cost, 0);

  -- ================================================================
  -- STEP 4: Update delivery record with actuals
  -- ================================================================
  UPDATE ticket_deliveries
  SET
    actual_pallet_count = p_actual_pallets,
    actual_cost         = v_actual_cost,
    payment_status      = 'captured',
    delivered_at        = NOW(),
    notes               = COALESCE(p_notes, notes),
    updated_at          = NOW()
  WHERE id = v_delivery.id;

  -- ================================================================
  -- STEP 5: Log the cost delta if estimate was off
  -- ================================================================
  IF ABS(v_cost_delta) > 0.01 THEN
    INSERT INTO order_ticket_logs (
      ticket_id,
      previous_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      p_ticket_id,
      'in_transit',
      'in_transit',  -- status not changing yet, just logging the delta
      p_admin_user_id,
      'Delivery cost adjusted. Estimated: $' ||
        COALESCE(v_delivery.estimated_cost::TEXT, 'unknown') ||
        ' → Actual: $' || v_actual_cost::TEXT ||
        ' (delta: $' || v_cost_delta::TEXT || ')'
    );
  END IF;

  -- ================================================================
  -- STEP 6: Transition ticket to delivered
  -- ================================================================
  UPDATE order_tickets
  SET
    status     = 'delivered',
    updated_at = NOW()
  WHERE id = p_ticket_id;

  -- ================================================================
  -- STEP 7: Log the status transition
  -- ================================================================
  INSERT INTO order_ticket_logs (
    ticket_id,
    previous_status,
    new_status,
    changed_by,
    notes
  ) VALUES (
    p_ticket_id,
    'in_transit',
    'delivered',
    p_admin_user_id,
    COALESCE(
      p_notes,
      'Delivered. Actual pallets: ' || p_actual_pallets::TEXT ||
      '. Delivery cost: $' || v_actual_cost::TEXT
    )
  );

  -- ================================================================
  -- STEP 8: Return confirmation summary
  -- ================================================================
  RETURN jsonb_build_object(
    'ticket_id',            p_ticket_id,
    'status',               'delivered',
    'delivery_id',          v_delivery.id,
    'actual_pallet_count',  p_actual_pallets,
    'delivery_rate',        v_delivery.delivery_rate_at_time,
    'estimated_cost',       v_delivery.estimated_cost,
    'actual_cost',          v_actual_cost,
    'cost_delta',           v_cost_delta,
    'delivered_at',         NOW()
  );

END;
$function$;

-- NEW: confirm_order_receipt(p_ticket_id uuid, p_user_id text, p_recei
CREATE OR REPLACE FUNCTION public.confirm_order_receipt(p_ticket_id uuid, p_user_id text, p_received_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_ticket              order_tickets%ROWTYPE;
  v_received_item       JSONB;
  v_item_id             BIGINT;
  v_actual_boxes        INTEGER;
  v_ticket_item         order_ticket_items%ROWTYPE;
  v_fulfillment_line    order_ticket_fulfillment_lines%ROWTYPE;
  v_store_location_id   UUID;
  v_prev_quantity       NUMERIC(10,2);
  v_pieces_to_add       NUMERIC(10,2);
  v_boxes_accounted     INTEGER;
  v_boxes_remaining     INTEGER;
  v_line_boxes          INTEGER;
  v_line_contribution   NUMERIC(10,2);
  v_has_discrepancy     BOOLEAN := FALSE;
  v_confirmed_items     JSONB := '[]';
  v_discrepancies       JSONB := '[]';
BEGIN

  -- ================================================================
  -- STEP 1: Lock and validate the ticket
  -- ================================================================
  SELECT * INTO v_ticket
  FROM order_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket % not found', p_ticket_id;
  END IF;

  IF v_ticket.status != 'delivered' THEN
    RAISE EXCEPTION
      'Ticket % cannot be confirmed from status: %. Must be delivered.',
      p_ticket_id, v_ticket.status;
  END IF;

  v_store_location_id := v_ticket.requesting_location_id;

  -- ================================================================
  -- STEP 2: Validate all item IDs exist on this ticket
  --         before touching any inventory
  -- ================================================================
  FOR v_received_item IN SELECT * FROM jsonb_array_elements(p_received_items)
  LOOP
    v_item_id := (v_received_item->>'item_id')::BIGINT;

    SELECT * INTO v_ticket_item
    FROM order_ticket_items
    WHERE ticket_id = p_ticket_id
      AND item_id   = v_item_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Item % is not part of ticket %. Cannot confirm receipt.',
        v_item_id, p_ticket_id;
    END IF;
  END LOOP;

  -- ================================================================
  -- STEP 3: Process each received item
  -- ================================================================
  FOR v_received_item IN SELECT * FROM jsonb_array_elements(p_received_items)
  LOOP
    v_item_id      := (v_received_item->>'item_id')::BIGINT;
    v_actual_boxes := (v_received_item->>'actual_boxes_received')::INTEGER;

    IF v_actual_boxes < 0 THEN
      RAISE EXCEPTION 'actual_boxes_received cannot be negative for item %.', v_item_id;
    END IF;

    -- Fetch the ticket item for expected quantities
    SELECT * INTO v_ticket_item
    FROM order_ticket_items
    WHERE ticket_id = p_ticket_id
      AND item_id   = v_item_id;

    -- ----------------------------------------------------------------
    -- STEP 3a: Convert actual boxes to pieces using fulfillment lines
    --
    -- The employee received v_actual_boxes of this item. We walk the
    -- fulfillment lines in the same order they were created (FIFO) and
    -- consume boxes against each line's pieces_per_box_at_time until
    -- the actual count is accounted for.
    --
    -- This handles mixed-shipment items correctly — boxes from
    -- different pallets may have different pieces_per_box values.
    -- ----------------------------------------------------------------
    v_pieces_to_add   := 0;
    v_boxes_remaining := v_actual_boxes;

    FOR v_fulfillment_line IN
      SELECT otfl.*
      FROM order_ticket_fulfillment_lines otfl
      JOIN order_ticket_items oti ON oti.id = otfl.order_ticket_item_id
      WHERE oti.ticket_id = p_ticket_id
        AND oti.item_id   = v_item_id
      ORDER BY otfl.created_at ASC
    LOOP
      EXIT WHEN v_boxes_remaining = 0;

      -- How many boxes from this line can we account for?
      v_line_boxes := LEAST(
        v_fulfillment_line.boxes_deducted,
        v_boxes_remaining
      );

      v_line_contribution :=
        v_line_boxes * v_fulfillment_line.pieces_per_box_at_time;

      v_pieces_to_add   := v_pieces_to_add + v_line_contribution;
      v_boxes_remaining := v_boxes_remaining - v_line_boxes;
    END LOOP;

    -- If actual_boxes > fulfilled_boxes, the extra boxes have no
    -- fulfillment line. Use the most recent pieces_per_box as fallback.
    IF v_boxes_remaining > 0 THEN
      DECLARE
        v_fallback_ppb INTEGER;
      BEGIN
        SELECT pieces_per_box_at_time
        INTO v_fallback_ppb
        FROM order_ticket_fulfillment_lines otfl
        JOIN order_ticket_items oti ON oti.id = otfl.order_ticket_item_id
        WHERE oti.ticket_id = p_ticket_id
          AND oti.item_id   = v_item_id
        ORDER BY otfl.created_at DESC
        LIMIT 1;

        v_pieces_to_add := v_pieces_to_add +
          (v_boxes_remaining * COALESCE(v_fallback_ppb, 0));
      END;
    END IF;

    -- ----------------------------------------------------------------
    -- STEP 3b: Upsert store item_locations
    -- ----------------------------------------------------------------
    SELECT current_quantity INTO v_prev_quantity
    FROM item_locations
    WHERE item_id    = v_item_id
      AND location_id = v_store_location_id;

    IF NOT FOUND THEN
      -- Item doesn't exist at store yet — create it
      INSERT INTO item_locations (
        item_id,
        location_id,
        current_quantity,
        last_updated
      ) VALUES (
        v_item_id,
        v_store_location_id,
        v_pieces_to_add,
        NOW()
      );
      v_prev_quantity := 0;
    ELSE
      UPDATE item_locations
      SET
        current_quantity = current_quantity + v_pieces_to_add,
        last_updated     = NOW()
      WHERE item_id     = v_item_id
        AND location_id = v_store_location_id;
    END IF;

    -- ----------------------------------------------------------------
    -- STEP 3c: Inventory log for the store
    -- ----------------------------------------------------------------
    INSERT INTO inventory_logs (
      item_id,
      location_id,
      user_id,
      previous_quantity,
      new_quantity,
      quantity_change,
      action_type,
      notes
    ) VALUES (
      v_item_id,
      v_store_location_id,
      p_user_id,
      v_prev_quantity,
      v_prev_quantity + v_pieces_to_add,
      v_pieces_to_add,
      'received',
      'Order ticket ' || p_ticket_id::TEXT
    );

    -- ----------------------------------------------------------------
    -- STEP 3d: Detect and log discrepancy
    -- ----------------------------------------------------------------
    IF v_actual_boxes != v_ticket_item.fulfilled_boxes THEN
      v_has_discrepancy := TRUE;

      v_discrepancies := v_discrepancies || jsonb_build_object(
        'item_id',          v_item_id,
        'expected_boxes',   v_ticket_item.fulfilled_boxes,
        'actual_boxes',     v_actual_boxes,
        'box_difference',   v_actual_boxes - v_ticket_item.fulfilled_boxes,
        'pieces_added',     v_pieces_to_add
      );
    END IF;

    v_confirmed_items := v_confirmed_items || jsonb_build_object(
      'item_id',       v_item_id,
      'boxes_received', v_actual_boxes,
      'pieces_added',   v_pieces_to_add
    );

  END LOOP;

  -- ================================================================
  -- STEP 4: Log discrepancies if any
  -- ================================================================
  IF v_has_discrepancy THEN
    INSERT INTO order_ticket_logs (
      ticket_id,
      previous_status,
      new_status,
      changed_by,
      notes
    ) VALUES (
      p_ticket_id,
      'delivered',
      'delivered',  -- status not changing, just recording discrepancy
      p_user_id,
      'Receipt discrepancy detected: ' || v_discrepancies::TEXT
    );
  END IF;

  -- ================================================================
  -- STEP 5: Transition ticket to confirmed
  -- ================================================================
  UPDATE order_tickets
  SET
    status       = 'confirmed',
    confirmed_by = p_user_id,
    confirmed_at = NOW(),
    updated_at   = NOW()
  WHERE id = p_ticket_id;

  -- ================================================================
  -- STEP 6: Final status log entry
  -- ================================================================
  INSERT INTO order_ticket_logs (
    ticket_id,
    previous_status,
    new_status,
    changed_by,
    notes
  ) VALUES (
    p_ticket_id,
    'delivered',
    'confirmed',
    p_user_id,
    CASE
      WHEN v_has_discrepancy
        THEN 'Receipt confirmed with discrepancies. See previous log entry.'
      ELSE
        'Receipt confirmed. All quantities match.'
    END
  );

  -- ================================================================
  -- STEP 7: Return confirmation summary
  -- ================================================================
  RETURN jsonb_build_object(
    'ticket_id',       p_ticket_id,
    'status',          'confirmed',
    'confirmed_by',    p_user_id,
    'confirmed_at',    NOW(),
    'items_confirmed', v_confirmed_items,
    'has_discrepancy', v_has_discrepancy,
    'discrepancies',   v_discrepancies
  );

END;
$function$;

-- NEW: confirm_self_pickup(p_ticket_id uuid, p_admin_user_id text, p_n
CREATE OR REPLACE FUNCTION public.confirm_self_pickup(p_ticket_id uuid, p_admin_user_id text, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_ticket    order_tickets%ROWTYPE;
  v_delivery  ticket_deliveries%ROWTYPE;
BEGIN

  -- ================================================================
  -- STEP 1: Lock and validate the ticket
  -- ================================================================
  SELECT * INTO v_ticket
  FROM order_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket % not found', p_ticket_id;
  END IF;

  IF v_ticket.status != 'fulfilled' THEN
    RAISE EXCEPTION
      'Ticket % cannot confirm self-pickup from status: %. Must be fulfilled.',
      p_ticket_id, v_ticket.status;
  END IF;

  IF v_ticket.delivery_type != 'self' THEN
    RAISE EXCEPTION
      'Ticket % is delivery_type %. Use confirm_delivery for company deliveries.',
      p_ticket_id, v_ticket.delivery_type;
  END IF;

  -- ================================================================
  -- STEP 2: Lock and validate the delivery record
  -- ================================================================
  SELECT * INTO v_delivery
  FROM ticket_deliveries
  WHERE ticket_id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'No delivery record found for ticket %. fulfill_order_ticket must run first.',
      p_ticket_id;
  END IF;

  IF v_delivery.delivery_type != 'self' THEN
    RAISE EXCEPTION
      'Delivery record for ticket % is not a self-pickup.',
      p_ticket_id;
  END IF;

  -- ================================================================
  -- STEP 3: Finalize the delivery record
  --
  -- For self-pickup: actual pallets = 0, cost = $0.
  -- dispatched_at and delivered_at are both NOW() — pickup is
  -- instantaneous from the system's perspective.
  -- ================================================================
  UPDATE ticket_deliveries
  SET
    actual_pallet_count = 0,
    actual_cost         = 0,
    payment_status      = 'none',
    dispatched_at       = NOW(),
    delivered_at        = NOW(),
    notes               = COALESCE(p_notes, notes),
    updated_at          = NOW()
  WHERE id = v_delivery.id;

  -- ================================================================
  -- STEP 4: Transition ticket directly to delivered
  --         (skips in_transit entirely)
  -- ================================================================
  UPDATE order_tickets
  SET
    status     = 'delivered',
    updated_at = NOW()
  WHERE id = p_ticket_id;

  -- ================================================================
  -- STEP 5: Log the transition
  -- ================================================================
  INSERT INTO order_ticket_logs (
    ticket_id,
    previous_status,
    new_status,
    changed_by,
    notes
  ) VALUES (
    p_ticket_id,
    'fulfilled',
    'delivered',
    p_admin_user_id,
    COALESCE(p_notes, 'Self-pickup confirmed. No delivery charge.')
  );

  -- ================================================================
  -- STEP 6: Return pickup summary
  -- ================================================================
  RETURN jsonb_build_object(
    'ticket_id',    p_ticket_id,
    'status',       'delivered',
    'delivery_id',  v_delivery.id,
    'delivery_type', 'self',
    'actual_cost',  0,
    'picked_up_at', NOW()
  );

END;
$function$;

-- NEW: create_store_purchase(p_org_id text, p_location_id uuid, p_purc
CREATE OR REPLACE FUNCTION public.create_store_purchase(p_org_id text, p_location_id uuid, p_purchased_by text, p_purchased_at timestamp with time zone, p_supplier_name text, p_notes text, p_items jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_purchase_id      UUID;
  v_item             JSONB;
  v_item_id          BIGINT;
  v_qty              NUMERIC;
  v_unit_cost        NUMERIC;
  v_storage_space_id UUID;
  v_total_cost       NUMERIC := 0;
  v_prev_qty         double precision;
  v_new_qty          double precision;
BEGIN
  -- Sum total cost from items array
  SELECT COALESCE(SUM((e->>'quantity')::numeric * (e->>'unit_cost')::numeric), 0)
  INTO v_total_cost
  FROM jsonb_array_elements(p_items) e;

  -- Insert purchase header
  INSERT INTO public.store_purchases
    (org_id, location_id, purchased_by, purchased_at, supplier_name, notes, total_cost)
  VALUES
    (p_org_id, p_location_id, p_purchased_by, p_purchased_at, p_supplier_name, p_notes, v_total_cost)
  RETURNING id INTO v_purchase_id;

  -- Process each line item
  FOR v_item IN SELECT * FROM jsonb_array_elements(p_items) LOOP
    v_item_id          := (v_item->>'item_id')::bigint;
    v_qty              := (v_item->>'quantity')::numeric;
    v_unit_cost        := (v_item->>'unit_cost')::numeric;
    v_storage_space_id := (v_item->>'storage_space_id')::uuid;  -- NULL if key absent or null

    -- Insert line item with storage_space_id
    INSERT INTO public.store_purchase_items (purchase_id, item_id, quantity, unit_cost, storage_space_id)
    VALUES (v_purchase_id, v_item_id, v_qty, v_unit_cost, v_storage_space_id);

    -- Read current quantity for this item/location/storage_space slot
    SELECT COALESCE(current_quantity, 0)
    INTO v_prev_qty
    FROM public.item_locations
    WHERE item_id          = v_item_id
      AND location_id      = p_location_id
      AND storage_space_id IS NOT DISTINCT FROM v_storage_space_id;

    IF NOT FOUND THEN v_prev_qty := 0; END IF;
    v_new_qty := v_prev_qty + v_qty;

    -- Upsert item_locations
    UPDATE public.item_locations
    SET current_quantity = v_new_qty,
        last_updated     = NOW()
    WHERE item_id          = v_item_id
      AND location_id      = p_location_id
      AND storage_space_id IS NOT DISTINCT FROM v_storage_space_id;

    IF NOT FOUND THEN
      INSERT INTO public.item_locations
        (item_id, location_id, storage_space_id, current_quantity, organization_id, last_updated)
      VALUES
        (v_item_id, p_location_id, v_storage_space_id, v_new_qty, p_org_id, NOW());
    END IF;

    -- Audit log
    INSERT INTO public.inventory_logs
      (item_id, location_id, storage_space_id, action_type,
       previous_quantity, new_quantity, quantity_change,
       user_id, notes, organization_id)
    VALUES
      (v_item_id, p_location_id, v_storage_space_id, 'received',
       v_prev_qty, v_new_qty, v_qty,
       p_purchased_by, 'Store purchase ' || v_purchase_id::text, p_org_id);
  END LOOP;

  RETURN v_purchase_id;
END;
$function$;

-- NEW: dispatch_order_ticket(p_ticket_id uuid, p_admin_user_id text, p
CREATE OR REPLACE FUNCTION public.dispatch_order_ticket(p_ticket_id uuid, p_admin_user_id text, p_estimated_pallets integer DEFAULT NULL::integer, p_notes text DEFAULT NULL::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_ticket           order_tickets%ROWTYPE;
  v_delivery         ticket_deliveries%ROWTYPE;
  v_rate             NUMERIC(10,2);
  v_estimated_cost   NUMERIC(12,2);
  v_estimate_json    JSONB;
  v_total_boxes      INTEGER;
BEGIN

  -- ================================================================
  -- STEP 1: Lock and validate the ticket
  -- ================================================================
  SELECT * INTO v_ticket
  FROM order_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket % not found', p_ticket_id;
  END IF;

  IF v_ticket.status != 'fulfilled' THEN
    RAISE EXCEPTION
      'Ticket % cannot be dispatched from status: %. Must be fulfilled.',
      p_ticket_id, v_ticket.status;
  END IF;

  IF v_ticket.delivery_type != 'company' THEN
    RAISE EXCEPTION
      'Ticket % is delivery_type %. Only company deliveries go through dispatch.',
      p_ticket_id, v_ticket.delivery_type;
  END IF;

  -- ================================================================
  -- STEP 2: Fetch the existing delivery record (created in 3.19)
  -- ================================================================
  SELECT * INTO v_delivery
  FROM ticket_deliveries
  WHERE ticket_id = p_ticket_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION
      'No delivery record found for ticket %. fulfill_order_ticket must run first.',
      p_ticket_id;
  END IF;

  -- ================================================================
  -- STEP 3: Resolve estimated pallet count
  --
  -- Priority:
  --   1. Caller explicitly provides p_estimated_pallets (Super Admin override)
  --   2. Already set on the delivery record from 3.19
  --   3. Call get_delivery_pallet_estimate() as fallback
  -- ================================================================
  IF p_estimated_pallets IS NOT NULL THEN
    -- Super Admin manually entered a count at dispatch time
    v_delivery.estimated_pallet_count := p_estimated_pallets;

  ELSIF v_delivery.estimated_pallet_count IS NULL THEN
    -- Neither 3.19 nor caller provided one — ask the estimator
    SELECT SUM(fulfilled_boxes) INTO v_total_boxes
    FROM order_ticket_items
    WHERE ticket_id = p_ticket_id;

    v_estimate_json := get_delivery_pallet_estimate(
      v_ticket.organization_id,
      v_total_boxes
    );

    v_delivery.estimated_pallet_count :=
      (v_estimate_json->>'estimated_pallets')::INTEGER;
  END IF;

  -- ================================================================
  -- STEP 4: Recalculate estimated cost with final pallet count
  -- ================================================================
  SELECT default_rate INTO v_rate
  FROM warehouse_expense_rates
  WHERE organization_id = v_ticket.organization_id
    AND expense_type = 'pallet_delivery';

  IF v_rate IS NULL THEN
    RAISE EXCEPTION
      'No pallet_delivery rate configured for organization %.',
      v_ticket.organization_id;
  END IF;

  IF v_delivery.estimated_pallet_count IS NOT NULL THEN
    v_estimated_cost := v_delivery.estimated_pallet_count * v_rate;
  ELSE
    -- Cold start with no data and no manual entry — cost unknown yet
    v_estimated_cost := NULL;
  END IF;

  -- ================================================================
  -- STEP 5: Update delivery record — mark as dispatched
  -- ================================================================
  UPDATE ticket_deliveries
  SET
    estimated_pallet_count = v_delivery.estimated_pallet_count,
    delivery_rate_at_time  = v_rate,
    estimated_cost         = v_estimated_cost,
    payment_status         = 'held',
    dispatched_at          = NOW(),
    notes                  = COALESCE(p_notes, notes),
    updated_at             = NOW()
  WHERE id = v_delivery.id;

  -- ================================================================
  -- STEP 6: Transition ticket to in_transit
  -- ================================================================
  UPDATE order_tickets
  SET
    status     = 'in_transit',
    updated_at = NOW()
  WHERE id = p_ticket_id;

  -- ================================================================
  -- STEP 7: Log the transition
  -- ================================================================
  INSERT INTO order_ticket_logs (
    ticket_id,
    previous_status,
    new_status,
    changed_by,
    notes
  ) VALUES (
    p_ticket_id,
    'fulfilled',
    'in_transit',
    p_admin_user_id,
    COALESCE(
      p_notes,
      'Dispatched. Estimated pallets: ' ||
        COALESCE(v_delivery.estimated_pallet_count::TEXT, 'unknown')
    )
  );

  -- ================================================================
  -- STEP 8: Return dispatch summary
  -- ================================================================
  RETURN jsonb_build_object(
    'ticket_id',              p_ticket_id,
    'status',                 'in_transit',
    'delivery_id',            v_delivery.id,
    'estimated_pallet_count', v_delivery.estimated_pallet_count,
    'delivery_rate',          v_rate,
    'estimated_cost',         v_estimated_cost,
    'dispatched_at',          NOW()
  );

END;
$function$;

-- NEW: enforce_pricing_on_warehouse_item()
CREATE OR REPLACE FUNCTION public.enforce_pricing_on_warehouse_item()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE v_is_warehouse BOOLEAN;
BEGIN
  SELECT is_warehouse_item INTO v_is_warehouse FROM public.items WHERE id = NEW.item_id;
  IF v_is_warehouse IS DISTINCT FROM TRUE THEN
    RAISE EXCEPTION 'Cannot set a transfer price on a non-warehouse item (item_id=%).',
      NEW.item_id
      USING ERRCODE = 'check_violation';
  END IF;
  NEW.updated_at := NOW();
  RETURN NEW;
END; $function$;

-- NEW: fulfill_order_ticket(p_ticket_id uuid, p_admin_user_id text, p_
CREATE OR REPLACE FUNCTION public.fulfill_order_ticket(p_ticket_id uuid, p_admin_user_id text, p_allow_partial boolean, p_delivery_type text)
 RETURNS json
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

-- NEW: fulfill_order_ticket_manual(p_ticket_id uuid, p_admin_user_id t
CREATE OR REPLACE FUNCTION public.fulfill_order_ticket_manual(p_ticket_id uuid, p_admin_user_id text, p_pallet_selection jsonb, p_delivery_type text DEFAULT 'company'::text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_ticket              order_tickets%ROWTYPE;
  v_selection           JSONB;
  v_item_id             BIGINT;
  v_pallet_id           UUID;
  v_boxes_to_take       INTEGER;
  v_pallet_inv          pallet_inventory%ROWTYPE;
  v_ticket_item         order_ticket_items%ROWTYPE;
  v_effective_ppb       INTEGER;
  v_item_boxes_taken    JSONB := '{}';
  v_current_taken       INTEGER;
  v_fulfilled_items     JSONB := '[]';
  v_deducted_pallets    JSONB := '[]';
  v_delivery_id         UUID;
  v_estimate            JSONB;
  v_rate                NUMERIC(10,2);
  v_validation          JSONB;
BEGIN

  -- ================================================================
  -- STEP 1: Run validation first — fail fast before any writes
  -- ================================================================
  v_validation := validate_pallet_selection(p_ticket_id, p_pallet_selection);

  IF NOT (v_validation->>'is_valid')::BOOLEAN THEN
    RAISE EXCEPTION
      'Pallet selection validation failed: %',
      v_validation->'errors';
  END IF;

  -- ================================================================
  -- STEP 2: Lock the ticket
  -- ================================================================
  SELECT * INTO v_ticket
  FROM order_tickets
  WHERE id = p_ticket_id
  FOR UPDATE;

  IF v_ticket.status NOT IN ('submitted', 'processing') THEN
    RAISE EXCEPTION
      'Ticket % status changed to % since validation. Aborting.',
      p_ticket_id, v_ticket.status;
  END IF;

  IF p_delivery_type NOT IN ('company', 'self') THEN
    RAISE EXCEPTION 'Invalid delivery_type: %', p_delivery_type;
  END IF;

  -- ================================================================
  -- STEP 3: Execute deductions for each selection line
  -- ================================================================
  FOR v_selection IN SELECT * FROM jsonb_array_elements(p_pallet_selection)
  LOOP
    v_item_id       := (v_selection->>'item_id')::BIGINT;
    v_pallet_id     := (v_selection->>'pallet_id')::UUID;
    v_boxes_to_take := (v_selection->>'boxes_to_take')::INTEGER;

    -- Check how many boxes we still need for this item
    -- (handles over-selection by capping at ticket quantity)
    SELECT * INTO v_ticket_item
    FROM order_ticket_items
    WHERE ticket_id = p_ticket_id
      AND item_id   = v_item_id;

    v_current_taken := COALESCE(
      (v_item_boxes_taken->>v_item_id::TEXT)::INTEGER, 0
    );

    -- Cap: don't take more than the ticket needs
    v_boxes_to_take := LEAST(
      v_boxes_to_take,
      v_ticket_item.quantity_boxes - v_current_taken
    );

    -- Skip if this item is already fully satisfied
    CONTINUE WHEN v_boxes_to_take <= 0;

    -- Lock the pallet inventory row
    SELECT * INTO v_pallet_inv
    FROM pallet_inventory
    WHERE pallet_id = v_pallet_id
      AND item_id   = v_item_id
    FOR UPDATE;

    -- Final stock check after lock (race condition protection)
    IF v_pallet_inv.box_count < v_boxes_to_take THEN
      RAISE EXCEPTION
        'Pallet % no longer has enough stock for item %. Available: %, needed: %. Another operation may have modified this pallet.',
        v_pallet_id,
        v_item_id,
        v_pallet_inv.box_count,
        v_boxes_to_take;
    END IF;

    -- Deduct from pallet
    UPDATE pallet_inventory
    SET box_count = box_count - v_boxes_to_take
    WHERE id = v_pallet_inv.id;

    -- Get effective pieces per box
    v_effective_ppb := get_effective_pieces_per_box(v_pallet_inv.id);

    -- Write fulfillment line
    INSERT INTO order_ticket_fulfillment_lines (
      order_ticket_item_id,
      pallet_id,
      pallet_inventory_id,
      boxes_deducted,
      pieces_per_box_at_time,
      total_pieces
    )
    SELECT
      oti.id,
      v_pallet_id,
      v_pallet_inv.id,
      v_boxes_to_take,
      v_effective_ppb,
      v_boxes_to_take * v_effective_ppb
    FROM order_ticket_items oti
    WHERE oti.ticket_id = p_ticket_id
      AND oti.item_id   = v_item_id;

    -- Pallet operations log
    INSERT INTO pallet_operations_log (
      organization_id,
      pallet_id,
      operation_type,
      item_id,
      box_count_change,
      related_ticket_id,
      performed_by,
      notes
    ) VALUES (
      v_ticket.organization_id,
      v_pallet_id,
      'loaded',
      v_item_id,
      -v_boxes_to_take,
      p_ticket_id,
      p_admin_user_id,
      'Manual pallet selection override'
    );

    -- Inventory log
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
    )
    SELECT
      v_item_id,
      wp.warehouse_location_id,
      wp.storage_space_id,
      p_admin_user_id,
      v_pallet_inv.box_count,
      v_pallet_inv.box_count - v_boxes_to_take,
      -v_boxes_to_take,
      'used',
      'Order ticket ' || p_ticket_id::TEXT ||
      ' (manual pallet selection)'
    FROM warehouse_pallets wp
    WHERE wp.id = v_pallet_id;

    -- Track running total per item
    v_item_boxes_taken := jsonb_set(
      v_item_boxes_taken,
      ARRAY[v_item_id::TEXT],
      to_jsonb(v_current_taken + v_boxes_to_take)
    );

    v_deducted_pallets := v_deducted_pallets || jsonb_build_object(
      'pallet_id',      v_pallet_id,
      'item_id',        v_item_id,
      'boxes_deducted', v_boxes_to_take
    );

  END LOOP;

  -- ================================================================
  -- STEP 4: Update fulfilled quantities on ticket items
  -- ================================================================
  FOR v_ticket_item IN
    SELECT * FROM order_ticket_items WHERE ticket_id = p_ticket_id
  LOOP
    UPDATE order_ticket_items
    SET
      fulfilled_boxes = v_ticket_item.quantity_boxes,
      fulfilled_units = (
        SELECT SUM(total_pieces)
        FROM order_ticket_fulfillment_lines otfl
        WHERE otfl.order_ticket_item_id = v_ticket_item.id
      )
    WHERE id = v_ticket_item.id;

    v_fulfilled_items := v_fulfilled_items || jsonb_build_object(
      'item_id',        v_ticket_item.item_id,
      'boxes_fulfilled', v_ticket_item.quantity_boxes
    );
  END LOOP;

  -- ================================================================
  -- STEP 5: Create delivery record (same logic as fulfill_order_ticket)
  -- ================================================================
  IF p_delivery_type = 'company' THEN

    SELECT default_rate INTO v_rate
    FROM warehouse_expense_rates
    WHERE organization_id = v_ticket.organization_id
      AND expense_type    = 'pallet_delivery';

    v_estimate := get_delivery_pallet_estimate(
      v_ticket.organization_id,
      (SELECT SUM(fulfilled_boxes)
       FROM order_ticket_items
       WHERE ticket_id = p_ticket_id)
    );

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
      (v_estimate->>'estimated_pallets')::INTEGER,
      v_rate,
      (v_estimate->>'estimated_pallets')::INTEGER * v_rate,
      'held'
    )
    RETURNING id INTO v_delivery_id;

  ELSE
    INSERT INTO ticket_deliveries (
      ticket_id,
      delivery_type,
      actual_pallet_count,
      delivery_rate_at_time,
      estimated_cost,
      actual_cost,
      payment_status,
      dispatched_at,
      delivered_at
    ) VALUES (
      p_ticket_id,
      'self',
      0, 0, 0, 0,
      'none',
      NOW(), NOW()
    )
    RETURNING id INTO v_delivery_id;
  END IF;

  -- ================================================================
  -- STEP 6: Update ticket status
  -- ================================================================
  UPDATE order_tickets
  SET
    status        = CASE
                      WHEN p_delivery_type = 'company'
                        THEN 'fulfilled'
                      ELSE 'delivered'
                    END,
    processed_by  = p_admin_user_id,
    fulfilled_at  = NOW(),
    delivery_type = p_delivery_type,
    updated_at    = NOW()
  WHERE id = p_ticket_id;

  -- ================================================================
  -- STEP 7: Ticket log entry
  -- ================================================================
  INSERT INTO order_ticket_logs (
    ticket_id,
    previous_status,
    new_status,
    changed_by,
    notes
  ) VALUES (
    p_ticket_id,
    v_ticket.status,
    CASE WHEN p_delivery_type = 'company' THEN 'fulfilled' ELSE 'delivered' END,
    p_admin_user_id,
    'Fulfilled via manual pallet selection'
  );

  -- ================================================================
  -- STEP 8: Return result
  -- (Deferred sync trigger fires at COMMIT automatically)
  -- ================================================================
  RETURN jsonb_build_object(
    'ticket_id',          p_ticket_id,
    'fulfillment_type',   'manual',
    'delivery_type',      p_delivery_type,
    'delivery_id',        v_delivery_id,
    'items_fulfilled',    v_fulfilled_items,
    'pallets_deducted',   v_deducted_pallets,
    'validation_warnings', v_validation->'warnings'
  );

END;
$function$;

-- NEW: get_delivery_pallet_estimate(p_organization_id text, p_total_bo
CREATE OR REPLACE FUNCTION public.get_delivery_pallet_estimate(p_organization_id text, p_total_boxes integer)
 RETURNS TABLE(estimated_pallets integer, avg_boxes_per_pallet numeric, delivery_count integer, confidence text)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
  v_count                INTEGER;
  v_total_pallets        NUMERIC;
  v_total_boxes          NUMERIC;
  v_avg_boxes_per_pallet NUMERIC;
BEGIN
  -- Count completed company deliveries that have actual pallet data
  SELECT
    COUNT(*)::INTEGER,
    COALESCE(SUM(td.actual_pallet_count), 0)
  INTO v_count, v_total_pallets
  FROM ticket_deliveries td
  JOIN order_tickets ot ON ot.id = td.ticket_id
  WHERE ot.organization_id     = p_organization_id
    AND td.delivery_type       = 'company'
    AND td.actual_pallet_count IS NOT NULL
    AND td.actual_pallet_count > 0;

  -- Sum total boxes across those same completed deliveries
  SELECT COALESCE(SUM(oti.quantity_boxes), 0)
  INTO v_total_boxes
  FROM order_ticket_items oti
  JOIN order_tickets ot ON ot.id = oti.ticket_id
  JOIN ticket_deliveries td ON td.ticket_id = ot.id
  WHERE ot.organization_id     = p_organization_id
    AND td.delivery_type       = 'company'
    AND td.actual_pallet_count IS NOT NULL
    AND td.actual_pallet_count > 0;

  -- avg_boxes_per_pallet = total boxes shipped / total pallets used
  IF v_total_pallets > 0 THEN
    v_avg_boxes_per_pallet := v_total_boxes / v_total_pallets;
  ELSE
    v_avg_boxes_per_pallet := NULL;
  END IF;

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
$function$;

-- NEW: get_effective_notification_preferences(p_organization_id text, 
CREATE OR REPLACE FUNCTION public.get_effective_notification_preferences(p_organization_id text, p_location_id uuid)
 RETURNS TABLE(notifications_enabled boolean, low_stock_alerts_enabled boolean, delivery_mode text, quiet_hours_start time without time zone, quiet_hours_end time without time zone, primary_email text, secondary_emails jsonb, timezone text, source text)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
    loc_row notification_preferences%ROWTYPE;
    org_row notification_preferences%ROWTYPE;
BEGIN
    SELECT * INTO loc_row
    FROM   notification_preferences
    WHERE  organization_id = p_organization_id
      AND  location_id = p_location_id
    LIMIT 1;

    SELECT * INTO org_row
    FROM   notification_preferences
    WHERE  organization_id = p_organization_id
      AND  location_id IS NULL
    LIMIT 1;

    IF loc_row.id IS NOT NULL THEN
        RETURN QUERY SELECT
            COALESCE(loc_row.notifications_enabled,    org_row.notifications_enabled,    TRUE),
            COALESCE(loc_row.low_stock_alerts_enabled, org_row.low_stock_alerts_enabled, TRUE),
            COALESCE(loc_row.delivery_mode,            org_row.delivery_mode,            'immediate'),
            COALESCE(loc_row.quiet_hours_start,        org_row.quiet_hours_start),
            COALESCE(loc_row.quiet_hours_end,          org_row.quiet_hours_end),
            COALESCE(loc_row.primary_email,            org_row.primary_email),
            COALESCE(loc_row.secondary_emails,         org_row.secondary_emails,         '[]'::jsonb),
            COALESCE(loc_row.timezone,                 org_row.timezone,                 'UTC'),
            'location'::TEXT;
    ELSIF org_row.id IS NOT NULL THEN
        RETURN QUERY SELECT
            COALESCE(org_row.notifications_enabled,    TRUE),
            COALESCE(org_row.low_stock_alerts_enabled, TRUE),
            COALESCE(org_row.delivery_mode,            'immediate'),
            org_row.quiet_hours_start,
            org_row.quiet_hours_end,
            org_row.primary_email,
            COALESCE(org_row.secondary_emails, '[]'::jsonb),
            COALESCE(org_row.timezone, 'UTC'),
            'org_default'::TEXT;
    ELSE
        RETURN QUERY SELECT
            TRUE, TRUE, 'immediate'::TEXT,
            NULL::TIME, NULL::TIME, NULL::TEXT,
            '[]'::JSONB, 'UTC'::TEXT,
            'system_default'::TEXT;
    END IF;
END;
$function$;

-- NEW: get_effective_pieces_per_box(p_pallet_inventory_id uuid)
CREATE OR REPLACE FUNCTION public.get_effective_pieces_per_box(p_pallet_inventory_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 STABLE
AS $function$
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
$function$;

-- NEW: get_item_shipment_history(p_item_id bigint, p_organization_id t
CREATE OR REPLACE FUNCTION public.get_item_shipment_history(p_item_id bigint, p_organization_id text)
 RETURNS jsonb
 LANGUAGE sql
 STABLE
AS $function$
    SELECT COALESCE(
        jsonb_agg(
            jsonb_build_object(
                'item_id',             v.item_id,
                'item_name',           v.item_name,
                'sku',                 v.sku,
                'po_number',           v.po_number,
                'po_date',             v.po_date,
                'actual_arrival',      v.actual_arrival,
                'supplier_name',       v.supplier_name,
                'config_pieces_per_box', v.config_pieces_per_box,
                'config_box_count',    v.config_box_count,
                'config_total_pieces', v.config_total_pieces,
                'po_line_total_boxes', v.po_line_total_boxes,
                'has_mixed_configs',   v.has_mixed_configs,
                'box_configs',         (
                    SELECT jsonb_agg(
                        jsonb_build_object(
                            'pieces_per_box', bc.pieces_per_box,
                            'box_count',      bc.box_count,
                            'total_pieces',   bc.total_pieces,
                            'notes',          bc.notes
                        )
                        ORDER BY bc.pieces_per_box DESC
                    )
                    FROM po_item_box_configs bc
                    WHERE bc.purchase_order_item_id = v.purchase_order_item_id
                )
            )
            ORDER BY v.po_date DESC
        ),
        '[]'::jsonb
    )
    FROM item_shipment_breakdown v
    WHERE v.item_id = p_item_id
      AND v.organization_id = p_organization_id;
$function$;

-- NEW: get_jwt_debug()
CREATE OR REPLACE FUNCTION public.get_jwt_debug()
 RETURNS jsonb
 LANGUAGE sql
 SECURITY DEFINER
AS $function$
    SELECT auth.jwt();
$function$;

-- NEW: get_reorder_alerts(p_organization_id text, p_lead_time_days int
CREATE OR REPLACE FUNCTION public.get_reorder_alerts(p_organization_id text, p_lead_time_days integer DEFAULT 45, p_buffer_days integer DEFAULT 14)
 RETURNS TABLE(item_id bigint, item_name text, item_sku text, avg_weekly_units numeric, current_warehouse_stock numeric, weeks_remaining numeric, urgency text)
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  WITH

  -- Warehouse location IDs for this org
  warehouse_locations AS (
    SELECT id
    FROM   locations
    WHERE  organization_id = p_organization_id
      AND  location_type   = 'warehouse'
  ),

  -- Current stock per item across all non-retired pallets in this org's warehouses
  warehouse_stock AS (
    SELECT
      pi.item_id,
      SUM(pi.box_count)::numeric AS total_boxes
    FROM   pallet_inventory pi
    JOIN   warehouse_pallets wp ON wp.id = pi.pallet_id
    WHERE  wp.warehouse_location_id IN (SELECT id FROM warehouse_locations)
      AND  wp.status <> 'retired'
    GROUP BY pi.item_id
  ),

  -- 90-day fulfillment burn rate per item (quantity_change is negative on fulfillment)
  burn_rates AS (
    SELECT
      il.item_id,
      -- Sum of absolute outgoing quantity over 90 days, then divide by weeks
      ROUND(
        (SUM(ABS(il.quantity_change)) /
        NULLIF(
          EXTRACT(DAY FROM (NOW() - MIN(il.created_at))) / 7.0,
          0
        ))::numeric,
        2
      ) AS avg_weekly_units
    FROM   inventory_logs il
    WHERE  il.organization_id = p_organization_id
      AND  il.action_type     = 'fulfillment'
      AND  il.created_at     >= NOW() - INTERVAL '90 days'
      AND  il.quantity_change < 0
    GROUP BY il.item_id
    -- Require at least 2 data points for a meaningful rate
    HAVING COUNT(*) >= 2
  )

  SELECT
    i.id::bigint                                        AS item_id,
    i.name                                              AS item_name,
    i.sku                                               AS item_sku,
    br.avg_weekly_units,
    COALESCE(ws.total_boxes, 0)                         AS current_warehouse_stock,
    CASE
      WHEN br.avg_weekly_units > 0
        THEN ROUND(COALESCE(ws.total_boxes, 0) / br.avg_weekly_units, 2)
      ELSE NULL
    END                                                 AS weeks_remaining,
    CASE
      WHEN COALESCE(ws.total_boxes, 0) / NULLIF(br.avg_weekly_units, 0)
           <= p_lead_time_days::numeric / 7.0
        THEN 'critical'
      WHEN COALESCE(ws.total_boxes, 0) / NULLIF(br.avg_weekly_units, 0)
           <= (p_lead_time_days + p_buffer_days)::numeric / 7.0
        THEN 'warning'
      ELSE 'watch'
    END                                                 AS urgency
  FROM   burn_rates br
  JOIN   items      i  ON i.id = br.item_id
  LEFT   JOIN warehouse_stock ws ON ws.item_id = br.item_id
  WHERE  i.organization_id = p_organization_id
    -- Only surface items that are actually within the watch window
    AND  COALESCE(ws.total_boxes, 0) / NULLIF(br.avg_weekly_units, 0)
           <= (p_lead_time_days + p_buffer_days)::numeric / 7.0 * 2
  ORDER BY
    CASE
      WHEN COALESCE(ws.total_boxes, 0) / NULLIF(br.avg_weekly_units, 0)
           <= p_lead_time_days::numeric / 7.0 THEN 1
      WHEN COALESCE(ws.total_boxes, 0) / NULLIF(br.avg_weekly_units, 0)
           <= (p_lead_time_days + p_buffer_days)::numeric / 7.0 THEN 2
      ELSE 3
    END,
    weeks_remaining ASC NULLS LAST;
$function$;

-- UPDATED: get_user_role(user_id text)
CREATE OR REPLACE FUNCTION public.get_user_role(user_id text)
 RETURNS text
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
  SELECT role FROM users WHERE id = user_id  -- ✅ TEXT = TEXT, no cast
$function$;

-- NEW: get_warehouse_burn_rates(p_organization_id text, p_days_lookbac
CREATE OR REPLACE FUNCTION public.get_warehouse_burn_rates(p_organization_id text, p_days_lookback integer DEFAULT 90)
 RETURNS TABLE(item_id bigint, item_name text, item_sku text, avg_weekly_units numeric, current_warehouse_stock numeric, weeks_remaining numeric)
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_warehouse_location_id UUID;
  v_weeks_in_window       NUMERIC;
BEGIN
  -- Resolve the warehouse location for this org (single-warehouse assumption)
  SELECT l.id INTO v_warehouse_location_id
  FROM locations l
  WHERE l.organization_id = p_organization_id
    AND l.location_type   = 'warehouse'
    AND l.is_active        = true
  LIMIT 1;

  -- If no warehouse exists, return empty set
  IF v_warehouse_location_id IS NULL THEN
    RETURN;
  END IF;

  v_weeks_in_window := GREATEST(p_days_lookback::NUMERIC / 7.0, 1.0);

  RETURN QUERY
  WITH consumption AS (
    SELECT
      oti.item_id                       AS c_item_id,
      COALESCE(SUM(oti.fulfilled_units::NUMERIC), 0::NUMERIC) AS total_fulfilled
    FROM order_ticket_items oti
    JOIN order_tickets ot ON ot.id = oti.ticket_id
    WHERE ot.organization_id = p_organization_id
      AND ot.status          = 'confirmed'
      AND ot.confirmed_at   >= NOW() - (p_days_lookback || ' days')::INTERVAL
    GROUP BY oti.item_id
  )
  SELECT
    i.id                                     AS item_id,
    i.name                                   AS item_name,
    i.sku                                    AS item_sku,

    -- Weekly burn rate (cast final result to NUMERIC)
    (COALESCE(c.total_fulfilled / v_weeks_in_window, 0))::NUMERIC
                                             AS avg_weekly_units,

    -- Current warehouse stock (cast to NUMERIC regardless of source type)
    (COALESCE(il.current_quantity, 0))::NUMERIC
                                             AS current_warehouse_stock,

    -- Weeks remaining (cast to NUMERIC)
    (CASE
      WHEN COALESCE(c.total_fulfilled, 0) > 0 THEN
        COALESCE(il.current_quantity, 0)::NUMERIC
        / (c.total_fulfilled / v_weeks_in_window)
      ELSE NULL
    END)::NUMERIC                            AS weeks_remaining

  FROM items i

  -- Consumption from confirmed tickets in the lookback window
  LEFT JOIN consumption c ON c.c_item_id = i.id

  -- Current warehouse stock from item_locations
  LEFT JOIN item_locations il ON il.item_id     = i.id
                              AND il.location_id = v_warehouse_location_id

  WHERE i.organization_id = p_organization_id

  ORDER BY weeks_remaining ASC NULLS LAST;
END;
$function$;

-- UPDATED: is_admin_or_above()
CREATE OR REPLACE FUNCTION public.is_admin_or_above()
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
BEGIN
  RETURN get_user_role(auth.jwt() ->> 'sub') IN ('admin', 'super_admin');
END;
$function$;

-- UPDATED: is_super_admin()
CREATE OR REPLACE FUNCTION public.is_super_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
AS $function$
    SELECT EXISTS (
        SELECT 1 FROM users
        WHERE id = (auth.jwt() ->> 'sub')
        AND role = 'super_admin'
    );
$function$;

-- NEW: log_transfer_price_change()
CREATE OR REPLACE FUNCTION public.log_transfer_price_change()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.warehouse_transfer_price_history
      (item_id, previous_price, new_price, change_source, changed_by)
    VALUES (NEW.item_id, NULL, NEW.warehouse_transfer_price, 'initial_set', NEW.updated_by);

  ELSIF TG_OP = 'UPDATE'
    AND OLD.warehouse_transfer_price IS DISTINCT FROM NEW.warehouse_transfer_price THEN
    INSERT INTO public.warehouse_transfer_price_history
      (item_id, previous_price, new_price, change_source, changed_by, batch_id, change_reason)
    VALUES (
      NEW.item_id,
      OLD.warehouse_transfer_price,
      NEW.warehouse_transfer_price,
      COALESCE(NULLIF(current_setting('app.price_change_source', true), ''), 'manual_edit'),
      NEW.updated_by,
      NULLIF(current_setting('app.price_change_batch_id', true), '')::UUID,
      NULLIF(current_setting('app.price_change_reason', true), '')
    );
  END IF;
  RETURN NEW;
END; $function$;

-- NEW: move_boxes_between_pallets(p_source_pallet_id uuid, p_target_pa
CREATE OR REPLACE FUNCTION public.move_boxes_between_pallets(p_source_pallet_id uuid, p_target_pallet_id uuid, p_item_id bigint, p_box_count integer, p_user_id text)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_source_inv        RECORD;
  v_target_inv        RECORD;
  v_org_id            TEXT;
BEGIN
  -- 1. Validate box count
  IF p_box_count <= 0 THEN
    RAISE EXCEPTION 'box_count must be greater than 0';
  END IF;

  -- 2. Lock and fetch source pallet inventory row
  SELECT pi.*, wp.organization_id INTO v_source_inv
  FROM pallet_inventory pi
  JOIN warehouse_pallets wp ON wp.id = pi.pallet_id
  WHERE pi.pallet_id = p_source_pallet_id
    AND pi.item_id = p_item_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Item % not found on source pallet %', p_item_id, p_source_pallet_id;
  END IF;

  IF v_source_inv.box_count < p_box_count THEN
    RAISE EXCEPTION 'Insufficient boxes: % available, % requested',
      v_source_inv.box_count, p_box_count;
  END IF;

  v_org_id := v_source_inv.organization_id;

  -- 3. Deduct from source
  UPDATE pallet_inventory
  SET box_count = box_count - p_box_count
  WHERE pallet_id = p_source_pallet_id
    AND item_id = p_item_id
    AND purchase_order_item_id IS NOT DISTINCT FROM v_source_inv.purchase_order_item_id;

  -- 4. Check if target already has this item from the SAME shipment
  SELECT * INTO v_target_inv
  FROM pallet_inventory
  WHERE pallet_id = p_target_pallet_id
    AND item_id = p_item_id
    AND purchase_order_item_id IS NOT DISTINCT FROM v_source_inv.purchase_order_item_id
  FOR UPDATE;

  IF FOUND THEN
    UPDATE pallet_inventory
    SET box_count = box_count + p_box_count
    WHERE id = v_target_inv.id;
  ELSE
    INSERT INTO pallet_inventory (
      pallet_id,
      item_id,
      purchase_order_item_id,
      box_count,
      initial_box_count,
      pieces_per_box_override
    ) VALUES (
      p_target_pallet_id,
      p_item_id,
      v_source_inv.purchase_order_item_id,
      p_box_count,
      p_box_count,
      v_source_inv.pieces_per_box_override
    );
  END IF;

  -- 5. Log on source pallet
  INSERT INTO pallet_operations_log (
    organization_id, pallet_id, operation_type,
    item_id, box_count_change, related_pallet_id, performed_by
  ) VALUES (
    v_org_id, p_source_pallet_id, 'consolidated_from',
    p_item_id, -p_box_count, p_target_pallet_id, p_user_id
  );

  -- 6. Log on target pallet
  INSERT INTO pallet_operations_log (
    organization_id, pallet_id, operation_type,
    item_id, box_count_change, related_pallet_id, performed_by
  ) VALUES (
    v_org_id, p_target_pallet_id, 'consolidated_to',
    p_item_id, p_box_count, p_source_pallet_id, p_user_id
  );

  -- NOTE: sync_warehouse_inventory_commit_fn() removed —
  -- sync_warehouse_inventory trigger on pallet_inventory handles this automatically.

END;
$function$;

-- NEW: recalculate_po_costs(p_purchase_order_id uuid)
CREATE OR REPLACE FUNCTION public.recalculate_po_costs(p_purchase_order_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
$function$;

-- NEW: receive_purchase_order(p_purchase_order_id uuid, p_user_id text
CREATE OR REPLACE FUNCTION public.receive_purchase_order(p_purchase_order_id uuid, p_user_id text, p_received_items jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
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
  v_full_box_units        INTEGER;       -- full_boxes * pieces_per_box
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
  SELECT * INTO v_po FROM purchase_orders WHERE id = p_purchase_order_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'purchase_order_not_found' USING DETAIL = p_purchase_order_id::TEXT;
  END IF;

  IF v_po.status = 'received' THEN
    RAISE EXCEPTION 'po_already_received'
      USING DETAIL = 'PO ' || p_purchase_order_id::TEXT || ' has already been received.';
  END IF;
  IF v_po.status NOT IN ('arrived', 'in_transit') THEN
    RAISE EXCEPTION 'po_not_receivable'
      USING DETAIL = 'PO status is ' || v_po.status || '. Only arrived or in_transit POs can be received.';
  END IF;

  IF p_received_items IS NULL OR jsonb_array_length(p_received_items) = 0 THEN
    RAISE EXCEPTION 'received_items_empty'
      USING DETAIL = 'p_received_items must contain at least one item.';
  END IF;

  SELECT id INTO v_warehouse_location_id
  FROM   locations
  WHERE  organization_id = v_po.organization_id AND location_type = 'warehouse'
  LIMIT  1;

  IF v_warehouse_location_id IS NULL THEN
    RAISE EXCEPTION 'warehouse_location_not_found'
      USING DETAIL = 'No warehouse location found for organization ' || v_po.organization_id;
  END IF;

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
    WHERE  purchase_order_id = p_purchase_order_id AND item_id = v_item_id;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'item_not_in_po'
        USING DETAIL = 'Item ' || v_item_id::TEXT || ' is not in PO ' || p_purchase_order_id::TEXT;
    END IF;

    IF v_qty_received IS NULL THEN v_qty_received := v_qty_ordered::INTEGER; END IF;

    IF v_qty_received < 0 THEN
      RAISE EXCEPTION 'invalid_quantity_received'
        USING DETAIL = 'quantity_received cannot be negative for item ' || v_item_id::TEXT;
    END IF;

    IF v_pieces_per_box IS NULL OR v_pieces_per_box <= 0 THEN
      v_full_boxes    := v_qty_received;
      v_partial_units := 0;
    ELSE
      v_full_boxes    := v_qty_received / v_pieces_per_box;
      v_partial_units := v_qty_received % v_pieces_per_box;
    END IF;

    v_full_box_units := CASE
      WHEN v_pieces_per_box IS NULL OR v_pieces_per_box <= 0 THEN v_full_boxes
      ELSE v_full_boxes * v_pieces_per_box
    END;

    IF v_pieces_per_box = 1 AND v_partial_units <> 0 THEN
      RAISE EXCEPTION 'invalid_partial_for_unit_box'
        USING DETAIL = 'Item ' || v_item_id::TEXT || ' has pieces_per_box=1; partial-box units cannot occur.';
    END IF;

    IF v_partial_units > 0 AND v_reason IS NULL THEN
      RAISE EXCEPTION 'partial_box_reason_required'
        USING DETAIL = 'Item ' || v_item_id::TEXT || ' has ' || v_partial_units::TEXT ||
                       ' loose units; partial_box_reason is required.';
    END IF;

    IF v_reason IS NOT NULL AND v_reason NOT IN (
      'damaged_in_transit','supplier_short_pack','miscount_pending_recount','sample_pulled_qc','other'
    ) THEN
      RAISE EXCEPTION 'invalid_partial_box_reason'
        USING DETAIL = 'partial_box_reason must be one of: damaged_in_transit, supplier_short_pack, miscount_pending_recount, sample_pulled_qc, other';
    END IF;

    IF v_qty_received > v_qty_ordered AND NOT v_overage_ack THEN
      RAISE EXCEPTION 'overage_not_acknowledged'
        USING DETAIL = 'Item ' || v_item_id::TEXT || ' received ' || v_qty_received::TEXT ||
                       ' but ordered ' || v_qty_ordered::TEXT ||
                       '. Set overage_acknowledged=true to confirm.';
    END IF;

    IF v_qty_received = 0 THEN
      UPDATE purchase_order_items
      SET    quantity_received = 0, full_boxes_received = 0, partial_box_units = 0,
             partial_box_reason = NULL, partial_box_note = NULL, overage_acknowledged = FALSE
      WHERE  purchase_order_id = p_purchase_order_id AND item_id = v_item_id;

      v_items_skipped := v_items_skipped + 1;
      v_item_results  := v_item_results || jsonb_build_object(
        'item_id', v_item_id, 'qty_received', 0, 'qty_ordered', v_qty_ordered,
        'skipped', true, 'skip_reason', 'quantity_received is zero'
      );
      CONTINUE;
    END IF;

    -- ── Stock: ONLY full-box units land in item_locations ──
    SELECT id, current_quantity INTO v_item_location_id, v_prev_quantity
    FROM   item_locations
    WHERE  item_id = v_item_id AND location_id = v_warehouse_location_id AND storage_space_id IS NULL
    FOR UPDATE;

    IF v_full_box_units > 0 THEN
      IF FOUND THEN
        v_new_quantity := v_prev_quantity + v_full_box_units;
        UPDATE item_locations SET current_quantity = v_new_quantity, last_updated = NOW()
        WHERE  id = v_item_location_id;
      ELSE
        v_prev_quantity := 0;
        v_new_quantity  := v_full_box_units;
        INSERT INTO item_locations (organization_id, item_id, location_id, storage_space_id, current_quantity, last_updated)
        VALUES (v_po.organization_id, v_item_id, v_warehouse_location_id, NULL, v_new_quantity, NOW())
        RETURNING id INTO v_item_location_id;
      END IF;

      INSERT INTO inventory_logs (
        organization_id, item_id, location_id, storage_space_id,
        user_id, previous_quantity, new_quantity, quantity_change, action_type, notes
      ) VALUES (
        v_po.organization_id, v_item_id, v_warehouse_location_id, NULL,
        p_user_id, v_prev_quantity, v_new_quantity, v_full_box_units, 'received',
        'PO received: ' || v_po.po_number ||
          CASE WHEN v_qty_received <> v_qty_ordered
               THEN ' (ordered ' || v_qty_ordered::TEXT || ', received ' || v_qty_received::TEXT || ')'
               ELSE '' END
      );
    ELSE
      -- No full boxes received; ensure prev_quantity is set for the discrepancy log below.
      IF NOT FOUND THEN v_prev_quantity := 0; v_new_quantity := 0; ELSE v_new_quantity := v_prev_quantity; END IF;
    END IF;

    -- ── Discrepancy: loose units logged but NOT added to stock ──
    IF v_partial_units > 0 THEN
      INSERT INTO inventory_logs (
        organization_id, item_id, location_id, storage_space_id,
        user_id, previous_quantity, new_quantity, quantity_change, action_type, notes
      ) VALUES (
        v_po.organization_id, v_item_id, v_warehouse_location_id, NULL,
        p_user_id, v_new_quantity, v_new_quantity, 0, 'discrepancy',
        'PO ' || v_po.po_number || ': ' || v_partial_units::TEXT ||
        ' loose pcs held aside (' || v_reason || ')' ||
        CASE WHEN v_note IS NOT NULL THEN ' — ' || v_note ELSE '' END
      );
    END IF;

    INSERT INTO item_cost_history (
      organization_id, item_id, purchase_order_id, unit_price_before, unit_cost_after, effective_date
    ) VALUES (
      v_po.organization_id, v_item_id, p_purchase_order_id, v_unit_price_before, v_unit_cost_after,
      COALESCE(v_po.actual_arrival, CURRENT_DATE)
    )
    ON CONFLICT (item_id, purchase_order_id) DO NOTHING;

    UPDATE items SET current_unit_cost = v_unit_cost_after WHERE id = v_item_id;

    UPDATE purchase_order_items
    SET    quantity_received = v_qty_received,
           full_boxes_received = v_full_boxes,
           partial_box_units = v_partial_units,
           partial_box_reason = v_reason,
           partial_box_note = v_note,
           overage_acknowledged = v_overage_ack
    WHERE  purchase_order_id = p_purchase_order_id AND item_id = v_item_id;

    v_items_received       := v_items_received + 1;
    v_total_units_received := v_total_units_received + v_qty_received;

    v_item_results := v_item_results || jsonb_build_object(
      'item_id', v_item_id, 'qty_ordered', v_qty_ordered, 'qty_received', v_qty_received,
      'full_boxes_received', v_full_boxes, 'partial_box_units', v_partial_units,
      'partial_box_reason', v_reason, 'discrepancy', v_qty_received <> v_qty_ordered,
      'units_added_to_stock', v_full_box_units,
      'units_held_as_discrepancy', v_partial_units,
      'prev_warehouse_qty', v_prev_quantity, 'new_warehouse_qty', v_new_quantity,
      'unit_cost_after', v_unit_cost_after
    );
  END LOOP;

  UPDATE purchase_orders
  SET    status = 'received', actual_arrival = COALESCE(actual_arrival, CURRENT_DATE)
  WHERE  id = p_purchase_order_id;

  RETURN jsonb_build_object(
    'po_id', p_purchase_order_id, 'po_number', v_po.po_number, 'status', 'received',
    'items_received', v_items_received, 'items_skipped', v_items_skipped,
    'total_units_received', v_total_units_received,
    'has_discrepancies', EXISTS (SELECT 1 FROM jsonb_array_elements(v_item_results) r WHERE (r->>'discrepancy')::BOOLEAN = TRUE),
    'items', v_item_results
  );
END;
$function$;

-- NEW: receive_shipment_to_pallets(p_purchase_order_id uuid, p_pallet_
CREATE OR REPLACE FUNCTION public.receive_shipment_to_pallets(p_purchase_order_id uuid, p_pallet_assignments jsonb, p_user_id text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_org_id              TEXT;
  v_warehouse_loc_id    UUID;
  v_po_number           TEXT;

  v_pallet_json         JSONB;
  v_item_json           JSONB;
  v_config_json         JSONB;

  v_pallet_label        TEXT;
  v_storage_space_id    UUID;
  v_pallet_id           UUID;

  v_item_id             BIGINT;
  v_poi_id              UUID;
  v_box_configs         JSONB;
  v_ppb_override        INTEGER;

  v_pieces_per_box      INTEGER;
  v_box_count           INTEGER;
  v_total_boxes         INTEGER;

  v_dominant_ppb        INTEGER;
  v_dominant_count      INTEGER;

  v_pi_id               UUID;

  v_pallets_created     INTEGER := 0;
  v_configs_inserted    INTEGER := 0;
  v_locations_synced    INTEGER := 0;
  v_result              JSONB;
  v_pallet_results      JSONB := '[]'::JSONB;

BEGIN
  -- ── 0. Auth ──────────────────────────────────────────────
  IF NOT EXISTS (
    SELECT 1 FROM users
    WHERE id = p_user_id AND role = 'super_admin'
  ) THEN
    RAISE EXCEPTION 'PERMISSION_DENIED: only super_admin can receive shipments';
  END IF;

  -- ── 1. Load PO context ───────────────────────────────────
  SELECT po.organization_id, po.warehouse_location_id, po.po_number
    INTO v_org_id, v_warehouse_loc_id, v_po_number
    FROM purchase_orders po
   WHERE po.id = p_purchase_order_id;

  IF v_org_id IS NULL THEN
    RAISE EXCEPTION 'PO_NOT_FOUND: purchase order % does not exist', p_purchase_order_id;
  END IF;

  IF v_warehouse_loc_id IS NULL THEN
    SELECT id INTO v_warehouse_loc_id
      FROM locations
     WHERE organization_id = v_org_id
       AND location_type   = 'warehouse'
     LIMIT 1;
  END IF;

  IF v_warehouse_loc_id IS NULL THEN
    RAISE EXCEPTION 'NO_WAREHOUSE_FOUND: no warehouse location found for organization %', v_org_id;
  END IF;

  -- ── 2. Validate input ────────────────────────────────────
  IF p_pallet_assignments IS NULL OR jsonb_array_length(p_pallet_assignments) = 0 THEN
    RAISE EXCEPTION 'INVALID_INPUT: p_pallet_assignments must be a non-empty JSON array';
  END IF;

  -- ── 3. Loop over pallets ─────────────────────────────────
  FOR v_pallet_json IN SELECT jsonb_array_elements(p_pallet_assignments)
  LOOP
    v_pallet_label     := v_pallet_json->>'pallet_label';
    v_storage_space_id := (v_pallet_json->>'storage_space_id')::UUID;

    IF v_pallet_label IS NULL OR trim(v_pallet_label) = '' THEN
      RAISE EXCEPTION 'INVALID_INPUT: every pallet entry must have a pallet_label';
    END IF;

    IF v_pallet_json->'items' IS NULL OR
       jsonb_array_length(v_pallet_json->'items') = 0 THEN
      RAISE EXCEPTION 'INVALID_INPUT: pallet % has no items', v_pallet_label;
    END IF;

    -- ── 3a. Create or reuse pallet ────────────────────────
    SELECT id INTO v_pallet_id
      FROM warehouse_pallets
     WHERE organization_id = v_org_id
       AND pallet_label    = v_pallet_label;

    IF v_pallet_id IS NULL THEN
      INSERT INTO warehouse_pallets (
        organization_id, warehouse_location_id, storage_space_id,
        purchase_order_id, pallet_label, status, received_at
      ) VALUES (
        v_org_id, v_warehouse_loc_id, v_storage_space_id,
        p_purchase_order_id, v_pallet_label, 'active', NOW()
      )
      RETURNING id INTO v_pallet_id;
      v_pallets_created := v_pallets_created + 1;
    END IF;

    -- ── 3b. Loop over items ───────────────────────────────
    FOR v_item_json IN SELECT jsonb_array_elements(v_pallet_json->'items')
    LOOP
      v_item_id      := (v_item_json->>'item_id')::BIGINT;
      v_poi_id       := (v_item_json->>'purchase_order_item_id')::UUID;
      v_ppb_override := (v_item_json->>'pieces_per_box_override')::INTEGER;

      IF v_item_id IS NULL THEN
        RAISE EXCEPTION 'INVALID_INPUT: item entry missing item_id on pallet %', v_pallet_label;
      END IF;

      -- Backwards compat: wrap legacy pieces_per_box field
      IF v_item_json->'box_configs' IS NULL THEN
        IF v_item_json->>'pieces_per_box' IS NOT NULL THEN
          v_box_configs := jsonb_build_array(
            jsonb_build_object(
              'pieces_per_box', (v_item_json->>'pieces_per_box')::INTEGER,
              'box_count',      (v_item_json->>'box_count')::INTEGER
            )
          );
        ELSE
          v_box_configs := NULL;
        END IF;
      ELSE
        v_box_configs := v_item_json->'box_configs';
      END IF;

      -- Validate
      IF v_box_configs IS NOT NULL THEN
        IF jsonb_array_length(v_box_configs) = 0 THEN
          RAISE EXCEPTION 'INVALID_INPUT: box_configs for item % on pallet % is empty',
            v_item_id, v_pallet_label;
        END IF;

        FOR v_config_json IN SELECT jsonb_array_elements(v_box_configs)
        LOOP
          v_pieces_per_box := (v_config_json->>'pieces_per_box')::INTEGER;
          v_box_count      := (v_config_json->>'box_count')::INTEGER;

          IF v_pieces_per_box IS NULL OR v_pieces_per_box <= 0 THEN
            RAISE EXCEPTION 'INVALID_INPUT: pieces_per_box must be > 0 (item %, pallet %)',
              v_item_id, v_pallet_label;
          END IF;
          IF v_box_count IS NULL OR v_box_count <= 0 THEN
            RAISE EXCEPTION 'INVALID_INPUT: box_count must be > 0 (item %, pallet %)',
              v_item_id, v_pallet_label;
          END IF;
        END LOOP;
      END IF;

      -- ── 3c. Sum total boxes ───────────────────────────────
      IF v_box_configs IS NOT NULL THEN
        SELECT COALESCE(SUM((cfg->>'box_count')::INTEGER), 0)
          INTO v_total_boxes
          FROM jsonb_array_elements(v_box_configs) AS cfg;
      ELSE
        v_total_boxes := 0;
      END IF;

      -- ── 3d. pallet_inventory row ──────────────────────────
      INSERT INTO pallet_inventory (
        pallet_id, item_id, purchase_order_item_id,
        box_count, initial_box_count, pieces_per_box_override
      ) VALUES (
        v_pallet_id, v_item_id, v_poi_id,
        v_total_boxes, GREATEST(v_total_boxes, 1), v_ppb_override
      )
      ON CONFLICT (pallet_id, item_id, purchase_order_item_id)
      DO UPDATE SET
        box_count         = pallet_inventory.box_count + EXCLUDED.box_count,
        initial_box_count = pallet_inventory.initial_box_count + EXCLUDED.initial_box_count
      RETURNING id INTO v_pi_id;

      -- ── 3e. po_item_box_configs + has_mixed_configs ───────
      IF v_box_configs IS NOT NULL AND v_poi_id IS NOT NULL THEN

        v_dominant_ppb   := NULL;
        v_dominant_count := 0;

        FOR v_config_json IN SELECT jsonb_array_elements(v_box_configs)
        LOOP
          v_pieces_per_box := (v_config_json->>'pieces_per_box')::INTEGER;
          v_box_count      := (v_config_json->>'box_count')::INTEGER;

          INSERT INTO po_item_box_configs (
            purchase_order_item_id,
            pieces_per_box,
            box_count
          ) VALUES (
            v_poi_id,
            v_pieces_per_box,
            v_box_count
          )
          ON CONFLICT (purchase_order_item_id, pieces_per_box)
          DO UPDATE SET
            box_count = po_item_box_configs.box_count + EXCLUDED.box_count;

          v_configs_inserted := v_configs_inserted + 1;

          IF v_box_count > v_dominant_count THEN
            v_dominant_count := v_box_count;
            v_dominant_ppb   := v_pieces_per_box;
          END IF;
        END LOOP;

        -- Explicit update — does not rely on the trigger being present.
        -- The trigger (sync_has_mixed_configs) will also fire, but this
        -- guarantees correctness even if the trigger was never deployed.
        UPDATE purchase_order_items
           SET has_mixed_configs = (
                 SELECT COUNT(*) > 1
                   FROM po_item_box_configs
                  WHERE purchase_order_item_id = v_poi_id
               ),
               pieces_per_box = v_dominant_ppb
         WHERE id = v_poi_id;

        UPDATE items
           SET box_quantity = v_dominant_ppb
         WHERE id = v_item_id;

      END IF;

      -- ── 3f. Audit log ─────────────────────────────────────
      INSERT INTO pallet_operations_log (
        organization_id, pallet_id, operation_type,
        item_id, box_count_change, performed_by, notes
      ) VALUES (
        v_org_id, v_pallet_id, 'loaded',
        v_item_id, v_total_boxes, p_user_id,
        format('Received via PO %s', p_purchase_order_id)
      );

    END LOOP; -- items
    v_pallet_results := v_pallet_results || jsonb_build_object(
      'pallet_label', v_pallet_label,
      'pallet_id',    v_pallet_id
    );
  END LOOP; -- pallets

  -- ── 4. Sync item_locations (Phase A may have been skipped) ──────────
  WITH new_locations AS (
    INSERT INTO item_locations (
      organization_id, item_id, location_id, storage_space_id,
      current_quantity, last_updated
    )
    SELECT
      v_org_id, poi.item_id, v_warehouse_loc_id, NULL,
      COALESCE(poi.quantity_received, poi.quantity_ordered), NOW()
    FROM purchase_order_items poi
    WHERE poi.purchase_order_id = p_purchase_order_id
      AND NOT EXISTS (
        SELECT 1 FROM item_locations il
        WHERE il.item_id     = poi.item_id
          AND il.location_id = v_warehouse_loc_id
          AND il.storage_space_id IS NULL
      )
    RETURNING item_id, current_quantity
  )
  INSERT INTO inventory_logs (
    organization_id, item_id, location_id, storage_space_id,
    user_id, previous_quantity, new_quantity, quantity_change,
    action_type, notes
  )
  SELECT
    v_org_id, nl.item_id, v_warehouse_loc_id, NULL,
    p_user_id, 0, nl.current_quantity, nl.current_quantity,
    'received', 'PO received (pallet assignment phase): ' || v_po_number
  FROM new_locations nl;

  GET DIAGNOSTICS v_locations_synced = ROW_COUNT;

  -- ── 5. Mark PO as received ───────────────────────────────
  UPDATE purchase_orders
     SET status     = 'received',
         updated_at = NOW()
   WHERE id = p_purchase_order_id;

  -- ── 6. Return summary ────────────────────────────────────
  v_result := jsonb_build_object(
    'success',            true,
    'purchase_order_id',  p_purchase_order_id,
    'pallets_created',    v_pallets_created,
    'configs_inserted',   v_configs_inserted,
    'locations_synced',   v_locations_synced,
    'pallets',            v_pallet_results
  );

  RETURN v_result;

EXCEPTION
  WHEN OTHERS THEN
    RAISE;
END;
$function$;

-- NEW: reject_inventory_update_request(p_request_id uuid, p_reviewed_b
CREATE OR REPLACE FUNCTION public.reject_inventory_update_request(p_request_id uuid, p_reviewed_by text, p_review_note text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  UPDATE public.inventory_update_requests
  SET status      = 'rejected',
      reviewed_by = p_reviewed_by,
      reviewed_at = NOW(),
      review_note = p_review_note
  WHERE id = p_request_id AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Request % not found or not pending', p_request_id;
  END IF;
END;
$function$;

-- UPDATED: requesting_user_id()
CREATE OR REPLACE FUNCTION public.requesting_user_id()
 RETURNS text
 LANGUAGE sql
 STABLE
AS $function$
    SELECT auth.jwt() ->> 'sub';
$function$;

-- NEW: snapshot_transfer_prices_on_submit()
CREATE OR REPLACE FUNCTION public.snapshot_transfer_prices_on_submit()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_missing_count INT;
  v_missing_names TEXT;
BEGIN
  IF OLD.status = 'draft' AND NEW.status = 'submitted' THEN

    -- Check for any warehouse items in this ticket that have no price set
    SELECT COUNT(*), string_agg(i.name, ', ' ORDER BY i.name)
      INTO v_missing_count, v_missing_names
      FROM public.order_ticket_items oti
      JOIN public.items i ON i.id = oti.item_id
      LEFT JOIN public.item_warehouse_pricing iwp ON iwp.item_id = oti.item_id
     WHERE oti.ticket_id = NEW.id
       AND iwp.item_id IS NULL;

    IF v_missing_count > 0 THEN
      RAISE EXCEPTION 'Cannot submit ticket: % item(s) have no transfer price set (%). Super admin must set prices before this order can be submitted.',
        v_missing_count, v_missing_names
        USING ERRCODE = 'check_violation';
    END IF;

    -- Snapshot current prices into order lines
    UPDATE public.order_ticket_items oti
       SET unit_price_at_time = iwp.warehouse_transfer_price,
           price_locked_at    = NOW()
      FROM public.item_warehouse_pricing iwp
     WHERE oti.ticket_id = NEW.id
       AND oti.item_id = iwp.item_id;

  END IF;
  RETURN NEW;
END; $function$;

-- NEW: sync_has_mixed_configs()
CREATE OR REPLACE FUNCTION public.sync_has_mixed_configs()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_poi_id       UUID;
  v_config_count INTEGER;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_poi_id := OLD.purchase_order_item_id;
  ELSE
    v_poi_id := NEW.purchase_order_item_id;
  END IF;

  SELECT COUNT(*)
    INTO v_config_count
    FROM po_item_box_configs
   WHERE purchase_order_item_id = v_poi_id;

  UPDATE purchase_order_items
     SET has_mixed_configs = (v_config_count > 1)
   WHERE id = v_poi_id;

  RETURN NULL;
END;
$function$;

-- NEW: sync_warehouse_inventory_commit_fn()
CREATE OR REPLACE FUNCTION public.sync_warehouse_inventory_commit_fn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_item          RECORD;
  v_location      RECORD;
  v_new_qty       NUMERIC(10,2);
BEGIN
  -- For each distinct item touched this transaction
  FOR v_item IN SELECT item_id FROM _sync_affected_items LOOP

    -- Find the warehouse location(s) this item exists in
    FOR v_location IN
      SELECT DISTINCT wp.warehouse_location_id AS location_id
      FROM pallet_inventory pi
      JOIN warehouse_pallets wp ON wp.id = pi.pallet_id
      WHERE pi.item_id = v_item.item_id
        AND wp.status IN ('active', 'empty')
    LOOP

      -- Recalculate total warehouse quantity: SUM(box_count × effective_ppb)
      SELECT COALESCE(SUM(
        pi.box_count * COALESCE(
          pi.pieces_per_box_override,
          poi.pieces_per_box,
          i.box_quantity
        )
      ), 0)
      INTO v_new_qty
      FROM pallet_inventory pi
      JOIN warehouse_pallets wp ON wp.id = pi.pallet_id
      JOIN items i ON i.id = pi.item_id
      LEFT JOIN purchase_order_items poi ON poi.id = pi.purchase_order_item_id
      WHERE pi.item_id = v_item.item_id
        AND wp.warehouse_location_id = v_location.location_id
        AND wp.status = 'active';

      -- Update item_locations — this fires check_low_stock_trigger automatically
      UPDATE item_locations
      SET current_quantity = v_new_qty,
          last_updated = NOW()
      WHERE item_id = v_item.item_id
        AND location_id = v_location.location_id;

    END LOOP;
  END LOOP;

  RETURN NULL;
END;
$function$;

-- NEW: sync_warehouse_inventory_fn()
CREATE OR REPLACE FUNCTION public.sync_warehouse_inventory_fn()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
DECLARE
  v_item_id         BIGINT;
  v_pallet_id       UUID;
  v_location_id     UUID;
  v_new_quantity    NUMERIC(10,2);
BEGIN
  -- Determine the affected item_id and pallet_id from the triggering row
  v_item_id   := COALESCE(NEW.item_id, OLD.item_id);
  v_pallet_id := COALESCE(NEW.pallet_id, OLD.pallet_id);

  -- Get the warehouse location from the pallet
  SELECT wp.warehouse_location_id
  INTO v_location_id
  FROM warehouse_pallets wp
  WHERE wp.id = v_pallet_id;

  IF v_location_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Dedup: only recalculate once per item+location per transaction
  CREATE TEMP TABLE IF NOT EXISTS _sync_affected_items (
    item_id   BIGINT,
    loc_id    UUID,
    PRIMARY KEY (item_id, loc_id)
  ) ON COMMIT DROP;

  BEGIN
    INSERT INTO _sync_affected_items (item_id, loc_id)
    VALUES (v_item_id, v_location_id);
  EXCEPTION WHEN unique_violation THEN
    -- Already synced this item+location in this transaction, skip
    RETURN NEW;
  END;

  -- Recalculate total pieces for this item at this warehouse location
  SELECT COALESCE(SUM(
    pi.box_count * COALESCE(
      pi.pieces_per_box_override,
      poi.pieces_per_box,
      i.box_quantity,
      1
    )
  ), 0)
  INTO v_new_quantity
  FROM pallet_inventory pi
  JOIN warehouse_pallets wp ON wp.id = pi.pallet_id
  JOIN items i ON i.id = pi.item_id
  LEFT JOIN purchase_order_items poi ON poi.id = pi.purchase_order_item_id
  WHERE pi.item_id = v_item_id
    AND wp.warehouse_location_id = v_location_id
    AND wp.status IN ('active', 'empty');

  -- Update item_locations if the row exists.
  -- This fires the check_low_stock trigger on item_locations.
  -- If no row exists yet (e.g. during initial pallet setup before
  -- item_locations are seeded), silently do nothing.
  UPDATE item_locations
  SET
    current_quantity = v_new_quantity,
    last_updated     = NOW()
  WHERE item_id          = v_item_id
    AND location_id      = v_location_id
    AND storage_space_id IS NULL;

  -- No INSERT fallback — item_locations rows are created by RPCs and seed data,
  -- not by the sync trigger.

  RETURN NEW;
END;
$function$;

-- NEW: take_warehouse_rent_snapshot(p_organization_id text)
CREATE OR REPLACE FUNCTION public.take_warehouse_rent_snapshot(p_organization_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_pallet_count  INTEGER;
  v_rate          NUMERIC(10,2);
  v_total         NUMERIC(12,2);
BEGIN
  -- Count active pallets as of today (1st of month snapshot)
  -- Per spec: if active on the 1st, counts for the full month
  SELECT COUNT(*) INTO v_pallet_count
  FROM warehouse_pallets
  WHERE organization_id = p_organization_id
    AND status = 'active'
    AND (retired_at IS NULL OR retired_at::date >= DATE_TRUNC('month', NOW()));

  -- Get current rate from org settings (falls back to $65/pallet default from spec)
  -- Replace with actual org_settings lookup when that table exists
  v_rate := 65.00;

  v_total := v_pallet_count * v_rate;

  INSERT INTO warehouse_rent_snapshots (
    organization_id,
    snapshot_date,
    active_pallet_count,
    rate_per_pallet,
    total_cost
  ) VALUES (
    p_organization_id,
    CURRENT_DATE,
    v_pallet_count,
    v_rate,
    v_total
  )
  ON CONFLICT (organization_id, snapshot_date)
  DO UPDATE SET
    active_pallet_count = EXCLUDED.active_pallet_count,
    total_cost          = EXCLUDED.total_cost;
END;
$function$;

-- NEW: touch_purchase_order_updated_at()
CREATE OR REPLACE FUNCTION public.touch_purchase_order_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  UPDATE purchase_orders
  SET    updated_at = NOW()
  WHERE  id = COALESCE(NEW.purchase_order_id, OLD.purchase_order_id);
  RETURN NEW;
END;
$function$;

-- NEW: validate_pallet_selection(p_ticket_id uuid, p_pallet_selection 
CREATE OR REPLACE FUNCTION public.validate_pallet_selection(p_ticket_id uuid, p_pallet_selection jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
AS $function$
DECLARE
  v_ticket          order_tickets%ROWTYPE;
  v_selection       JSONB;
  v_item_id         BIGINT;
  v_pallet_id       UUID;
  v_boxes_to_take   INTEGER;
  v_ticket_item     order_ticket_items%ROWTYPE;
  v_pallet          warehouse_pallets%ROWTYPE;
  v_pallet_inv      pallet_inventory%ROWTYPE;
  v_item_totals     JSONB := '{}';
  v_current_total   INTEGER;
  v_errors          JSONB := '[]';
  v_warnings        JSONB := '[]';
  v_is_valid        BOOLEAN := TRUE;
BEGIN

  -- ================================================================
  -- STEP 1: Verify ticket exists and is fulfillable
  -- ================================================================
  SELECT * INTO v_ticket
  FROM order_tickets
  WHERE id = p_ticket_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ticket % not found', p_ticket_id;
  END IF;

  IF v_ticket.status NOT IN ('submitted', 'processing') THEN
    v_errors := v_errors || jsonb_build_object(
      'type',    'invalid_status',
      'message', 'Ticket status is ' || v_ticket.status ||
                 '. Must be submitted or processing.'
    );
    v_is_valid := FALSE;
  END IF;

  -- ================================================================
  -- STEP 2: Validate each selection line
  -- ================================================================
  FOR v_selection IN SELECT * FROM jsonb_array_elements(p_pallet_selection)
  LOOP
    v_item_id       := (v_selection->>'item_id')::BIGINT;
    v_pallet_id     := (v_selection->>'pallet_id')::UUID;
    v_boxes_to_take := (v_selection->>'boxes_to_take')::INTEGER;

    -- boxes_to_take must be positive
    IF v_boxes_to_take <= 0 THEN
      v_errors := v_errors || jsonb_build_object(
        'type',     'invalid_quantity',
        'item_id',  v_item_id,
        'pallet_id', v_pallet_id,
        'message',  'boxes_to_take must be greater than 0'
      );
      v_is_valid := FALSE;
      CONTINUE;
    END IF;

    -- Item must exist on this ticket
    SELECT * INTO v_ticket_item
    FROM order_ticket_items
    WHERE ticket_id = p_ticket_id
      AND item_id   = v_item_id;

    IF NOT FOUND THEN
      v_errors := v_errors || jsonb_build_object(
        'type',    'item_not_on_ticket',
        'item_id', v_item_id,
        'message', 'Item ' || v_item_id || ' is not part of this ticket'
      );
      v_is_valid := FALSE;
      CONTINUE;
    END IF;

    -- Pallet must exist, be active, and belong to this warehouse
    SELECT * INTO v_pallet
    FROM warehouse_pallets
    WHERE id = v_pallet_id
      AND warehouse_location_id = v_ticket.warehouse_location_id
      AND status = 'active';

    IF NOT FOUND THEN
      v_errors := v_errors || jsonb_build_object(
        'type',      'invalid_pallet',
        'pallet_id', v_pallet_id,
        'message',   'Pallet not found, inactive, or belongs to a different warehouse'
      );
      v_is_valid := FALSE;
      CONTINUE;
    END IF;

    -- Pallet must actually have this item
    SELECT * INTO v_pallet_inv
    FROM pallet_inventory
    WHERE pallet_id = v_pallet_id
      AND item_id   = v_item_id;

    IF NOT FOUND THEN
      v_errors := v_errors || jsonb_build_object(
        'type',      'item_not_on_pallet',
        'item_id',   v_item_id,
        'pallet_id', v_pallet_id,
        'message',   'Item ' || v_item_id || ' is not on pallet ' || v_pallet_id
      );
      v_is_valid := FALSE;
      CONTINUE;
    END IF;

    -- Pallet must have enough boxes for this line
    IF v_pallet_inv.box_count < v_boxes_to_take THEN
      v_errors := v_errors || jsonb_build_object(
        'type',       'insufficient_pallet_stock',
        'item_id',    v_item_id,
        'pallet_id',  v_pallet_id,
        'requested',  v_boxes_to_take,
        'available',  v_pallet_inv.box_count,
        'message',    'Pallet only has ' || v_pallet_inv.box_count ||
                      ' boxes but ' || v_boxes_to_take || ' were selected'
      );
      v_is_valid := FALSE;
      CONTINUE;
    END IF;

    -- Accumulate per-item totals to check against ticket quantities
    v_current_total := COALESCE(
      (v_item_totals->>v_item_id::TEXT)::INTEGER, 0
    );
    v_item_totals := jsonb_set(
      v_item_totals,
      ARRAY[v_item_id::TEXT],
      to_jsonb(v_current_total + v_boxes_to_take)
    );

  END LOOP;

  -- ================================================================
  -- STEP 3: Verify per-item totals match ticket quantities
  -- ================================================================
  FOR v_ticket_item IN
    SELECT * FROM order_ticket_items WHERE ticket_id = p_ticket_id
  LOOP
    v_current_total := COALESCE(
      (v_item_totals->>v_ticket_item.item_id::TEXT)::INTEGER, 0
    );

    IF v_current_total < v_ticket_item.quantity_boxes THEN
      -- Under-selection: not enough pallets chosen for this item
      v_errors := v_errors || jsonb_build_object(
        'type',      'under_selected',
        'item_id',   v_ticket_item.item_id,
        'required',  v_ticket_item.quantity_boxes,
        'selected',  v_current_total,
        'shortfall', v_ticket_item.quantity_boxes - v_current_total,
        'message',   'Only ' || v_current_total || ' of ' ||
                     v_ticket_item.quantity_boxes ||
                     ' required boxes selected for item ' ||
                     v_ticket_item.item_id
      );
      v_is_valid := FALSE;

    ELSIF v_current_total > v_ticket_item.quantity_boxes THEN
      -- Over-selection: more boxes selected than the ticket needs
      -- This is a warning, not an error — we can truncate the excess
      v_warnings := v_warnings || jsonb_build_object(
        'type',    'over_selected',
        'item_id', v_ticket_item.item_id,
        'required', v_ticket_item.quantity_boxes,
        'selected', v_current_total,
        'excess',   v_current_total - v_ticket_item.quantity_boxes,
        'message',  v_current_total - v_ticket_item.quantity_boxes ||
                    ' excess boxes selected for item ' ||
                    v_ticket_item.item_id ||
                    '. Excess will be ignored.'
      );
    END IF;

  END LOOP;

  -- ================================================================
  -- STEP 4: Return validation result
  -- ================================================================
  RETURN jsonb_build_object(
    'is_valid',  v_is_valid,
    'errors',    v_errors,
    'warnings',  v_warnings
  );

END;
$function$;


-- 4. Constraints (PK/unique/check first, then foreign keys)
ALTER TABLE public."inventory_update_requests" ADD CONSTRAINT "inventory_update_requests_pkey" PRIMARY KEY (id);
ALTER TABLE public."item_cost_history" ADD CONSTRAINT "item_cost_history_pkey" PRIMARY KEY (id);
ALTER TABLE public."item_warehouse_pricing" ADD CONSTRAINT "item_warehouse_pricing_pkey" PRIMARY KEY (item_id);
ALTER TABLE public."order_ticket_fulfillment_lines" ADD CONSTRAINT "order_ticket_fulfillment_lines_pkey" PRIMARY KEY (id);
ALTER TABLE public."pallet_inventory" ADD CONSTRAINT "pallet_inventory_pkey" PRIMARY KEY (id);
ALTER TABLE public."pallet_operations_log" ADD CONSTRAINT "pallet_operations_log_pkey" PRIMARY KEY (id);
ALTER TABLE public."po_item_box_configs" ADD CONSTRAINT "po_item_box_configs_pkey" PRIMARY KEY (id);
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_pkey" PRIMARY KEY (id);
ALTER TABLE public."purchase_orders" ADD CONSTRAINT "purchase_orders_pkey" PRIMARY KEY (id);
ALTER TABLE public."store_purchase_items" ADD CONSTRAINT "store_purchase_items_pkey" PRIMARY KEY (id);
ALTER TABLE public."store_purchases" ADD CONSTRAINT "store_purchases_pkey" PRIMARY KEY (id);
ALTER TABLE public."ticket_deliveries" ADD CONSTRAINT "ticket_deliveries_pkey" PRIMARY KEY (id);
ALTER TABLE public."user_location_assignments" ADD CONSTRAINT "user_location_assignments_pkey" PRIMARY KEY (id);
ALTER TABLE public."warehouse_expense_rates" ADD CONSTRAINT "warehouse_expense_rates_pkey" PRIMARY KEY (id);
ALTER TABLE public."warehouse_expenses" ADD CONSTRAINT "warehouse_expenses_pkey" PRIMARY KEY (id);
ALTER TABLE public."warehouse_pallets" ADD CONSTRAINT "warehouse_pallets_pkey" PRIMARY KEY (id);
ALTER TABLE public."warehouse_rent_snapshots" ADD CONSTRAINT "warehouse_rent_snapshots_pkey" PRIMARY KEY (id);
ALTER TABLE public."warehouse_transfer_price_history" ADD CONSTRAINT "warehouse_transfer_price_history_pkey" PRIMARY KEY (id);
ALTER TABLE public."daily_summary_preferences" ADD CONSTRAINT "daily_summary_preferences_org_location_unique" UNIQUE (organization_id, location_id);
ALTER TABLE public."item_cost_history" ADD CONSTRAINT "item_cost_history_item_po_unique" UNIQUE (item_id, purchase_order_id);
ALTER TABLE public."notification_preferences" ADD CONSTRAINT "notification_preferences_org_location_unique" UNIQUE (organization_id, location_id);
ALTER TABLE public."pallet_inventory" ADD CONSTRAINT "pallet_inventory_unique" UNIQUE (pallet_id, item_id, purchase_order_item_id);
ALTER TABLE public."po_item_box_configs" ADD CONSTRAINT "uq_po_item_box_configs_item_ppb" UNIQUE (purchase_order_item_id, pieces_per_box);
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_item_unique" UNIQUE (purchase_order_id, item_id);
ALTER TABLE public."purchase_orders" ADD CONSTRAINT "purchase_orders_po_number_org_unique" UNIQUE (organization_id, po_number);
ALTER TABLE public."user_location_assignments" ADD CONSTRAINT "user_location_assignments_user_id_location_id_key" UNIQUE (user_id, location_id);
ALTER TABLE public."warehouse_expense_rates" ADD CONSTRAINT "warehouse_expense_rates_org_type_unique" UNIQUE (organization_id, expense_type);
ALTER TABLE public."warehouse_pallets" ADD CONSTRAINT "warehouse_pallets_org_label_unique" UNIQUE (organization_id, pallet_label);
ALTER TABLE public."warehouse_rent_snapshots" ADD CONSTRAINT "warehouse_rent_snapshots_unique" UNIQUE (organization_id, snapshot_date);
ALTER TABLE public."email_delivery_logs" DROP CONSTRAINT IF EXISTS "email_delivery_logs_email_type_check";
ALTER TABLE public."email_delivery_logs" ADD CONSTRAINT "email_delivery_logs_email_type_check" CHECK ((email_type = ANY (ARRAY['low_stock_alert'::text, 'low_stock_digest'::text, 'daily_summary'::text, 'inventory_adjustment_request'::text])));
ALTER TABLE public."inventory_update_requests" ADD CONSTRAINT "inventory_update_requests_action_type_check" CHECK ((action_type = ANY (ARRAY['count'::text, 'adjustment'::text, 'used'::text])));
ALTER TABLE public."inventory_update_requests" ADD CONSTRAINT "inventory_update_requests_new_quantity_check" CHECK ((new_quantity >= (0)::numeric));
ALTER TABLE public."inventory_update_requests" ADD CONSTRAINT "inventory_update_requests_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])));
ALTER TABLE public."item_cost_history" ADD CONSTRAINT "item_cost_history_cost_gte_price" CHECK ((unit_cost_after >= unit_price_before));
ALTER TABLE public."item_cost_history" ADD CONSTRAINT "item_cost_history_unit_cost_nonneg" CHECK ((unit_cost_after >= (0)::numeric));
ALTER TABLE public."item_cost_history" ADD CONSTRAINT "item_cost_history_unit_price_nonneg" CHECK ((unit_price_before >= (0)::numeric));
ALTER TABLE public."item_warehouse_pricing" ADD CONSTRAINT "item_warehouse_pricing_warehouse_transfer_price_check" CHECK ((warehouse_transfer_price > (0)::numeric));
ALTER TABLE public."items" ADD CONSTRAINT "items_short_label_length_check" CHECK ((char_length(short_label) <= 50));
ALTER TABLE public."order_ticket_fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_boxes_deducted_check" CHECK ((boxes_deducted > 0));
ALTER TABLE public."order_ticket_fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_ppb_check" CHECK ((pieces_per_box_at_time > 0));
ALTER TABLE public."order_ticket_fulfillment_lines" ADD CONSTRAINT "fulfillment_lines_total_pieces_check" CHECK ((total_pieces > 0));
ALTER TABLE public."order_ticket_items" ADD CONSTRAINT "order_ticket_items_line_cost_check" CHECK (((line_cost IS NULL) OR (line_cost >= (0)::numeric)));
ALTER TABLE public."order_ticket_items" ADD CONSTRAINT "order_ticket_items_unit_price_at_time_check" CHECK (((unit_price_at_time IS NULL) OR (unit_price_at_time > (0)::numeric)));
ALTER TABLE public."order_tickets" ADD CONSTRAINT "order_tickets_delivery_type_check" CHECK ((delivery_type = ANY (ARRAY['company'::text, 'self'::text])));
ALTER TABLE public."order_tickets" DROP CONSTRAINT IF EXISTS "order_tickets_status_check";
ALTER TABLE public."order_tickets" ADD CONSTRAINT "order_tickets_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'processing'::text, 'fulfilled'::text, 'in_transit'::text, 'delivered'::text, 'confirmed'::text, 'rejected'::text, 'cancelled'::text])));
ALTER TABLE public."pallet_inventory" ADD CONSTRAINT "pallet_inventory_box_count_check" CHECK ((box_count >= 0));
ALTER TABLE public."pallet_inventory" ADD CONSTRAINT "pallet_inventory_initial_box_count_check" CHECK ((initial_box_count > 0));
ALTER TABLE public."pallet_operations_log" ADD CONSTRAINT "pallet_ops_operation_type_check" CHECK ((operation_type = ANY (ARRAY['created'::text, 'loaded'::text, 'moved'::text, 'consolidated_from'::text, 'consolidated_to'::text, 'emptied'::text, 'retired'::text, 'reactivated'::text])));
ALTER TABLE public."po_item_box_configs" ADD CONSTRAINT "po_item_box_configs_box_count_check" CHECK ((box_count > 0));
ALTER TABLE public."po_item_box_configs" ADD CONSTRAINT "po_item_box_configs_pieces_per_box_check" CHECK ((pieces_per_box > 0));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "poi_partial_box_reason_chk" CHECK (((partial_box_reason IS NULL) OR (partial_box_reason = ANY (ARRAY['damaged_in_transit'::text, 'supplier_short_pack'::text, 'miscount_pending_recount'::text, 'sample_pulled_qc'::text, 'other'::text]))));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "poi_partial_box_reason_required_chk" CHECK (((partial_box_units = 0) OR (partial_box_reason IS NOT NULL)));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "poi_partial_box_units_ppb1_chk" CHECK (((pieces_per_box <> 1) OR (partial_box_units = 0)));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "poi_partial_box_units_range_chk" CHECK (((partial_box_units >= 0) AND ((pieces_per_box IS NULL) OR (pieces_per_box <= 0) OR (partial_box_units < pieces_per_box))));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_alloc_office_nonneg" CHECK ((allocated_office_fee >= (0)::numeric));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_alloc_shipping_nonneg" CHECK ((allocated_shipping_fee >= (0)::numeric));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_cartons_pos" CHECK (((cartons IS NULL) OR (cartons > (0)::numeric)));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_cbm_nonneg" CHECK (((cbm IS NULL) OR (cbm > (0)::numeric)));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_cbm_share_range" CHECK (((cbm_share IS NULL) OR ((cbm_share >= (0)::numeric) AND (cbm_share <= (1)::numeric))));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_pieces_per_box_check" CHECK ((pieces_per_box > 0));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_pieces_per_carton_pos" CHECK (((pieces_per_carton IS NULL) OR (pieces_per_carton > 0)));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_qty_ordered_pos" CHECK ((quantity_ordered > (0)::numeric));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_qty_received_pos" CHECK (((quantity_received IS NULL) OR (quantity_received >= (0)::numeric)));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_total_after_nonneg" CHECK ((total_cost_after >= (0)::numeric));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_total_price_nonneg" CHECK ((total_price_before >= (0)::numeric));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_unit_after_nonneg" CHECK ((unit_cost_after >= (0)::numeric));
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_unit_price_nonneg" CHECK ((unit_price_before >= (0)::numeric));
ALTER TABLE public."purchase_orders" ADD CONSTRAINT "purchase_orders_office_fee_nonneg" CHECK ((office_fee >= (0)::numeric));
ALTER TABLE public."purchase_orders" ADD CONSTRAINT "purchase_orders_shipping_fee_nonneg" CHECK ((shipping_fee >= (0)::numeric));
ALTER TABLE public."purchase_orders" ADD CONSTRAINT "purchase_orders_status_check" CHECK ((status = ANY (ARRAY['draft'::text, 'submitted'::text, 'in_transit'::text, 'arrived'::text, 'received'::text, 'cancelled'::text])));
ALTER TABLE public."purchase_orders" ADD CONSTRAINT "purchase_orders_subtotal_nonneg" CHECK ((subtotal_before >= (0)::numeric));
ALTER TABLE public."purchase_orders" ADD CONSTRAINT "purchase_orders_total_cbm_nonneg" CHECK (((total_cbm IS NULL) OR (total_cbm >= (0)::numeric)));
ALTER TABLE public."purchase_orders" ADD CONSTRAINT "purchase_orders_total_pallets_pos" CHECK (((total_pallets IS NULL) OR (total_pallets > 0)));
ALTER TABLE public."store_purchase_items" ADD CONSTRAINT "store_purchase_items_quantity_check" CHECK ((quantity > (0)::numeric));
ALTER TABLE public."store_purchase_items" ADD CONSTRAINT "store_purchase_items_unit_cost_check" CHECK ((unit_cost >= (0)::numeric));
ALTER TABLE public."store_purchases" ADD CONSTRAINT "store_purchases_total_cost_check" CHECK ((total_cost >= (0)::numeric));
ALTER TABLE public."ticket_deliveries" ADD CONSTRAINT "ticket_deliveries_actual_pallet_check" CHECK ((actual_pallet_count >= 0));
ALTER TABLE public."ticket_deliveries" ADD CONSTRAINT "ticket_deliveries_delivery_type_check" CHECK ((delivery_type = ANY (ARRAY['company'::text, 'self'::text])));
ALTER TABLE public."ticket_deliveries" ADD CONSTRAINT "ticket_deliveries_estimated_pallet_check" CHECK ((estimated_pallet_count >= 0));
ALTER TABLE public."ticket_deliveries" ADD CONSTRAINT "ticket_deliveries_payment_status_check" CHECK ((payment_status = ANY (ARRAY['none'::text, 'held'::text, 'captured'::text, 'released'::text])));
ALTER TABLE public."warehouse_expense_rates" ADD CONSTRAINT "warehouse_expense_rates_rate_nonneg" CHECK ((default_rate >= (0)::numeric));
ALTER TABLE public."warehouse_expense_rates" ADD CONSTRAINT "warehouse_expense_rates_type_check" CHECK ((expense_type = ANY (ARRAY['pallet_delivery'::text, 'container_unload'::text, 'delivery'::text, 'pallet_rent'::text, 'other'::text])));
ALTER TABLE public."warehouse_expense_rates" ADD CONSTRAINT "warehouse_expense_rates_unit_check" CHECK ((rate_unit = ANY (ARRAY['per_pallet'::text, 'flat'::text, 'per_cbm'::text])));
ALTER TABLE public."warehouse_expenses" ADD CONSTRAINT "warehouse_expenses_amount_nonneg" CHECK ((amount >= (0)::numeric));
ALTER TABLE public."warehouse_expenses" ADD CONSTRAINT "warehouse_expenses_pallet_count_pos" CHECK (((pallet_count IS NULL) OR (pallet_count > 0)));
ALTER TABLE public."warehouse_expenses" ADD CONSTRAINT "warehouse_expenses_pallet_fields_together" CHECK (((pallet_count IS NULL) = (rate_per_pallet IS NULL)));
ALTER TABLE public."warehouse_expenses" ADD CONSTRAINT "warehouse_expenses_period_fields_together" CHECK (((period_start IS NULL) = (period_end IS NULL)));
ALTER TABLE public."warehouse_expenses" ADD CONSTRAINT "warehouse_expenses_period_order" CHECK (((period_start IS NULL) OR (period_end > period_start)));
ALTER TABLE public."warehouse_expenses" ADD CONSTRAINT "warehouse_expenses_period_type_check" CHECK (((period_start IS NULL) OR (expense_type = ANY (ARRAY['pallet_rent'::text, 'other'::text]))));
ALTER TABLE public."warehouse_expenses" ADD CONSTRAINT "warehouse_expenses_rate_nonneg" CHECK (((rate_per_pallet IS NULL) OR (rate_per_pallet >= (0)::numeric)));
ALTER TABLE public."warehouse_expenses" ADD CONSTRAINT "warehouse_expenses_self_delivered_type_check" CHECK (((is_self_delivered IS NULL) OR (expense_type = 'delivery'::text)));
ALTER TABLE public."warehouse_expenses" ADD CONSTRAINT "warehouse_expenses_type_check" CHECK ((expense_type = ANY (ARRAY['pallet_delivery'::text, 'container_unload'::text, 'delivery'::text, 'pallet_rent'::text, 'other'::text])));
ALTER TABLE public."warehouse_pallets" ADD CONSTRAINT "warehouse_pallets_status_check" CHECK ((status = ANY (ARRAY['active'::text, 'empty'::text, 'retired'::text])));
ALTER TABLE public."warehouse_rent_snapshots" ADD CONSTRAINT "rent_snapshots_pallet_count_check" CHECK ((active_pallet_count >= 0));
ALTER TABLE public."warehouse_rent_snapshots" ADD CONSTRAINT "rent_snapshots_rate_check" CHECK ((rate_per_pallet >= (0)::numeric));
ALTER TABLE public."warehouse_transfer_price_history" ADD CONSTRAINT "warehouse_transfer_price_history_change_source_check" CHECK ((change_source = ANY (ARRAY['initial_set'::text, 'manual_edit'::text, 'bulk_markup'::text])));
ALTER TABLE public."warehouse_transfer_price_history" ADD CONSTRAINT "warehouse_transfer_price_history_new_price_check" CHECK ((new_price > (0)::numeric));
ALTER TABLE public."warehouse_transfer_price_history" ADD CONSTRAINT "warehouse_transfer_price_history_previous_price_check" CHECK (((previous_price IS NULL) OR (previous_price > (0)::numeric)));
ALTER TABLE public."daily_summary_preferences" ADD CONSTRAINT "daily_summary_preferences_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE public."inventory_update_requests" ADD CONSTRAINT "inventory_update_requests_item_id_fkey" FOREIGN KEY (item_id) REFERENCES items(id);
ALTER TABLE public."inventory_update_requests" ADD CONSTRAINT "inventory_update_requests_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id);
ALTER TABLE public."inventory_update_requests" ADD CONSTRAINT "inventory_update_requests_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id);
ALTER TABLE public."inventory_update_requests" ADD CONSTRAINT "inventory_update_requests_requested_by_fkey" FOREIGN KEY (requested_by) REFERENCES users(id);
ALTER TABLE public."inventory_update_requests" ADD CONSTRAINT "inventory_update_requests_reviewed_by_fkey" FOREIGN KEY (reviewed_by) REFERENCES users(id);
ALTER TABLE public."inventory_update_requests" ADD CONSTRAINT "inventory_update_requests_storage_space_id_fkey" FOREIGN KEY (storage_space_id) REFERENCES storage_spaces(id);
ALTER TABLE public."item_cost_history" ADD CONSTRAINT "item_cost_history_item_fk" FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
ALTER TABLE public."item_cost_history" ADD CONSTRAINT "item_cost_history_org_fk" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public."item_cost_history" ADD CONSTRAINT "item_cost_history_po_fk" FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;
ALTER TABLE public."item_warehouse_pricing" ADD CONSTRAINT "item_warehouse_pricing_item_id_fkey" FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
ALTER TABLE public."item_warehouse_pricing" ADD CONSTRAINT "item_warehouse_pricing_updated_by_fkey" FOREIGN KEY (updated_by) REFERENCES users(id);
ALTER TABLE public."notification_preferences" ADD CONSTRAINT "notification_preferences_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE public."order_ticket_fulfillment_lines" ADD CONSTRAINT "order_ticket_fulfillment_lines_order_ticket_item_id_fkey" FOREIGN KEY (order_ticket_item_id) REFERENCES order_ticket_items(id) ON DELETE CASCADE;
ALTER TABLE public."order_ticket_fulfillment_lines" ADD CONSTRAINT "order_ticket_fulfillment_lines_pallet_id_fkey" FOREIGN KEY (pallet_id) REFERENCES warehouse_pallets(id);
ALTER TABLE public."order_ticket_fulfillment_lines" ADD CONSTRAINT "order_ticket_fulfillment_lines_pallet_inventory_id_fkey" FOREIGN KEY (pallet_inventory_id) REFERENCES pallet_inventory(id);
ALTER TABLE public."pallet_inventory" ADD CONSTRAINT "pallet_inventory_item_id_fkey" FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;
ALTER TABLE public."pallet_inventory" ADD CONSTRAINT "pallet_inventory_pallet_id_fkey" FOREIGN KEY (pallet_id) REFERENCES warehouse_pallets(id) ON DELETE CASCADE;
ALTER TABLE public."pallet_inventory" ADD CONSTRAINT "pallet_inventory_purchase_order_item_id_fkey" FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id) ON DELETE SET NULL;
ALTER TABLE public."pallet_operations_log" ADD CONSTRAINT "pallet_operations_log_item_id_fkey" FOREIGN KEY (item_id) REFERENCES items(id);
ALTER TABLE public."pallet_operations_log" ADD CONSTRAINT "pallet_operations_log_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."pallet_operations_log" ADD CONSTRAINT "pallet_operations_log_pallet_id_fkey" FOREIGN KEY (pallet_id) REFERENCES warehouse_pallets(id);
ALTER TABLE public."pallet_operations_log" ADD CONSTRAINT "pallet_operations_log_performed_by_fkey" FOREIGN KEY (performed_by) REFERENCES users(id);
ALTER TABLE public."pallet_operations_log" ADD CONSTRAINT "pallet_operations_log_related_pallet_id_fkey" FOREIGN KEY (related_pallet_id) REFERENCES warehouse_pallets(id);
ALTER TABLE public."pallet_operations_log" ADD CONSTRAINT "pallet_operations_log_related_ticket_id_fkey" FOREIGN KEY (related_ticket_id) REFERENCES order_tickets(id);
ALTER TABLE public."po_item_box_configs" ADD CONSTRAINT "po_item_box_configs_purchase_order_item_id_fkey" FOREIGN KEY (purchase_order_item_id) REFERENCES purchase_order_items(id) ON DELETE CASCADE;
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_item_fk" FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE RESTRICT;
ALTER TABLE public."purchase_order_items" ADD CONSTRAINT "purchase_order_items_po_fk" FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE CASCADE;
ALTER TABLE public."purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fk" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE public."purchase_orders" ADD CONSTRAINT "purchase_orders_org_fk" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public."purchase_orders" ADD CONSTRAINT "purchase_orders_warehouse_location_id_fkey" FOREIGN KEY (warehouse_location_id) REFERENCES locations(id) ON DELETE SET NULL;
ALTER TABLE public."store_purchase_items" ADD CONSTRAINT "store_purchase_items_item_id_fkey" FOREIGN KEY (item_id) REFERENCES items(id);
ALTER TABLE public."store_purchase_items" ADD CONSTRAINT "store_purchase_items_purchase_id_fkey" FOREIGN KEY (purchase_id) REFERENCES store_purchases(id) ON DELETE CASCADE;
ALTER TABLE public."store_purchase_items" ADD CONSTRAINT "store_purchase_items_storage_space_id_fkey" FOREIGN KEY (storage_space_id) REFERENCES storage_spaces(id);
ALTER TABLE public."store_purchases" ADD CONSTRAINT "store_purchases_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE public."store_purchases" ADD CONSTRAINT "store_purchases_org_id_fkey" FOREIGN KEY (org_id) REFERENCES organizations(id);
ALTER TABLE public."store_purchases" ADD CONSTRAINT "store_purchases_purchased_by_fkey" FOREIGN KEY (purchased_by) REFERENCES users(id);
ALTER TABLE public."ticket_deliveries" ADD CONSTRAINT "ticket_deliveries_delivered_by_fkey" FOREIGN KEY (delivered_by) REFERENCES users(id) ON DELETE SET NULL;
ALTER TABLE public."ticket_deliveries" ADD CONSTRAINT "ticket_deliveries_ticket_id_fkey" FOREIGN KEY (ticket_id) REFERENCES order_tickets(id) ON DELETE CASCADE;
ALTER TABLE public."user_location_assignments" ADD CONSTRAINT "user_location_assignments_location_id_fkey" FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE;
ALTER TABLE public."user_location_assignments" ADD CONSTRAINT "user_location_assignments_user_id_fkey" FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;
ALTER TABLE public."warehouse_expense_rates" ADD CONSTRAINT "warehouse_expense_rates_org_fk" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public."warehouse_expenses" ADD CONSTRAINT "warehouse_expenses_created_by_fk" FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE RESTRICT;
ALTER TABLE public."warehouse_expenses" ADD CONSTRAINT "warehouse_expenses_location_fk" FOREIGN KEY (warehouse_location_id) REFERENCES locations(id) ON DELETE RESTRICT;
ALTER TABLE public."warehouse_expenses" ADD CONSTRAINT "warehouse_expenses_org_fk" FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE CASCADE;
ALTER TABLE public."warehouse_expenses" ADD CONSTRAINT "warehouse_expenses_po_fk" FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
ALTER TABLE public."warehouse_pallets" ADD CONSTRAINT "warehouse_pallets_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."warehouse_pallets" ADD CONSTRAINT "warehouse_pallets_purchase_order_id_fkey" FOREIGN KEY (purchase_order_id) REFERENCES purchase_orders(id) ON DELETE SET NULL;
ALTER TABLE public."warehouse_pallets" ADD CONSTRAINT "warehouse_pallets_storage_space_id_fkey" FOREIGN KEY (storage_space_id) REFERENCES storage_spaces(id) ON DELETE SET NULL;
ALTER TABLE public."warehouse_pallets" ADD CONSTRAINT "warehouse_pallets_warehouse_location_id_fkey" FOREIGN KEY (warehouse_location_id) REFERENCES locations(id);
ALTER TABLE public."warehouse_rent_snapshots" ADD CONSTRAINT "warehouse_rent_snapshots_organization_id_fkey" FOREIGN KEY (organization_id) REFERENCES organizations(id);
ALTER TABLE public."warehouse_transfer_price_history" ADD CONSTRAINT "warehouse_transfer_price_history_changed_by_fkey" FOREIGN KEY (changed_by) REFERENCES users(id);
ALTER TABLE public."warehouse_transfer_price_history" ADD CONSTRAINT "warehouse_transfer_price_history_item_id_fkey" FOREIGN KEY (item_id) REFERENCES items(id) ON DELETE CASCADE;

-- 5. Indexes
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_unique_unresolved_warehouse ON public.alerts USING btree (item_id, location_id, alert_type) WHERE ((resolved_at IS NULL) AND (storage_space_id IS NULL));
CREATE UNIQUE INDEX IF NOT EXISTS daily_summary_prefs_org_default_unique ON public.daily_summary_preferences USING btree (organization_id) WHERE (location_id IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS daily_summary_prefs_org_location_unique ON public.daily_summary_preferences USING btree (organization_id, location_id) WHERE (location_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_daily_summary_prefs_location_id ON public.daily_summary_preferences USING btree (location_id);
CREATE INDEX IF NOT EXISTS idx_iur_pending ON public.inventory_update_requests USING btree (item_id, location_id, storage_space_id, status) WHERE (status = 'pending'::text);
CREATE INDEX IF NOT EXISTS item_cost_history_item_date_idx ON public.item_cost_history USING btree (item_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS item_cost_history_org_date_idx ON public.item_cost_history USING btree (organization_id, effective_date DESC);
CREATE INDEX IF NOT EXISTS item_cost_history_po_id_idx ON public.item_cost_history USING btree (purchase_order_id);
CREATE UNIQUE INDEX IF NOT EXISTS item_locations_warehouse_null_space_idx ON public.item_locations USING btree (item_id, location_id) WHERE (storage_space_id IS NULL);
CREATE INDEX IF NOT EXISTS idx_notif_prefs_location_id ON public.notification_preferences USING btree (location_id);
CREATE UNIQUE INDEX IF NOT EXISTS notif_prefs_org_default_unique ON public.notification_preferences USING btree (organization_id) WHERE (location_id IS NULL);
CREATE UNIQUE INDEX IF NOT EXISTS notif_prefs_org_location_unique ON public.notification_preferences USING btree (organization_id, location_id) WHERE (location_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS notification_preferences_org_location_idx ON public.notification_preferences USING btree (organization_id, location_id);
CREATE INDEX IF NOT EXISTS idx_order_ticket_logs_ticket ON public.order_ticket_logs USING btree (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_order_tickets_has_discrepancy ON public.order_tickets USING btree (organization_id, confirmed_at DESC) WHERE (has_discrepancy = true);
CREATE INDEX IF NOT EXISTS idx_po_item_box_configs_poi ON public.po_item_box_configs USING btree (purchase_order_item_id);
CREATE INDEX IF NOT EXISTS purchase_order_items_item_id_idx ON public.purchase_order_items USING btree (item_id);
CREATE INDEX IF NOT EXISTS purchase_order_items_po_id_idx ON public.purchase_order_items USING btree (purchase_order_id);
CREATE INDEX IF NOT EXISTS purchase_orders_created_at_idx ON public.purchase_orders USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS purchase_orders_org_status_idx ON public.purchase_orders USING btree (organization_id, status);
CREATE INDEX IF NOT EXISTS user_location_assignments_location_id_idx ON public.user_location_assignments USING btree (location_id);
CREATE INDEX IF NOT EXISTS user_location_assignments_user_id_idx ON public.user_location_assignments USING btree (user_id);
CREATE INDEX IF NOT EXISTS warehouse_expense_rates_org_idx ON public.warehouse_expense_rates USING btree (organization_id);
CREATE INDEX IF NOT EXISTS warehouse_expenses_location_idx ON public.warehouse_expenses USING btree (warehouse_location_id);
CREATE INDEX IF NOT EXISTS warehouse_expenses_org_date_idx ON public.warehouse_expenses USING btree (organization_id, expense_date DESC);
CREATE INDEX IF NOT EXISTS warehouse_expenses_po_id_idx ON public.warehouse_expenses USING btree (purchase_order_id) WHERE (purchase_order_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS warehouse_expenses_type_idx ON public.warehouse_expenses USING btree (organization_id, expense_type);
CREATE INDEX IF NOT EXISTS idx_warehouse_pallets_location ON public.warehouse_pallets USING btree (warehouse_location_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_pallets_org_status ON public.warehouse_pallets USING btree (organization_id, status);
CREATE INDEX IF NOT EXISTS idx_warehouse_pallets_purchase_order ON public.warehouse_pallets USING btree (purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_pallets_received_active ON public.warehouse_pallets USING btree (received_at) WHERE (status = 'active'::text);
CREATE INDEX IF NOT EXISTS idx_wtph_batch ON public.warehouse_transfer_price_history USING btree (batch_id) WHERE (batch_id IS NOT NULL);
CREATE INDEX IF NOT EXISTS idx_wtph_item_created ON public.warehouse_transfer_price_history USING btree (item_id, created_at DESC);

-- 6. Views
CREATE OR REPLACE VIEW public."delivery_estimation_accuracy" AS
 SELECT td.id AS delivery_id,
    td.ticket_id,
    ot.organization_id,
    ot.requesting_location_id,
    box_totals.total_boxes_delivered,
    td.estimated_pallet_count,
    td.actual_pallet_count,
    td.estimated_cost,
    td.actual_cost,
    td.actual_pallet_count - td.estimated_pallet_count AS pallet_delta,
    td.actual_cost - td.estimated_cost AS cost_delta,
        CASE
            WHEN td.actual_pallet_count > 0 THEN round(box_totals.total_boxes_delivered::numeric / td.actual_pallet_count::numeric, 2)
            ELSE NULL::numeric
        END AS actual_boxes_per_pallet,
    td.delivered_at
   FROM ticket_deliveries td
     JOIN order_tickets ot ON ot.id = td.ticket_id
     JOIN ( SELECT order_ticket_items.ticket_id,
            sum(order_ticket_items.fulfilled_boxes) AS total_boxes_delivered
           FROM order_ticket_items
          GROUP BY order_ticket_items.ticket_id) box_totals ON box_totals.ticket_id = td.ticket_id
  WHERE td.delivery_type = 'company'::text AND td.actual_pallet_count IS NOT NULL;
CREATE OR REPLACE VIEW public."item_box_totals" AS
 WITH config_base AS (
         SELECT po.organization_id,
            poi.item_id,
            po.id AS purchase_order_id,
            cfg.box_count,
            cfg.total_pieces
           FROM po_item_box_configs cfg
             JOIN purchase_order_items poi ON poi.id = cfg.purchase_order_item_id
             JOIN purchase_orders po ON po.id = poi.purchase_order_id
        ), config_agg AS (
         SELECT config_base.organization_id,
            config_base.item_id,
            sum(config_base.box_count) AS total_boxes_received,
            sum(config_base.total_pieces) AS total_pieces_received,
            count(DISTINCT config_base.purchase_order_id) AS shipment_count
           FROM config_base
          GROUP BY config_base.organization_id, config_base.item_id
        ), warehouse_stock AS (
         SELECT wp.organization_id,
            pi.item_id,
            sum(pi.box_count) AS current_warehouse_boxes
           FROM pallet_inventory pi
             JOIN warehouse_pallets wp ON wp.id = pi.pallet_id
          WHERE wp.status = 'active'::text AND pi.box_count > 0
          GROUP BY wp.organization_id, pi.item_id
        )
 SELECT i.organization_id,
    i.id AS item_id,
    i.name AS item_name,
    i.sku,
    COALESCE(ca.total_boxes_received, 0::bigint) AS total_boxes_received,
    COALESCE(ca.total_pieces_received, 0::bigint) AS total_pieces_received,
        CASE
            WHEN COALESCE(ca.total_boxes_received, 0::bigint) > 0 THEN round(ca.total_pieces_received::numeric / ca.total_boxes_received::numeric, 2)
            ELSE NULL::numeric
        END AS weighted_avg_per_box,
    i.box_quantity AS current_default_per_box,
    COALESCE(ca.shipment_count, 0::bigint) AS shipment_count,
    COALESCE(ws.current_warehouse_boxes, 0::bigint) AS current_warehouse_boxes
   FROM items i
     LEFT JOIN config_agg ca ON ca.organization_id = i.organization_id AND ca.item_id = i.id
     LEFT JOIN warehouse_stock ws ON ws.organization_id = i.organization_id AND ws.item_id = i.id
  WHERE ca.item_id IS NOT NULL OR ws.item_id IS NOT NULL;
CREATE OR REPLACE VIEW public."item_shipment_breakdown" AS
 WITH po_line_totals AS (
         SELECT po_item_box_configs.purchase_order_item_id,
            sum(po_item_box_configs.box_count) AS po_line_total_boxes,
            sum(po_item_box_configs.total_pieces) AS po_line_total_pieces
           FROM po_item_box_configs
          GROUP BY po_item_box_configs.purchase_order_item_id
        )
 SELECT po.organization_id,
    poi.item_id,
    i.name AS item_name,
    i.sku,
    cfg.purchase_order_item_id,
    po.id AS po_id,
    po.po_number,
    po.order_date AS po_date,
    po.actual_arrival,
    po.supplier_name,
    cfg.id AS config_id,
    cfg.pieces_per_box AS config_pieces_per_box,
    cfg.box_count AS config_box_count,
    cfg.total_pieces AS config_total_pieces,
    cfg.notes AS config_notes,
    cfg.created_at AS config_created_at,
    plt.po_line_total_boxes,
    plt.po_line_total_pieces,
    poi.has_mixed_configs
   FROM po_item_box_configs cfg
     JOIN purchase_order_items poi ON poi.id = cfg.purchase_order_item_id
     JOIN purchase_orders po ON po.id = poi.purchase_order_id
     JOIN items i ON i.id = poi.item_id
     JOIN po_line_totals plt ON plt.purchase_order_item_id = cfg.purchase_order_item_id
  WHERE po.status = ANY (ARRAY['arrived'::text, 'received'::text])
  ORDER BY po.organization_id, poi.item_id, po.actual_arrival DESC NULLS LAST, po.order_date DESC, cfg.box_count DESC;
CREATE OR REPLACE VIEW public."items_with_costs" WITH (security_barrier=true) AS
 SELECT i.id,
    i.organization_id,
    i.name,
    i.sku,
    i.unit_of_measure,
    i.min_quantity,
    i.created_at,
    i.barcode_text,
    i.category_id,
    i.updated_at,
    i.box_quantity,
    i.cost_per_unit,
    i.current_unit_cost,
    i.cbm_per_carton,
    i.short_label,
    i.is_warehouse_item,
    iwp.warehouse_transfer_price,
    iwp.updated_at AS price_updated_at,
        CASE
            WHEN i.current_unit_cost IS NOT NULL AND iwp.warehouse_transfer_price IS NOT NULL THEN iwp.warehouse_transfer_price - i.current_unit_cost
            ELSE NULL::numeric
        END AS unit_margin,
        CASE
            WHEN i.current_unit_cost IS NOT NULL AND iwp.warehouse_transfer_price IS NOT NULL AND i.current_unit_cost > 0::numeric THEN round((iwp.warehouse_transfer_price - i.current_unit_cost) / i.current_unit_cost * 100::numeric, 2)
            ELSE NULL::numeric
        END AS margin_pct
   FROM items i
     LEFT JOIN item_warehouse_pricing iwp ON iwp.item_id = i.id
  WHERE is_super_admin();
CREATE OR REPLACE VIEW public."items_with_prices" WITH (security_barrier=true) AS
 SELECT i.id,
    i.organization_id,
    i.name,
    i.sku,
    i.unit_of_measure,
    i.min_quantity,
    i.box_quantity,
    i.category_id,
    i.is_warehouse_item,
    iwp.warehouse_transfer_price,
    iwp.currency,
    iwp.updated_at AS price_updated_at
   FROM items i
     LEFT JOIN item_warehouse_pricing iwp ON iwp.item_id = i.id;
CREATE OR REPLACE VIEW public."store_warehouse_spend_monthly" AS
 SELECT ot.organization_id,
    ot.requesting_location_id AS store_location_id,
    date_trunc('month'::text, ot.fulfilled_at) AS month,
    count(DISTINCT ot.id) AS ticket_count,
    sum(oti.line_total) AS total_spend,
    count(oti.id) FILTER (WHERE oti.line_total IS NULL) AS untracked_line_count
   FROM order_tickets ot
     JOIN order_ticket_items oti ON oti.ticket_id = ot.id
  WHERE (ot.status = ANY (ARRAY['fulfilled'::text, 'confirmed'::text])) AND ot.fulfilled_at IS NOT NULL
  GROUP BY ot.organization_id, ot.requesting_location_id, (date_trunc('month'::text, ot.fulfilled_at));
CREATE OR REPLACE VIEW public."warehouse_inventory_overview" AS
 SELECT pi.id AS pallet_inventory_id,
    pi.pallet_id,
    pi.item_id,
    pi.purchase_order_item_id,
    pi.box_count,
    pi.initial_box_count,
    pi.pieces_per_box_override,
    pi.created_at AS inventory_created_at,
    pi.updated_at AS inventory_updated_at,
    wp.organization_id,
    wp.pallet_label,
    wp.status AS pallet_status,
    wp.storage_space_id,
    wp.warehouse_location_id,
    wp.purchase_order_id,
    wp.received_at,
    i.name AS item_name,
    COALESCE(i.short_label, i.name) AS item_display_label,
    i.sku,
    i.box_quantity AS item_default_ppb,
    poi.pieces_per_box AS po_pieces_per_box,
    poi.has_mixed_configs,
    COALESCE(pi.pieces_per_box_override, poi.pieces_per_box, i.box_quantity) AS effective_ppb,
    pi.box_count * COALESCE(pi.pieces_per_box_override, poi.pieces_per_box, i.box_quantity) AS total_pieces,
        CASE
            WHEN pi.pieces_per_box_override IS NOT NULL THEN 'pallet_override'::text
            WHEN poi.id IS NOT NULL AND (EXISTS ( SELECT 1
               FROM po_item_box_configs cfg
              WHERE cfg.purchase_order_item_id = pi.purchase_order_item_id)) THEN 'po_box_config'::text
            ELSE 'item_default'::text
        END AS config_source
   FROM pallet_inventory pi
     JOIN warehouse_pallets wp ON wp.id = pi.pallet_id
     JOIN items i ON i.id = pi.item_id
     LEFT JOIN purchase_order_items poi ON poi.id = pi.purchase_order_item_id;

-- 7. Triggers
DROP TRIGGER IF EXISTS "trg_enforce_pricing_on_warehouse_item" ON public."item_warehouse_pricing";
CREATE TRIGGER trg_enforce_pricing_on_warehouse_item BEFORE INSERT OR UPDATE ON public.item_warehouse_pricing FOR EACH ROW EXECUTE FUNCTION enforce_pricing_on_warehouse_item();
DROP TRIGGER IF EXISTS "trg_log_transfer_price_change" ON public."item_warehouse_pricing";
CREATE TRIGGER trg_log_transfer_price_change AFTER INSERT OR UPDATE ON public.item_warehouse_pricing FOR EACH ROW EXECUTE FUNCTION log_transfer_price_change();
DROP TRIGGER IF EXISTS "trg_snapshot_transfer_prices_on_submit" ON public."order_tickets";
CREATE TRIGGER trg_snapshot_transfer_prices_on_submit BEFORE UPDATE OF status ON public.order_tickets FOR EACH ROW EXECUTE FUNCTION snapshot_transfer_prices_on_submit();
DROP TRIGGER IF EXISTS "auto_check_empty_pallet" ON public."pallet_inventory";
CREATE TRIGGER auto_check_empty_pallet AFTER UPDATE OF box_count ON public.pallet_inventory FOR EACH ROW EXECUTE FUNCTION check_empty_pallet();
DROP TRIGGER IF EXISTS "set_pallet_inventory_updated_at" ON public."pallet_inventory";
CREATE TRIGGER set_pallet_inventory_updated_at BEFORE UPDATE ON public.pallet_inventory FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "sync_warehouse_inventory" ON public."pallet_inventory";
CREATE CONSTRAINT TRIGGER sync_warehouse_inventory AFTER INSERT OR DELETE OR UPDATE ON public.pallet_inventory DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION sync_warehouse_inventory_fn();
DROP TRIGGER IF EXISTS "sync_has_mixed_configs" ON public."po_item_box_configs";
CREATE TRIGGER sync_has_mixed_configs AFTER INSERT OR DELETE OR UPDATE ON public.po_item_box_configs FOR EACH ROW EXECUTE FUNCTION sync_has_mixed_configs();
DROP TRIGGER IF EXISTS "purchase_order_items_touch_parent" ON public."purchase_order_items";
CREATE TRIGGER purchase_order_items_touch_parent AFTER INSERT OR DELETE OR UPDATE ON public.purchase_order_items FOR EACH ROW EXECUTE FUNCTION touch_purchase_order_updated_at();
DROP TRIGGER IF EXISTS "purchase_orders_updated_at" ON public."purchase_orders";
CREATE TRIGGER purchase_orders_updated_at BEFORE UPDATE ON public.purchase_orders FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "set_ticket_deliveries_updated_at" ON public."ticket_deliveries";
CREATE TRIGGER set_ticket_deliveries_updated_at BEFORE UPDATE ON public.ticket_deliveries FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "warehouse_expense_rates_updated_at" ON public."warehouse_expense_rates";
CREATE TRIGGER warehouse_expense_rates_updated_at BEFORE UPDATE ON public.warehouse_expense_rates FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "warehouse_expenses_updated_at" ON public."warehouse_expenses";
CREATE TRIGGER warehouse_expenses_updated_at BEFORE UPDATE ON public.warehouse_expenses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
DROP TRIGGER IF EXISTS "set_warehouse_pallets_updated_at" ON public."warehouse_pallets";
CREATE TRIGGER set_warehouse_pallets_updated_at BEFORE UPDATE ON public.warehouse_pallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 8. Row level security (tables where dev has RLS on and prod does not)
ALTER TABLE public."inventory_update_requests" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."item_cost_history" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."item_warehouse_pricing" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."order_ticket_fulfillment_lines" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."order_ticket_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."order_ticket_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."order_tickets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pallet_inventory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."pallet_operations_log" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."payment_holds" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."po_item_box_configs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."purchase_order_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."purchase_orders" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."store_purchase_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."store_purchases" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."ticket_deliveries" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."update_limits" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."update_override_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."user_location_assignments" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."warehouse_expense_rates" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."warehouse_expenses" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."warehouse_pallets" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."warehouse_rent_snapshots" ENABLE ROW LEVEL SECURITY;
ALTER TABLE public."warehouse_transfer_price_history" ENABLE ROW LEVEL SECURITY;

-- 9. Policies (new + updated to dev version; prod-only policies are kept)
DROP POLICY IF EXISTS "admin_insert_daily_summary_preferences" ON public."daily_summary_preferences";
CREATE POLICY "admin_insert_daily_summary_preferences" ON public."daily_summary_preferences" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((location_id IS NOT NULL) AND (location_id = ( SELECT users.assigned_location_id
   FROM users
  WHERE ((users.id = requesting_user_id()) AND (users.role = 'admin'::text))))));
DROP POLICY IF EXISTS "admin_select_daily_summary_preferences" ON public."daily_summary_preferences";
CREATE POLICY "admin_select_daily_summary_preferences" ON public."daily_summary_preferences" AS PERMISSIVE FOR SELECT TO public
  USING (((( SELECT users.role
   FROM users
  WHERE (users.id = requesting_user_id())) = ANY (ARRAY['admin'::text, 'super_admin'::text])) AND ((location_id IS NULL) OR (location_id = ( SELECT users.assigned_location_id
   FROM users
  WHERE (users.id = requesting_user_id()))))));
DROP POLICY IF EXISTS "admin_update_daily_summary_preferences" ON public."daily_summary_preferences";
CREATE POLICY "admin_update_daily_summary_preferences" ON public."daily_summary_preferences" AS PERMISSIVE FOR UPDATE TO public
  USING (((location_id IS NOT NULL) AND (location_id = ( SELECT users.assigned_location_id
   FROM users
  WHERE ((users.id = requesting_user_id()) AND (users.role = 'admin'::text))))));
DROP POLICY IF EXISTS "super_admin_all_daily_summary_preferences" ON public."daily_summary_preferences";
CREATE POLICY "super_admin_all_daily_summary_preferences" ON public."daily_summary_preferences" AS PERMISSIVE FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS "Employees insert inventory logs" ON public."inventory_logs";
CREATE POLICY "Employees insert inventory logs" ON public."inventory_logs" AS PERMISSIVE FOR INSERT TO public
  WITH CHECK ((location_id IN ( SELECT user_location_assignments.location_id
   FROM user_location_assignments
  WHERE (user_location_assignments.user_id = (auth.jwt() ->> 'sub'::text)))));
DROP POLICY IF EXISTS "Admin read org requests" ON public."inventory_update_requests";
CREATE POLICY "Admin read org requests" ON public."inventory_update_requests" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (members m
     JOIN users u ON ((u.id = m.user_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = inventory_update_requests.org_id) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Employee insert requests" ON public."inventory_update_requests";
CREATE POLICY "Employee insert requests" ON public."inventory_update_requests" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (members m
     JOIN users u ON ((u.id = m.user_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = inventory_update_requests.org_id) AND (inventory_update_requests.requested_by = u.id)))));
DROP POLICY IF EXISTS "Employee read own requests" ON public."inventory_update_requests";
CREATE POLICY "Employee read own requests" ON public."inventory_update_requests" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((requested_by = get_my_claim('sub'::text)));
DROP POLICY IF EXISTS "super_admin_insert_item_cost_history" ON public."item_cost_history";
CREATE POLICY "super_admin_insert_item_cost_history" ON public."item_cost_history" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((is_super_admin() AND (organization_id = ( SELECT item_cost_history.organization_id
   FROM users
  WHERE (users.id = requesting_user_id())))));
DROP POLICY IF EXISTS "super_admin_item_cost_history_select" ON public."item_cost_history";
CREATE POLICY "super_admin_item_cost_history_select" ON public."item_cost_history" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_super_admin() AND (organization_id = ( SELECT members.organization_id
   FROM members
  WHERE (members.user_id = requesting_user_id())
 LIMIT 1))));
DROP POLICY IF EXISTS "super_admin_select_item_cost_history" ON public."item_cost_history";
CREATE POLICY "super_admin_select_item_cost_history" ON public."item_cost_history" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((is_super_admin() AND (organization_id = ( SELECT item_cost_history.organization_id
   FROM users
  WHERE (users.id = requesting_user_id())))));
DROP POLICY IF EXISTS "Admin access own location items" ON public."item_locations";
CREATE POLICY "Admin access own location items" ON public."item_locations" AS PERMISSIVE FOR ALL TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (EXISTS ( SELECT 1
   FROM user_location_assignments ula
  WHERE ((ula.user_id = (auth.jwt() ->> 'sub'::text)) AND (ula.location_id = item_locations.location_id))))))
  WITH CHECK (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (EXISTS ( SELECT 1
   FROM user_location_assignments ula
  WHERE ((ula.user_id = (auth.jwt() ->> 'sub'::text)) AND (ula.location_id = item_locations.location_id))))));
DROP POLICY IF EXISTS "Admins and employees can select item_locations in their organiz" ON public."item_locations";
CREATE POLICY "Admins and employees can select item_locations in their organiz" ON public."item_locations" AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM ((members m
     JOIN users u ON ((u.id = m.user_id)))
     JOIN locations l ON ((l.id = item_locations.location_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = l.organization_id) AND (u.role = ANY (ARRAY['admin'::text, 'employee'::text]))))));
DROP POLICY IF EXISTS "Admins and employees can update item_locations in their organiz" ON public."item_locations";
CREATE POLICY "Admins and employees can update item_locations in their organiz" ON public."item_locations" AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM ((members m
     JOIN users u ON ((u.id = m.user_id)))
     JOIN locations l ON ((l.id = item_locations.location_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = l.organization_id) AND (u.role = ANY (ARRAY['admin'::text, 'employee'::text]))))));
DROP POLICY IF EXISTS "Admins can delete item_locations in their organization" ON public."item_locations";
CREATE POLICY "Admins can delete item_locations in their organization" ON public."item_locations" AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM ((members m
     JOIN users u ON ((u.id = m.user_id)))
     JOIN locations l ON ((l.id = item_locations.location_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = l.organization_id) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Employees read assigned location items" ON public."item_locations";
CREATE POLICY "Employees read assigned location items" ON public."item_locations" AS PERMISSIVE FOR SELECT TO public
  USING ((location_id IN ( SELECT user_location_assignments.location_id
   FROM user_location_assignments
  WHERE (user_location_assignments.user_id = (auth.jwt() ->> 'sub'::text)))));
DROP POLICY IF EXISTS "Employees update assigned location inventory" ON public."item_locations";
CREATE POLICY "Employees update assigned location inventory" ON public."item_locations" AS PERMISSIVE FOR UPDATE TO public
  USING ((location_id IN ( SELECT user_location_assignments.location_id
   FROM user_location_assignments
  WHERE (user_location_assignments.user_id = (auth.jwt() ->> 'sub'::text)))));
DROP POLICY IF EXISTS "Super admin full access" ON public."item_locations";
CREATE POLICY "Super admin full access" ON public."item_locations" AS PERMISSIVE FOR ALL TO public
  USING ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text))
  WITH CHECK ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text));
DROP POLICY IF EXISTS "Admin read pricing" ON public."item_warehouse_pricing";
CREATE POLICY "Admin read pricing" ON public."item_warehouse_pricing" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = get_my_claim('sub'::text)) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Super admin full access" ON public."item_warehouse_pricing";
CREATE POLICY "Super admin full access" ON public."item_warehouse_pricing" AS PERMISSIVE FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS "Admin read own location catalog" ON public."location_catalog";
CREATE POLICY "Admin read own location catalog" ON public."location_catalog" AS PERMISSIVE FOR SELECT TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (location_id = ( SELECT users.assigned_location_id
   FROM users
  WHERE (users.id = (auth.jwt() ->> 'sub'::text))))));
DROP POLICY IF EXISTS "Employee read own location catalog" ON public."location_catalog";
CREATE POLICY "Employee read own location catalog" ON public."location_catalog" AS PERMISSIVE FOR SELECT TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'employee'::text) AND (location_id = ( SELECT users.assigned_location_id
   FROM users
  WHERE (users.id = (auth.jwt() ->> 'sub'::text))))));
DROP POLICY IF EXISTS "Service role full access on location_catalog" ON public."location_catalog";
CREATE POLICY "Service role full access on location_catalog" ON public."location_catalog" AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Super admin full access on location_catalog" ON public."location_catalog";
CREATE POLICY "Super admin full access on location_catalog" ON public."location_catalog" AS PERMISSIVE FOR ALL TO public
  USING ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text));
DROP POLICY IF EXISTS "admin_read_location_catalog" ON public."location_catalog";
CREATE POLICY "admin_read_location_catalog" ON public."location_catalog" AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (auth.jwt() ->> 'sub'::text)) AND (users.role = 'admin'::text) AND (users.assigned_location_id = location_catalog.location_id)))));
DROP POLICY IF EXISTS "employee_read_location_catalog" ON public."location_catalog";
CREATE POLICY "employee_read_location_catalog" ON public."location_catalog" AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM users
  WHERE ((users.id = (auth.jwt() ->> 'sub'::text)) AND (users.role = 'employee'::text) AND (users.assigned_location_id = location_catalog.location_id)))));
DROP POLICY IF EXISTS "Admin select assigned locations" ON public."locations";
CREATE POLICY "Admin select assigned locations" ON public."locations" AS PERMISSIVE FOR SELECT TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND ((NOT (EXISTS ( SELECT 1
   FROM user_location_assignments
  WHERE (user_location_assignments.user_id = (auth.jwt() ->> 'sub'::text))))) OR (id IN ( SELECT user_location_assignments.location_id
   FROM user_location_assignments
  WHERE (user_location_assignments.user_id = (auth.jwt() ->> 'sub'::text)))))));
DROP POLICY IF EXISTS "Admin update own location" ON public."locations";
CREATE POLICY "Admin update own location" ON public."locations" AS PERMISSIVE FOR UPDATE TO public
  USING ((((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (id = ( SELECT users.assigned_location_id
   FROM users
  WHERE (users.id = (auth.jwt() ->> 'sub'::text))))) OR is_super_admin()));
DROP POLICY IF EXISTS "Admins can delete locations in their organization" ON public."locations";
CREATE POLICY "Admins can delete locations in their organization" ON public."locations" AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM (members m
     JOIN users u ON ((u.id = m.user_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = locations.organization_id) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Admins can update locations in their organization" ON public."locations";
CREATE POLICY "Admins can update locations in their organization" ON public."locations" AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM (members m
     JOIN users u ON ((u.id = m.user_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = locations.organization_id) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Employee select own location" ON public."locations";
CREATE POLICY "Employee select own location" ON public."locations" AS PERMISSIVE FOR SELECT TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'employee'::text) AND (id = ( SELECT users.assigned_location_id
   FROM users
  WHERE (users.id = (auth.jwt() ->> 'sub'::text))))));
DROP POLICY IF EXISTS "Employees read assigned location" ON public."locations";
CREATE POLICY "Employees read assigned location" ON public."locations" AS PERMISSIVE FOR SELECT TO public
  USING ((id IN ( SELECT user_location_assignments.location_id
   FROM user_location_assignments
  WHERE (user_location_assignments.user_id = (auth.jwt() ->> 'sub'::text)))));
DROP POLICY IF EXISTS "Super admin delete locations" ON public."locations";
CREATE POLICY "Super admin delete locations" ON public."locations" AS PERMISSIVE FOR DELETE TO authenticated
  USING (is_super_admin());
DROP POLICY IF EXISTS "Super admin insert locations" ON public."locations";
CREATE POLICY "Super admin insert locations" ON public."locations" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS "Super admin select all locations" ON public."locations";
CREATE POLICY "Super admin select all locations" ON public."locations" AS PERMISSIVE FOR SELECT TO authenticated
  USING (is_super_admin());
DROP POLICY IF EXISTS "Store admin read own location low stock thresholds" ON public."low_stock_thresholds";
CREATE POLICY "Store admin read own location low stock thresholds" ON public."low_stock_thresholds" AS PERMISSIVE FOR SELECT TO public
  USING ((EXISTS ( SELECT 1
   FROM users u
  WHERE ((u.id = (auth.jwt() ->> 'sub'::text)) AND (u.role = 'admin'::text) AND (u.assigned_location_id IS NOT NULL) AND (u.assigned_location_id = low_stock_thresholds.location_id)))));
DROP POLICY IF EXISTS "Super admin full access low stock thresholds" ON public."low_stock_thresholds";
CREATE POLICY "Super admin full access low stock thresholds" ON public."low_stock_thresholds" AS PERMISSIVE FOR ALL TO public
  USING ((EXISTS ( SELECT 1
   FROM (users u
     JOIN members m ON ((m.user_id = u.id)))
  WHERE ((u.id = (auth.jwt() ->> 'sub'::text)) AND (u.role = 'super_admin'::text) AND (m.organization_id = low_stock_thresholds.organization_id)))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (users u
     JOIN members m ON ((m.user_id = u.id)))
  WHERE ((u.id = (auth.jwt() ->> 'sub'::text)) AND (u.role = 'super_admin'::text) AND (m.organization_id = low_stock_thresholds.organization_id)))));
DROP POLICY IF EXISTS "admin_insert_notification_preferences" ON public."notification_preferences";
CREATE POLICY "admin_insert_notification_preferences" ON public."notification_preferences" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((location_id IS NOT NULL) AND (location_id = ( SELECT users.assigned_location_id
   FROM users
  WHERE ((users.id = requesting_user_id()) AND (users.role = 'admin'::text))))));
DROP POLICY IF EXISTS "admin_select_notification_preferences" ON public."notification_preferences";
CREATE POLICY "admin_select_notification_preferences" ON public."notification_preferences" AS PERMISSIVE FOR SELECT TO public
  USING (((( SELECT users.role
   FROM users
  WHERE (users.id = requesting_user_id())) = ANY (ARRAY['admin'::text, 'super_admin'::text])) AND ((location_id IS NULL) OR (location_id = ( SELECT users.assigned_location_id
   FROM users
  WHERE (users.id = requesting_user_id()))))));
DROP POLICY IF EXISTS "admin_update_notification_preferences" ON public."notification_preferences";
CREATE POLICY "admin_update_notification_preferences" ON public."notification_preferences" AS PERMISSIVE FOR UPDATE TO public
  USING (((location_id IS NOT NULL) AND (location_id = ( SELECT users.assigned_location_id
   FROM users
  WHERE ((users.id = requesting_user_id()) AND (users.role = 'admin'::text))))));
DROP POLICY IF EXISTS "super_admin_all_notification_preferences" ON public."notification_preferences";
CREATE POLICY "super_admin_all_notification_preferences" ON public."notification_preferences" AS PERMISSIVE FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS "fulfillment_lines_super_admin" ON public."order_ticket_fulfillment_lines";
CREATE POLICY "fulfillment_lines_super_admin" ON public."order_ticket_fulfillment_lines" AS PERMISSIVE FOR ALL TO authenticated
  USING (((auth.jwt() ->> 'role'::text) = 'super_admin'::text));
DROP POLICY IF EXISTS "Admin manage own location ticket items" ON public."order_ticket_items";
CREATE POLICY "Admin manage own location ticket items" ON public."order_ticket_items" AS PERMISSIVE FOR ALL TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (EXISTS ( SELECT 1
   FROM (order_tickets ot
     JOIN user_location_assignments ula ON (((ula.location_id = ot.requesting_location_id) AND (ula.user_id = (auth.jwt() ->> 'sub'::text)))))
  WHERE (ot.id = order_ticket_items.ticket_id)))))
  WITH CHECK (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (EXISTS ( SELECT 1
   FROM (order_tickets ot
     JOIN user_location_assignments ula ON (((ula.location_id = ot.requesting_location_id) AND (ula.user_id = (auth.jwt() ->> 'sub'::text)))))
  WHERE (ot.id = order_ticket_items.ticket_id)))));
DROP POLICY IF EXISTS "Employee view incoming delivery items" ON public."order_ticket_items";
CREATE POLICY "Employee view incoming delivery items" ON public."order_ticket_items" AS PERMISSIVE FOR SELECT TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'employee'::text) AND (EXISTS ( SELECT 1
   FROM (order_tickets ot
     JOIN user_location_assignments ula ON (((ula.location_id = ot.requesting_location_id) AND (ula.user_id = (auth.jwt() ->> 'sub'::text)))))
  WHERE ((ot.id = order_ticket_items.ticket_id) AND (ot.status = ANY (ARRAY['fulfilled'::text, 'confirmed'::text])))))));
DROP POLICY IF EXISTS "Service role full access" ON public."order_ticket_items";
CREATE POLICY "Service role full access" ON public."order_ticket_items" AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Super admin full access" ON public."order_ticket_items";
CREATE POLICY "Super admin full access" ON public."order_ticket_items" AS PERMISSIVE FOR ALL TO public
  USING ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text))
  WITH CHECK ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text));
DROP POLICY IF EXISTS "Admin access own location ticket logs" ON public."order_ticket_logs";
CREATE POLICY "Admin access own location ticket logs" ON public."order_ticket_logs" AS PERMISSIVE FOR ALL TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (EXISTS ( SELECT 1
   FROM (order_tickets ot
     JOIN user_location_assignments ula ON (((ula.location_id = ot.requesting_location_id) AND (ula.user_id = (auth.jwt() ->> 'sub'::text)))))
  WHERE (ot.id = order_ticket_logs.ticket_id)))))
  WITH CHECK (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (EXISTS ( SELECT 1
   FROM (order_tickets ot
     JOIN user_location_assignments ula ON (((ula.location_id = ot.requesting_location_id) AND (ula.user_id = (auth.jwt() ->> 'sub'::text)))))
  WHERE (ot.id = order_ticket_logs.ticket_id)))));
DROP POLICY IF EXISTS "Employee insert confirmation log" ON public."order_ticket_logs";
CREATE POLICY "Employee insert confirmation log" ON public."order_ticket_logs" AS PERMISSIVE FOR INSERT TO public
  WITH CHECK (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'employee'::text) AND (EXISTS ( SELECT 1
   FROM (order_tickets ot
     JOIN user_location_assignments ula ON (((ula.location_id = ot.requesting_location_id) AND (ula.user_id = (auth.jwt() ->> 'sub'::text)))))
  WHERE (ot.id = order_ticket_logs.ticket_id)))));
DROP POLICY IF EXISTS "Employee view delivery ticket logs" ON public."order_ticket_logs";
CREATE POLICY "Employee view delivery ticket logs" ON public."order_ticket_logs" AS PERMISSIVE FOR SELECT TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'employee'::text) AND (EXISTS ( SELECT 1
   FROM (order_tickets ot
     JOIN user_location_assignments ula ON (((ula.location_id = ot.requesting_location_id) AND (ula.user_id = (auth.jwt() ->> 'sub'::text)))))
  WHERE ((ot.id = order_ticket_logs.ticket_id) AND (ot.status = ANY (ARRAY['fulfilled'::text, 'confirmed'::text])))))));
DROP POLICY IF EXISTS "Service role full access" ON public."order_ticket_logs";
CREATE POLICY "Service role full access" ON public."order_ticket_logs" AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text))
  WITH CHECK ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "Super admin full access" ON public."order_ticket_logs";
CREATE POLICY "Super admin full access" ON public."order_ticket_logs" AS PERMISSIVE FOR ALL TO public
  USING ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text))
  WITH CHECK ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text));
DROP POLICY IF EXISTS "Admin manage own location tickets" ON public."order_tickets";
CREATE POLICY "Admin manage own location tickets" ON public."order_tickets" AS PERMISSIVE FOR ALL TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (EXISTS ( SELECT 1
   FROM user_location_assignments ula
  WHERE ((ula.user_id = (auth.jwt() ->> 'sub'::text)) AND (ula.location_id = order_tickets.requesting_location_id))))))
  WITH CHECK (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (EXISTS ( SELECT 1
   FROM user_location_assignments ula
  WHERE ((ula.user_id = (auth.jwt() ->> 'sub'::text)) AND (ula.location_id = order_tickets.requesting_location_id))))));
DROP POLICY IF EXISTS "Service role full access" ON public."order_tickets";
CREATE POLICY "Service role full access" ON public."order_tickets" AS PERMISSIVE FOR ALL TO public
  USING (true)
  WITH CHECK (true);
DROP POLICY IF EXISTS "Super admin full access" ON public."order_tickets";
CREATE POLICY "Super admin full access" ON public."order_tickets" AS PERMISSIVE FOR ALL TO public
  USING ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text))
  WITH CHECK ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text));
DROP POLICY IF EXISTS "Admin full access" ON public."org_invites";
CREATE POLICY "Admin full access" ON public."org_invites" AS PERMISSIVE FOR ALL TO public
  USING (((auth.jwt() ->> 'user_role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text])))
  WITH CHECK (((auth.jwt() ->> 'user_role'::text) = ANY (ARRAY['admin'::text, 'super_admin'::text])));
DROP POLICY IF EXISTS "pallet_inventory_employee_read" ON public."pallet_inventory";
CREATE POLICY "pallet_inventory_employee_read" ON public."pallet_inventory" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((auth.jwt() ->> 'role'::text) = 'employee'::text) AND (EXISTS ( SELECT 1
   FROM (warehouse_pallets wp
     JOIN users u ON ((u.assigned_location_id = wp.warehouse_location_id)))
  WHERE ((wp.id = pallet_inventory.pallet_id) AND (u.id = (auth.uid())::text))))));
DROP POLICY IF EXISTS "pallet_inventory_super_admin" ON public."pallet_inventory";
CREATE POLICY "pallet_inventory_super_admin" ON public."pallet_inventory" AS PERMISSIVE FOR ALL TO authenticated
  USING (((auth.jwt() ->> 'role'::text) = 'super_admin'::text));
DROP POLICY IF EXISTS "pallet_ops_super_admin" ON public."pallet_operations_log";
CREATE POLICY "pallet_ops_super_admin" ON public."pallet_operations_log" AS PERMISSIVE FOR ALL TO authenticated
  USING (((auth.jwt() ->> 'role'::text) = 'super_admin'::text));
DROP POLICY IF EXISTS "Service role full access" ON public."payment_holds";
CREATE POLICY "Service role full access" ON public."payment_holds" AS PERMISSIVE FOR ALL TO public
  USING ((auth.role() = 'service_role'::text));
DROP POLICY IF EXISTS "admin_read_po_item_box_configs" ON public."po_item_box_configs";
CREATE POLICY "admin_read_po_item_box_configs" ON public."po_item_box_configs" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (purchase_order_items poi
     JOIN purchase_orders po ON ((po.id = poi.purchase_order_id)))
  WHERE ((poi.id = po_item_box_configs.purchase_order_item_id) AND (get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (po.organization_id = ( SELECT members.organization_id
           FROM members
          WHERE (members.user_id = (auth.jwt() ->> 'sub'::text))
         LIMIT 1))))));
DROP POLICY IF EXISTS "super_admin_full_crud_po_item_box_configs" ON public."po_item_box_configs";
CREATE POLICY "super_admin_full_crud_po_item_box_configs" ON public."po_item_box_configs" AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((purchase_order_items poi
     JOIN purchase_orders po ON ((po.id = poi.purchase_order_id)))
     JOIN users u ON (((u.id = requesting_user_id()) AND (u.role = 'super_admin'::text))))
  WHERE (poi.id = po_item_box_configs.purchase_order_item_id))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((purchase_order_items poi
     JOIN purchase_orders po ON ((po.id = poi.purchase_order_id)))
     JOIN users u ON (((u.id = requesting_user_id()) AND (u.role = 'super_admin'::text))))
  WHERE (poi.id = po_item_box_configs.purchase_order_item_id))));
DROP POLICY IF EXISTS "super_admin_all_purchase_order_items" ON public."purchase_order_items";
CREATE POLICY "super_admin_all_purchase_order_items" ON public."purchase_order_items" AS PERMISSIVE FOR ALL TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM purchase_orders po
  WHERE ((po.id = purchase_order_items.purchase_order_id) AND is_super_admin() AND (po.organization_id = ( SELECT po.organization_id
           FROM users
          WHERE (users.id = requesting_user_id())))))))
  WITH CHECK ((EXISTS ( SELECT 1
   FROM purchase_orders po
  WHERE ((po.id = purchase_order_items.purchase_order_id) AND is_super_admin() AND (po.organization_id = ( SELECT po.organization_id
           FROM users
          WHERE (users.id = requesting_user_id())))))));
DROP POLICY IF EXISTS "super_admin_purchase_order_items_all" ON public."purchase_order_items";
CREATE POLICY "super_admin_purchase_order_items_all" ON public."purchase_order_items" AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_super_admin() AND (EXISTS ( SELECT 1
   FROM purchase_orders po
  WHERE ((po.id = purchase_order_items.purchase_order_id) AND (po.organization_id = ( SELECT members.organization_id
           FROM members
          WHERE (members.user_id = requesting_user_id())
         LIMIT 1)))))))
  WITH CHECK ((is_super_admin() AND (EXISTS ( SELECT 1
   FROM purchase_orders po
  WHERE ((po.id = purchase_order_items.purchase_order_id) AND (po.organization_id = ( SELECT members.organization_id
           FROM members
          WHERE (members.user_id = requesting_user_id())
         LIMIT 1)))))));
DROP POLICY IF EXISTS "super_admin_all_purchase_orders" ON public."purchase_orders";
CREATE POLICY "super_admin_all_purchase_orders" ON public."purchase_orders" AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_super_admin() AND (organization_id = ( SELECT members.organization_id
   FROM members
  WHERE (members.user_id = requesting_user_id())
 LIMIT 1))))
  WITH CHECK ((is_super_admin() AND (organization_id = ( SELECT members.organization_id
   FROM members
  WHERE (members.user_id = requesting_user_id())
 LIMIT 1))));
DROP POLICY IF EXISTS "super_admin_purchase_orders_all" ON public."purchase_orders";
CREATE POLICY "super_admin_purchase_orders_all" ON public."purchase_orders" AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_super_admin() AND (organization_id = ( SELECT members.organization_id
   FROM members
  WHERE (members.user_id = requesting_user_id())
 LIMIT 1))))
  WITH CHECK ((is_super_admin() AND (organization_id = ( SELECT members.organization_id
   FROM members
  WHERE (members.user_id = requesting_user_id())
 LIMIT 1))));
DROP POLICY IF EXISTS "Admin delete own store storage spaces" ON public."storage_spaces";
CREATE POLICY "Admin delete own store storage spaces" ON public."storage_spaces" AS PERMISSIVE FOR DELETE TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (location_id = ( SELECT users.assigned_location_id
   FROM users
  WHERE (users.id = (auth.jwt() ->> 'sub'::text)))) AND (( SELECT locations.location_type
   FROM locations
  WHERE (locations.id = storage_spaces.location_id)) = 'store'::text)));
DROP POLICY IF EXISTS "Admin insert own store storage spaces" ON public."storage_spaces";
CREATE POLICY "Admin insert own store storage spaces" ON public."storage_spaces" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (location_id = ( SELECT users.assigned_location_id
   FROM users
  WHERE (users.id = (auth.jwt() ->> 'sub'::text)))) AND (( SELECT locations.location_type
   FROM locations
  WHERE (locations.id = storage_spaces.location_id)) = 'store'::text)));
DROP POLICY IF EXISTS "Admin select storage spaces" ON public."storage_spaces";
CREATE POLICY "Admin select storage spaces" ON public."storage_spaces" AS PERMISSIVE FOR SELECT TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND ((NOT (EXISTS ( SELECT 1
   FROM user_location_assignments
  WHERE (user_location_assignments.user_id = (auth.jwt() ->> 'sub'::text))))) OR (location_id IN ( SELECT user_location_assignments.location_id
   FROM user_location_assignments
  WHERE (user_location_assignments.user_id = (auth.jwt() ->> 'sub'::text)))))));
DROP POLICY IF EXISTS "Admin update own store storage spaces" ON public."storage_spaces";
CREATE POLICY "Admin update own store storage spaces" ON public."storage_spaces" AS PERMISSIVE FOR UPDATE TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'admin'::text) AND (location_id = ( SELECT users.assigned_location_id
   FROM users
  WHERE (users.id = (auth.jwt() ->> 'sub'::text)))) AND (( SELECT locations.location_type
   FROM locations
  WHERE (locations.id = storage_spaces.location_id)) = 'store'::text)));
DROP POLICY IF EXISTS "Admins can delete storage_spaces in their organization" ON public."storage_spaces";
CREATE POLICY "Admins can delete storage_spaces in their organization" ON public."storage_spaces" AS PERMISSIVE FOR DELETE TO public
  USING ((EXISTS ( SELECT 1
   FROM ((members m
     JOIN users u ON ((u.id = m.user_id)))
     JOIN locations l ON ((l.id = storage_spaces.location_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = l.organization_id) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Admins can update storage_spaces in their organization" ON public."storage_spaces";
CREATE POLICY "Admins can update storage_spaces in their organization" ON public."storage_spaces" AS PERMISSIVE FOR UPDATE TO public
  USING ((EXISTS ( SELECT 1
   FROM ((members m
     JOIN users u ON ((u.id = m.user_id)))
     JOIN locations l ON ((l.id = storage_spaces.location_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = l.organization_id) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Employee select own location storage spaces" ON public."storage_spaces";
CREATE POLICY "Employee select own location storage spaces" ON public."storage_spaces" AS PERMISSIVE FOR SELECT TO public
  USING (((get_user_role((auth.jwt() ->> 'sub'::text)) = 'employee'::text) AND (location_id = ( SELECT users.assigned_location_id
   FROM users
  WHERE (users.id = (auth.jwt() ->> 'sub'::text))))));
DROP POLICY IF EXISTS "Super admin full access storage spaces" ON public."storage_spaces";
CREATE POLICY "Super admin full access storage spaces" ON public."storage_spaces" AS PERMISSIVE FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());
DROP POLICY IF EXISTS "Admin insert own org purchase items" ON public."store_purchase_items";
CREATE POLICY "Admin insert own org purchase items" ON public."store_purchase_items" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM ((store_purchases sp
     JOIN members m ON ((m.organization_id = sp.org_id)))
     JOIN users u ON ((u.id = m.user_id)))
  WHERE ((sp.id = store_purchase_items.purchase_id) AND (u.id = get_my_claim('sub'::text)) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Admin read own org purchase items" ON public."store_purchase_items";
CREATE POLICY "Admin read own org purchase items" ON public."store_purchase_items" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM ((store_purchases sp
     JOIN members m ON ((m.organization_id = sp.org_id)))
     JOIN users u ON ((u.id = m.user_id)))
  WHERE ((sp.id = store_purchase_items.purchase_id) AND (u.id = get_my_claim('sub'::text)) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Admin insert own org purchases" ON public."store_purchases";
CREATE POLICY "Admin insert own org purchases" ON public."store_purchases" AS PERMISSIVE FOR INSERT TO authenticated
  WITH CHECK ((EXISTS ( SELECT 1
   FROM (members m
     JOIN users u ON ((u.id = m.user_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = store_purchases.org_id) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "Admin read own org purchases" ON public."store_purchases";
CREATE POLICY "Admin read own org purchases" ON public."store_purchases" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((EXISTS ( SELECT 1
   FROM (members m
     JOIN users u ON ((u.id = m.user_id)))
  WHERE ((u.id = get_my_claim('sub'::text)) AND (m.organization_id = store_purchases.org_id) AND (u.role = 'admin'::text)))));
DROP POLICY IF EXISTS "ticket_deliveries_admin_read" ON public."ticket_deliveries";
CREATE POLICY "ticket_deliveries_admin_read" ON public."ticket_deliveries" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((auth.jwt() ->> 'role'::text) = 'admin'::text) AND (EXISTS ( SELECT 1
   FROM order_tickets ot
  WHERE ((ot.id = ticket_deliveries.ticket_id) AND (ot.requesting_location_id = ( SELECT users.assigned_location_id
           FROM users
          WHERE (users.id = (auth.uid())::text))))))));
DROP POLICY IF EXISTS "ticket_deliveries_employee_read" ON public."ticket_deliveries";
CREATE POLICY "ticket_deliveries_employee_read" ON public."ticket_deliveries" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((auth.jwt() ->> 'role'::text) = 'employee'::text) AND (EXISTS ( SELECT 1
   FROM order_tickets ot
  WHERE ((ot.id = ticket_deliveries.ticket_id) AND (ot.requesting_location_id = ( SELECT users.assigned_location_id
           FROM users
          WHERE (users.id = (auth.uid())::text))) AND (ot.status = ANY (ARRAY['in_transit'::text, 'delivered'::text, 'confirmed'::text])))))));
DROP POLICY IF EXISTS "ticket_deliveries_super_admin" ON public."ticket_deliveries";
CREATE POLICY "ticket_deliveries_super_admin" ON public."ticket_deliveries" AS PERMISSIVE FOR ALL TO authenticated
  USING (((auth.jwt() ->> 'role'::text) = 'super_admin'::text));
DROP POLICY IF EXISTS "Admin full access assignments" ON public."user_location_assignments";
CREATE POLICY "Admin full access assignments" ON public."user_location_assignments" AS PERMISSIVE FOR ALL TO public
  USING ((get_user_role((auth.jwt() ->> 'sub'::text)) = ANY (ARRAY['admin'::text, 'super_admin'::text])))
  WITH CHECK ((get_user_role((auth.jwt() ->> 'sub'::text)) = ANY (ARRAY['admin'::text, 'super_admin'::text])));
DROP POLICY IF EXISTS "Super admin full access" ON public."user_location_assignments";
CREATE POLICY "Super admin full access" ON public."user_location_assignments" AS PERMISSIVE FOR ALL TO public
  USING (is_super_admin());
DROP POLICY IF EXISTS "Users read own assignment" ON public."user_location_assignments";
CREATE POLICY "Users read own assignment" ON public."user_location_assignments" AS PERMISSIVE FOR SELECT TO public
  USING ((user_id = (auth.jwt() ->> 'sub'::text)));
DROP POLICY IF EXISTS "Admin select own location users" ON public."users";
CREATE POLICY "Admin select own location users" ON public."users" AS PERMISSIVE FOR SELECT TO public
  USING ((get_user_role((auth.jwt() ->> 'sub'::text)) = ANY (ARRAY['admin'::text, 'super_admin'::text])));
DROP POLICY IF EXISTS "Admin update own location employees" ON public."users";
CREATE POLICY "Admin update own location employees" ON public."users" AS PERMISSIVE FOR UPDATE TO public
  USING ((get_user_role((auth.jwt() ->> 'sub'::text)) = ANY (ARRAY['admin'::text, 'super_admin'::text])));
DROP POLICY IF EXISTS "Employees read own record" ON public."users";
CREATE POLICY "Employees read own record" ON public."users" AS PERMISSIVE FOR SELECT TO public
  USING ((id = (auth.jwt() ->> 'sub'::text)));
DROP POLICY IF EXISTS "super_admin_all_warehouse_expense_rates" ON public."warehouse_expense_rates";
CREATE POLICY "super_admin_all_warehouse_expense_rates" ON public."warehouse_expense_rates" AS PERMISSIVE FOR ALL TO authenticated
  USING ((is_super_admin() AND (organization_id = ( SELECT members.organization_id
   FROM members
  WHERE (members.user_id = requesting_user_id())
 LIMIT 1))))
  WITH CHECK ((is_super_admin() AND (organization_id = ( SELECT members.organization_id
   FROM members
  WHERE (members.user_id = requesting_user_id())
 LIMIT 1))));
DROP POLICY IF EXISTS "Super admin full access" ON public."warehouse_expenses";
CREATE POLICY "Super admin full access" ON public."warehouse_expenses" AS PERMISSIVE FOR ALL TO public
  USING ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text))
  WITH CHECK ((get_user_role((auth.jwt() ->> 'sub'::text)) = 'super_admin'::text));
DROP POLICY IF EXISTS "warehouse_pallets_employee_read" ON public."warehouse_pallets";
CREATE POLICY "warehouse_pallets_employee_read" ON public."warehouse_pallets" AS PERMISSIVE FOR SELECT TO authenticated
  USING ((((auth.jwt() ->> 'role'::text) = 'employee'::text) AND (warehouse_location_id = ( SELECT users.assigned_location_id
   FROM users
  WHERE (users.id = (auth.uid())::text)))));
DROP POLICY IF EXISTS "warehouse_pallets_super_admin" ON public."warehouse_pallets";
CREATE POLICY "warehouse_pallets_super_admin" ON public."warehouse_pallets" AS PERMISSIVE FOR ALL TO authenticated
  USING (((auth.jwt() ->> 'role'::text) = 'super_admin'::text));
DROP POLICY IF EXISTS "rent_snapshots_super_admin" ON public."warehouse_rent_snapshots";
CREATE POLICY "rent_snapshots_super_admin" ON public."warehouse_rent_snapshots" AS PERMISSIVE FOR ALL TO authenticated
  USING (((auth.jwt() ->> 'role'::text) = 'super_admin'::text));
DROP POLICY IF EXISTS "Super admin full access" ON public."warehouse_transfer_price_history";
CREATE POLICY "Super admin full access" ON public."warehouse_transfer_price_history" AS PERMISSIVE FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

-- 10. Grants for new tables and views
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."delivery_estimation_accuracy" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."delivery_estimation_accuracy" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."delivery_estimation_accuracy" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."inventory_update_requests" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."inventory_update_requests" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."inventory_update_requests" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."item_box_totals" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."item_box_totals" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."item_box_totals" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."item_cost_history" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."item_cost_history" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."item_cost_history" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."item_shipment_breakdown" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."item_shipment_breakdown" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."item_shipment_breakdown" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."item_warehouse_pricing" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."item_warehouse_pricing" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."item_warehouse_pricing" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."items_with_costs" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."items_with_costs" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."items_with_costs" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."items_with_prices" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."items_with_prices" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."items_with_prices" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."order_ticket_fulfillment_lines" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."order_ticket_fulfillment_lines" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."order_ticket_fulfillment_lines" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."pallet_inventory" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."pallet_inventory" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."pallet_inventory" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."pallet_operations_log" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."pallet_operations_log" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."pallet_operations_log" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."po_item_box_configs" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."po_item_box_configs" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."po_item_box_configs" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."purchase_order_items" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."purchase_order_items" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."purchase_order_items" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."purchase_orders" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."purchase_orders" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."purchase_orders" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."store_purchase_items" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."store_purchase_items" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."store_purchase_items" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."store_purchases" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."store_purchases" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."store_purchases" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."store_warehouse_spend_monthly" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."store_warehouse_spend_monthly" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."store_warehouse_spend_monthly" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."ticket_deliveries" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."ticket_deliveries" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."ticket_deliveries" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."user_location_assignments" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."user_location_assignments" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."user_location_assignments" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_expense_rates" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_expense_rates" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_expense_rates" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_expenses" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_expenses" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_expenses" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_inventory_overview" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_inventory_overview" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_inventory_overview" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_pallets" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_pallets" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_pallets" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_rent_snapshots" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_rent_snapshots" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_rent_snapshots" TO service_role;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_transfer_price_history" TO anon;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_transfer_price_history" TO authenticated;
GRANT DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE ON public."warehouse_transfer_price_history" TO service_role;

-- 11. Monthly warehouse rent snapshot job (exists on dev)
SELECT cron.schedule('warehouse-rent-snapshot', '0 0 1 * *', $$SELECT take_warehouse_rent_snapshot(id) FROM organizations$$);

COMMIT;
