-- Add storage_space_id to alerts table
ALTER TABLE alerts
ADD COLUMN IF NOT EXISTS storage_space_id UUID REFERENCES storage_spaces(id) ON DELETE SET NULL;

-- Add index on storage_space_id for performance
CREATE INDEX IF NOT EXISTS idx_alerts_storage_space_id ON alerts(storage_space_id);

-- Add index for unique unresolved alerts per storage space
-- Note: PostgreSQL unique partial indexes with WHERE clause ensure one unresolved alert per (item, location, storage_space, alert_type)
-- We use a partial unique index that only applies when storage_space_id is NOT NULL
CREATE UNIQUE INDEX IF NOT EXISTS idx_alerts_unique_unresolved 
ON alerts(item_id, location_id, storage_space_id, alert_type) 
WHERE resolved_at IS NULL AND storage_space_id IS NOT NULL;

-- Update the check_low_stock function to work per storage space
CREATE OR REPLACE FUNCTION check_low_stock()
RETURNS TRIGGER AS $$
DECLARE
  min_qty NUMERIC(10, 2);
  item_record RECORD;
BEGIN
  -- Get item details and storage space specific override
  SELECT 
    i.min_quantity, 
    il.min_quantity_override 
  INTO item_record
  FROM items i
  LEFT JOIN item_locations il ON 
    il.item_id = i.id 
    AND il.location_id = NEW.location_id
    AND il.storage_space_id = NEW.storage_space_id
  WHERE i.id = NEW.item_id;

  -- Use override if exists, otherwise use item default, otherwise 0
  min_qty := COALESCE(item_record.min_quantity_override, item_record.min_quantity, 0);

  -- Check if quantity is below minimum
  -- Only create alerts for items with storage_space_id
  IF NEW.current_quantity < min_qty AND NEW.storage_space_id IS NOT NULL THEN
    -- Create or update alert with storage_space_id
    -- PostgreSQL will use the unique index automatically
    INSERT INTO alerts (item_id, location_id, storage_space_id, alert_type, triggered_at)
    VALUES (NEW.item_id, NEW.location_id, NEW.storage_space_id, 'low_stock', NOW())
    ON CONFLICT (item_id, location_id, storage_space_id, alert_type) 
    WHERE resolved_at IS NULL AND storage_space_id IS NOT NULL
    DO UPDATE SET triggered_at = NOW();
  ELSE
    -- Resolve existing alert if quantity is now above minimum
    UPDATE alerts
    SET resolved_at = NOW()
    WHERE item_id = NEW.item_id
      AND location_id = NEW.location_id
      AND storage_space_id = NEW.storage_space_id
      AND alert_type = 'low_stock'
      AND resolved_at IS NULL;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Update trigger to also fire on min_quantity_override changes
DROP TRIGGER IF EXISTS check_low_stock_trigger ON item_locations;

CREATE TRIGGER check_low_stock_trigger
AFTER INSERT OR UPDATE OF current_quantity, min_quantity_override ON item_locations
FOR EACH ROW EXECUTE FUNCTION check_low_stock();

-- Backfill existing alerts: resolve location-level alerts and create storage-space-level ones
-- First, resolve all existing alerts without storage_space_id
UPDATE alerts
SET resolved_at = NOW()
WHERE storage_space_id IS NULL
  AND resolved_at IS NULL;

-- Create new alerts for current low stock items per storage space
INSERT INTO alerts (item_id, location_id, storage_space_id, alert_type, triggered_at)
SELECT DISTINCT
  il.item_id,
  il.location_id,
  il.storage_space_id,
  'low_stock',
  NOW()
FROM item_locations il
JOIN items i ON i.id = il.item_id
WHERE il.current_quantity < COALESCE(il.min_quantity_override, i.min_quantity, 0)
  AND il.storage_space_id IS NOT NULL
ON CONFLICT (item_id, location_id, storage_space_id, alert_type) 
WHERE resolved_at IS NULL
DO NOTHING;

