-- Fix: employee RLS policies on locations, item_locations, and inventory_logs
-- all reference users.assigned_location_id, which was dropped in migration
-- 019_users_table_change.sql. The column no longer exists, so the subquery
-- silently returns NULL and the policies never match — employees cannot read
-- their location, storage spaces, or inventory.
--
-- Fix: replace all four policies with equivalents that look up the assignment
-- via the user_location_assignments junction table.
--
-- NOTE: auth.uid() internally casts the JWT sub to UUID, which throws 22P02
-- for Clerk user IDs (e.g. "user_xxx"). Use (auth.jwt() ->> 'sub') instead —
-- this returns the raw string without any cast, matching how all other policies
-- in this project work.

-- ── locations ────────────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Employees read assigned location" ON locations;

CREATE POLICY "Employees read assigned location" ON locations
  FOR SELECT
  USING (
    id IN (
      SELECT location_id
      FROM user_location_assignments
      WHERE user_id = (auth.jwt() ->> 'sub')
    )
  );

-- ── item_locations ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Employees read assigned location items" ON item_locations;

CREATE POLICY "Employees read assigned location items" ON item_locations
  FOR SELECT
  USING (
    location_id IN (
      SELECT location_id
      FROM user_location_assignments
      WHERE user_id = (auth.jwt() ->> 'sub')
    )
  );

DROP POLICY IF EXISTS "Employees update assigned location inventory" ON item_locations;

CREATE POLICY "Employees update assigned location inventory" ON item_locations
  FOR UPDATE
  USING (
    location_id IN (
      SELECT location_id
      FROM user_location_assignments
      WHERE user_id = (auth.jwt() ->> 'sub')
    )
  );

-- ── inventory_logs ───────────────────────────────────────────────────────────

DROP POLICY IF EXISTS "Employees insert inventory logs" ON inventory_logs;

CREATE POLICY "Employees insert inventory logs" ON inventory_logs
  FOR INSERT
  WITH CHECK (
    location_id IN (
      SELECT location_id
      FROM user_location_assignments
      WHERE user_id = (auth.jwt() ->> 'sub')
    )
  );
