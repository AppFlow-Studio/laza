BEGIN;

-- Admin + super admin: items with transfer price, NO landed cost exposed
CREATE OR REPLACE VIEW public.items_with_prices AS
SELECT
  i.id,
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
FROM public.items i
LEFT JOIN public.item_warehouse_pricing iwp ON iwp.item_id = i.id;

ALTER VIEW public.items_with_prices SET (security_barrier = true);
GRANT SELECT ON public.items_with_prices TO authenticated;

-- Super admin only: everything including cost + computed margin
CREATE OR REPLACE VIEW public.items_with_costs AS
SELECT
  i.*,
  iwp.warehouse_transfer_price,
  iwp.updated_at AS price_updated_at,
  CASE
    WHEN i.current_unit_cost IS NOT NULL AND iwp.warehouse_transfer_price IS NOT NULL
    THEN iwp.warehouse_transfer_price - i.current_unit_cost
  END AS unit_margin,
  CASE
    WHEN i.current_unit_cost IS NOT NULL
      AND iwp.warehouse_transfer_price IS NOT NULL
      AND i.current_unit_cost > 0
    THEN ROUND(
      ((iwp.warehouse_transfer_price - i.current_unit_cost) / i.current_unit_cost) * 100,
    2)
  END AS margin_pct
FROM public.items i
LEFT JOIN public.item_warehouse_pricing iwp ON iwp.item_id = i.id
WHERE public.is_super_admin();

ALTER VIEW public.items_with_costs SET (security_barrier = true);
GRANT SELECT ON public.items_with_costs TO authenticated;

COMMIT;