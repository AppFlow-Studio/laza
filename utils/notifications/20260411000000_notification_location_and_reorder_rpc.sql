-- ─── 1. Add location_id to notification_preferences ─────────────────────────
-- Allows per-location prefs (e.g. warehouse-specific alert email).
-- NULL means org-wide fallback, which is the existing behaviour.
ALTER TABLE public.notification_preferences
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.locations(id) ON DELETE CASCADE;

-- Index for the common lookup pattern used by edge functions
CREATE INDEX IF NOT EXISTS notification_preferences_org_location_idx
  ON public.notification_preferences (organization_id, location_id);

-- ─── 2. get_reorder_alerts RPC ───────────────────────────────────────────────
-- Computes predictive reorder alerts for an org by:
--   • burn rate  = negative quantity_change sum from inventory_logs
--                  (action_type = 'fulfillment') in the last 90 days / 12.86 wks
--   • current stock = SUM(box_count) across non-retired pallets in warehouse
--   • weeks_remaining = current_stock / avg_weekly_units
--   • urgency:
--       critical → weeks_remaining ≤ lead_time_days / 7
--       warning  → weeks_remaining ≤ (lead_time + buffer) / 7
--       watch    → weeks_remaining ≤ (lead_time + buffer) / 7 * 2
-- Only items with a non-zero burn rate are returned.
CREATE OR REPLACE FUNCTION public.get_reorder_alerts(
  p_organization_id   text,
  p_lead_time_days    int  DEFAULT 45,
  p_buffer_days       int  DEFAULT 14
)
RETURNS TABLE (
  item_id                   bigint,
  item_name                 text,
  item_sku                  text,
  avg_weekly_units          numeric,
  current_warehouse_stock   numeric,
  weeks_remaining           numeric,
  urgency                   text
)
LANGUAGE sql
STABLE
SET search_path = public
AS $$
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
$$;

GRANT EXECUTE ON FUNCTION public.get_reorder_alerts(text, int, int)
  TO anon, authenticated, service_role;
