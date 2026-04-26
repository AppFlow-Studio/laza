BEGIN;

CREATE TABLE public.warehouse_transfer_price_history (
  id              UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         BIGINT      NOT NULL REFERENCES public.items(id) ON DELETE CASCADE,
  previous_price  NUMERIC     CHECK (previous_price IS NULL OR previous_price > 0),
  new_price       NUMERIC     NOT NULL CHECK (new_price > 0),
  change_source   TEXT        NOT NULL CHECK (change_source IN
                                ('initial_set', 'manual_edit', 'bulk_markup')),
  batch_id        UUID        NULL,
  change_reason   TEXT        NULL,
  changed_by      TEXT        NOT NULL REFERENCES public.users(id),
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wtph_item_created ON public.warehouse_transfer_price_history (item_id, created_at DESC);
CREATE INDEX idx_wtph_batch ON public.warehouse_transfer_price_history (batch_id) WHERE batch_id IS NOT NULL;

ALTER TABLE public.warehouse_transfer_price_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access" ON public.warehouse_transfer_price_history
  FOR ALL TO authenticated
  USING (is_super_admin())
  WITH CHECK (is_super_admin());

CREATE OR REPLACE FUNCTION public.log_transfer_price_change()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
END; $$;

CREATE TRIGGER trg_log_transfer_price_change
  AFTER INSERT OR UPDATE ON public.item_warehouse_pricing
  FOR EACH ROW EXECUTE FUNCTION public.log_transfer_price_change();

COMMIT;