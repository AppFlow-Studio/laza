-- Fix: rename internal CTE columns so no unqualified 'item_id' symbol
-- exists inside the function body to conflict with the PL/pgSQL RETURNS TABLE
-- output variable of the same name (PostgreSQL error 42702).

CREATE OR REPLACE FUNCTION public.bulk_apply_markup(
  p_item_ids      BIGINT[],
  p_mode          TEXT,
  p_markup_pct    NUMERIC,
  p_reason        TEXT DEFAULT NULL
)
RETURNS TABLE (item_id BIGINT, previous_price NUMERIC, new_price NUMERIC)
LANGUAGE plpgsql SECURITY DEFINER AS $$
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
END; $$;

GRANT EXECUTE ON FUNCTION public.bulk_apply_markup TO authenticated;
