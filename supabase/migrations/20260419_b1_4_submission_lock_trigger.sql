BEGIN;

CREATE OR REPLACE FUNCTION public.snapshot_transfer_prices_on_submit()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
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
END; $$;

CREATE TRIGGER trg_snapshot_transfer_prices_on_submit
  BEFORE UPDATE OF status ON public.order_tickets
  FOR EACH ROW EXECUTE FUNCTION public.snapshot_transfer_prices_on_submit();

COMMIT;