BEGIN;

-- Add nullable FK column to store_purchase_items
ALTER TABLE public.store_purchase_items
  ADD COLUMN storage_space_id UUID REFERENCES public.storage_spaces(id);

-- Recreate RPC to read per-item storage_space_id
DROP FUNCTION IF EXISTS public.create_store_purchase(TEXT, UUID, TEXT, TIMESTAMPTZ, TEXT, TEXT, JSONB);

CREATE OR REPLACE FUNCTION public.create_store_purchase(
  p_org_id        TEXT,
  p_location_id   UUID,
  p_purchased_by  TEXT,
  p_purchased_at  TIMESTAMPTZ,
  p_supplier_name TEXT,
  p_notes         TEXT,
  p_items         JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

COMMIT;
