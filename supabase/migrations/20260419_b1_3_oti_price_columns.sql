BEGIN;

ALTER TABLE public.order_ticket_items
  ADD COLUMN unit_price_at_time NUMERIC CHECK (unit_price_at_time IS NULL OR unit_price_at_time > 0),
  ADD COLUMN price_locked_at    TIMESTAMPTZ,
  ADD COLUMN line_cost          NUMERIC CHECK (line_cost IS NULL OR line_cost >= 0);

COMMENT ON COLUMN public.order_ticket_items.unit_price_at_time IS
  'Warehouse transfer price snapshotted at order submission. Locks store-facing price.';

COMMENT ON COLUMN public.order_ticket_items.price_locked_at IS
  'When unit_price_at_time was captured (matches order_tickets.submitted_at).';

COMMENT ON COLUMN public.order_ticket_items.line_cost IS
  'fulfilled_units x unit_cost_at_time. Super-admin-only margin analysis.';

COMMENT ON COLUMN public.order_ticket_items.line_total IS
  'CHANGED 2026-04-19: now fulfilled_units x unit_price_at_time (store-facing).';

COMMIT;