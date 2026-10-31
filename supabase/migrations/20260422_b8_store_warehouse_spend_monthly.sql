-- store_warehouse_spend_monthly
-- Pre-aggregated monthly spend per requesting location.
-- Rows are visible only to the authenticated caller's allowed locations
-- because the underlying order_tickets RLS applies (SECURITY INVOKER default).

CREATE OR REPLACE VIEW public.store_warehouse_spend_monthly AS
SELECT
  ot.requesting_location_id                                          AS location_id,
  DATE_TRUNC('month', ot.fulfilled_at)::date                        AS month,
  SUM(
    oti.unit_price_at_time * COALESCE(oti.fulfilled_boxes, oti.quantity_boxes)
  )                                                                  AS total_spend
FROM  public.order_tickets      ot
JOIN  public.order_ticket_items oti ON oti.ticket_id = ot.id
WHERE ot.status      IN ('fulfilled', 'confirmed', 'delivered')
  AND ot.fulfilled_at IS NOT NULL
  AND oti.unit_price_at_time IS NOT NULL
GROUP BY
  ot.requesting_location_id,
  DATE_TRUNC('month', ot.fulfilled_at)::date;
