BEGIN;

-- ─── Tables ───────────────────────────────────────────────────────────────────

CREATE TABLE public.store_purchases (
  id             UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id         TEXT        NOT NULL REFERENCES public.organizations(id),
  location_id    UUID        NOT NULL REFERENCES public.locations(id) ON DELETE CASCADE,
  purchased_by   TEXT        NOT NULL REFERENCES public.users(id),
  purchased_at   TIMESTAMPTZ NOT NULL,
  supplier_name  TEXT,
  notes          TEXT,
  total_cost     NUMERIC     NOT NULL DEFAULT 0 CHECK (total_cost >= 0),
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE public.store_purchase_items (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  purchase_id  UUID    NOT NULL REFERENCES public.store_purchases(id) ON DELETE CASCADE,
  item_id      BIGINT  NOT NULL REFERENCES public.items(id),
  quantity     NUMERIC NOT NULL CHECK (quantity > 0),
  unit_cost    NUMERIC NOT NULL CHECK (unit_cost >= 0),
  line_total   NUMERIC GENERATED ALWAYS AS (quantity * unit_cost) STORED
);

-- ─── RPC: create_store_purchase ───────────────────────────────────────────────
-- Atomically inserts the purchase header, line items, increments item_locations,
-- and writes inventory_logs entries. Returns the new purchase UUID.

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
  v_purchase_id UUID;
  v_item        JSONB;
  v_item_id     BIGINT;
  v_qty         NUMERIC;
  v_unit_cost   NUMERIC;
  v_total_cost  NUMERIC := 0;
  v_prev_qty    double precision;
  v_new_qty     double precision;
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
    v_item_id   := (v_item->>'item_id')::bigint;
    v_qty       := (v_item->>'quantity')::numeric;
    v_unit_cost := (v_item->>'unit_cost')::numeric;

    -- Insert line item (line_total is generated)
    INSERT INTO public.store_purchase_items (purchase_id, item_id, quantity, unit_cost)
    VALUES (v_purchase_id, v_item_id, v_qty, v_unit_cost);

    -- Read current quantity (NULL storage_space_id = location-level unassigned stock)
    SELECT COALESCE(current_quantity, 0)
    INTO v_prev_qty
    FROM public.item_locations
    WHERE item_id    = v_item_id
      AND location_id = p_location_id
      AND storage_space_id IS NULL;

    IF NOT FOUND THEN v_prev_qty := 0; END IF;
    v_new_qty := v_prev_qty + v_qty;

    -- Upsert item_locations (UPDATE first to avoid NULL unique-constraint edge cases)
    UPDATE public.item_locations
    SET current_quantity = v_new_qty,
        last_updated     = NOW()
    WHERE item_id        = v_item_id
      AND location_id    = p_location_id
      AND storage_space_id IS NULL;

    IF NOT FOUND THEN
      INSERT INTO public.item_locations
        (item_id, location_id, storage_space_id, current_quantity, organization_id, last_updated)
      VALUES
        (v_item_id, p_location_id, NULL, v_new_qty, p_org_id, NOW());
    END IF;

    -- Audit log
    INSERT INTO public.inventory_logs
      (item_id, location_id, storage_space_id, action_type,
       previous_quantity, new_quantity, quantity_change,
       user_id, notes, organization_id)
    VALUES
      (v_item_id, p_location_id, NULL, 'received',
       v_prev_qty, v_new_qty, v_qty,
       p_purchased_by, 'Store purchase ' || v_purchase_id::text, p_org_id);
  END LOOP;

  RETURN v_purchase_id;
END;
$$;

-- ─── RLS ──────────────────────────────────────────────────────────────────────

ALTER TABLE public.store_purchases      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.store_purchase_items ENABLE ROW LEVEL SECURITY;

-- Admins of the org can read/insert purchases for their org
CREATE POLICY "Admin read own org purchases" ON public.store_purchases
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = get_my_claim('sub')
        AND u.organization_id = store_purchases.org_id
        AND u.role = 'admin'
    )
  );

CREATE POLICY "Admin insert own org purchases" ON public.store_purchases
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.id = get_my_claim('sub')
        AND u.organization_id = store_purchases.org_id
        AND u.role = 'admin'
    )
  );

CREATE POLICY "Admin read own org purchase items" ON public.store_purchase_items
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.store_purchases sp
      JOIN public.users u ON u.id = get_my_claim('sub')
      WHERE sp.id = store_purchase_items.purchase_id
        AND sp.org_id = u.organization_id
        AND u.role = 'admin'
    )
  );

CREATE POLICY "Admin insert own org purchase items" ON public.store_purchase_items
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.store_purchases sp
      JOIN public.users u ON u.id = get_my_claim('sub')
      WHERE sp.id = store_purchase_items.purchase_id
        AND sp.org_id = u.organization_id
        AND u.role = 'admin'
    )
  );

COMMIT;
