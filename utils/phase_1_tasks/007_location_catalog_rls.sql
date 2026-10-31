-- Migration: 007_location_catalog.sql
-- Task 1.23 — Item-to-location assignment control
-- Creates location_catalog table and tightens item_locations RLS
-- so admins can only assign items already approved for their location.


-- 1. Create the table
CREATE TABLE location_catalog (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  location_id UUID    NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  item_id     BIGINT  NOT NULL REFERENCES items(id)     ON DELETE CASCADE,
  assigned_by TEXT    REFERENCES users(id),  -- nullable: NULL = backfilled/system
  assigned_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (location_id, item_id)
);

CREATE INDEX ON location_catalog (location_id);


-- 2. Backfill from existing item_locations BEFORE enabling RLS
INSERT INTO location_catalog (location_id, item_id, assigned_by, assigned_at)
SELECT DISTINCT
  il.location_id,
  il.item_id,
  NULL,
  NOW()
FROM item_locations il
ON CONFLICT DO NOTHING;


-- 3. Enable RLS and create policies on location_catalog
ALTER TABLE location_catalog ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Super admin full access" ON location_catalog
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.jwt() ->> 'sub'::text
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Admin read own location catalog" ON location_catalog
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.jwt() ->> 'sub'::text
      AND users.role = 'admin'
      AND users.assigned_location_id = location_catalog.location_id
    )
  );

CREATE POLICY "Employee read own location catalog" ON location_catalog
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.jwt() ->> 'sub'::text
      AND users.role = 'employee'
      AND users.assigned_location_id = location_catalog.location_id
    )
  );

CREATE POLICY "Service role full access" ON location_catalog
  FOR ALL USING (auth.role() = 'service_role');


-- 4. Tighten item_locations INSERT for admins
-- Drop the broad "Admins full access" policy and replace it with
-- two separate policies: one for super_admin (unrestricted) and
-- one for admin (restricted to items in their location_catalog).

DROP POLICY IF EXISTS "Admins full access" ON item_locations;

CREATE POLICY "Super admin full access" ON item_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.jwt() ->> 'sub'::text
      AND users.role = 'super_admin'
    )
  );

CREATE POLICY "Admin access own location items" ON item_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.jwt() ->> 'sub'::text
      AND users.role = 'admin'
      AND users.assigned_location_id = item_locations.location_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.jwt() ->> 'sub'::text
      AND users.role = 'admin'
      AND users.assigned_location_id = item_locations.location_id
    )
    AND EXISTS (
      SELECT 1 FROM location_catalog lc
      WHERE lc.location_id = item_locations.location_id
        AND lc.item_id     = item_locations.item_id
    )
  );