-- 005_location_catalog.sql

CREATE TABLE location_catalog (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID    NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  item_id     BIGINT  NOT NULL REFERENCES items(id)     ON DELETE CASCADE,
  assigned_by TEXT    REFERENCES users(id),  -- nullable: NULL = backfilled/system
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (location_id, item_id)
);

CREATE INDEX ON location_catalog (location_id);

-- Backfill from existing item_locations
INSERT INTO location_catalog (location_id, item_id, assigned_by, assigned_at)
SELECT DISTINCT
  il.location_id,
  il.item_id,
  NULL,
  NOW()
FROM item_locations il
ON CONFLICT DO NOTHING;

-- Enable RLS after backfill is done
ALTER TABLE location_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "super_admin_location_catalog" ON location_catalog
  FOR ALL USING (is_super_admin());

DROP POLICY IF EXISTS "admin_read_location_catalog" ON location_catalog;
CREATE POLICY "admin_read_location_catalog" ON location_catalog
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'admin'
      AND users.assigned_location_id = location_catalog.location_id
    )
  );

DROP POLICY IF EXISTS "employee_read_location_catalog" ON location_catalog;
CREATE POLICY "employee_read_location_catalog" ON location_catalog
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role = 'employee'
      AND users.assigned_location_id = location_catalog.location_id
    )
  );