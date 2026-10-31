BEGIN;

CREATE TABLE public.item_warehouse_pricing (
  item_id                   BIGINT      PRIMARY KEY REFERENCES public.items(id) ON DELETE CASCADE,
  warehouse_transfer_price  NUMERIC     NOT NULL CHECK (warehouse_transfer_price > 0),
  currency                  TEXT        NOT NULL DEFAULT 'USD',
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by                TEXT        NOT NULL REFERENCES public.users(id)
);

COMMENT ON TABLE public.item_warehouse_pricing IS
  'Warehouse-to-store transfer price per item. Super admin sets; admin reads. ' ||
  'Snapshotted into order_ticket_items.unit_price_at_time at order submission.';

CREATE OR REPLACE FUNCTION public.enforce_pricing_on_warehouse_item()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
END; $$;

CREATE TRIGGER trg_enforce_pricing_on_warehouse_item
  BEFORE INSERT OR UPDATE ON public.item_warehouse_pricing
  FOR EACH ROW EXECUTE FUNCTION public.enforce_pricing_on_warehouse_item();

ALTER TABLE public.item_warehouse_pricing ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access" ON public.item_warehouse_pricing
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE POLICY "Admin read pricing" ON public.item_warehouse_pricing
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM users u
    WHERE u.id = get_my_claim('sub')
      AND u.role = 'admin'
  ));

-- No employee policy → zero access

COMMIT;