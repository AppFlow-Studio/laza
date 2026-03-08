-- Migration: 010_location_crud_restrictions.sql
-- Task 1.17 — Restrict Location/Warehouse CRUD to Super Admin Only
--
-- WHAT CHANGES:
--   locations        INSERT  admin → DENIED (super_admin only)
--   locations        DELETE  admin → DENIED (super_admin only)
--   locations        UPDATE  admin → allowed for own location, name + address only
--                            (column restriction enforced at query layer)
--   storage_spaces   INSERT  warehouse parent → DENIED for admin (super_admin only)
--   storage_spaces   DELETE  warehouse parent → DENIED for admin (super_admin only)
--   storage_spaces   INSERT  store parent     → unchanged (admin can manage own store)
--   storage_spaces   DELETE  store parent     → unchanged (admin can manage own store)
--
-- DEPENDS ON:
--   005_rls_super_admin.sql  (is_super_admin helper, get_user_role helper)
--   004_warehouse_foundation.sql (location_type column)
-- ============================================================


-- ============================================================
-- LOCATIONS — INSERT: super_admin only
-- ============================================================

-- Remove the broad admin INSERT grant applied in Task 1.8
DROP POLICY IF EXISTS "Admins full access" ON locations;

-- Super admin: INSERT
CREATE POLICY "Super admin insert locations" ON locations
  FOR INSERT TO authenticated
  WITH CHECK (
    is_super_admin()
  );

-- Super admin: DELETE
CREATE POLICY "Super admin delete locations" ON locations
  FOR DELETE TO authenticated
  USING (
    is_super_admin()
  );

-- Admin: UPDATE own location only (name + address).
-- NOTE: RLS cannot restrict individual columns on UPDATE.
--       The query layer (updateLocation() mutation) must strip
--       all fields except name and address for admin callers.
--       This policy only controls WHICH rows admin can update.
CREATE POLICY "Admin update own location" ON locations
  FOR UPDATE TO authenticated
  USING (
    (
      get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
      AND id = (
        SELECT assigned_location_id FROM users WHERE id = auth.jwt() ->> 'sub'::text
      )
    )
    OR is_super_admin()
  )
  WITH CHECK (
    (
      get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
      AND id = (
        SELECT assigned_location_id FROM users WHERE id = auth.jwt() ->> 'sub'::text
      )
    )
    OR is_super_admin()
  );

-- Super admin: SELECT (unrestricted, all locations)
CREATE POLICY "Super admin select all locations" ON locations
  FOR SELECT TO authenticated
  USING (
    is_super_admin()
  );

-- Admin: SELECT own location
-- (employee SELECT policy already exists from 001_admin_schema.sql — no change)
CREATE POLICY "Admin select own location" ON locations
  FOR SELECT TO authenticated
  USING (
    get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
    AND (
      id = (
        SELECT assigned_location_id FROM users WHERE id = auth.jwt() ->> 'sub'::text
      )
      -- Also allow admins to read the warehouse catalog (item list only, no quantities)
      -- Quantity restriction enforced at query layer (Task 1.10)
      OR location_type = 'warehouse'
    )
  );


-- ============================================================
-- STORAGE SPACES — warehouse parent requires super_admin
-- Store parent behavior unchanged for admin.
-- ============================================================

DROP POLICY IF EXISTS "Admins full access" ON storage_spaces;

-- Super admin: full access
CREATE POLICY "Super admin full access storage spaces" ON storage_spaces
  FOR ALL TO authenticated
  USING ( is_super_admin() )
  WITH CHECK ( is_super_admin() );

-- Admin: SELECT on own store's storage spaces + warehouse spaces (read-only for catalog)
CREATE POLICY "Admin select storage spaces" ON storage_spaces
  FOR SELECT TO authenticated
  USING (
    get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
    AND location_id IN (
      SELECT id FROM locations
      WHERE id = (
        SELECT assigned_location_id FROM users WHERE id = auth.jwt() ->> 'sub'::text
      )
      OR location_type = 'warehouse'
    )
  );

-- Admin: INSERT — only under own store, NOT warehouse
CREATE POLICY "Admin insert own store storage spaces" ON storage_spaces
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
    AND location_id = (
      SELECT assigned_location_id FROM users WHERE id = auth.jwt() ->> 'sub'::text
    )
    AND (
      SELECT location_type FROM locations WHERE id = location_id
    ) = 'store'
  );

-- Admin: UPDATE — only own store's storage spaces
CREATE POLICY "Admin update own store storage spaces" ON storage_spaces
  FOR UPDATE TO authenticated
  USING (
    get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
    AND location_id = (
      SELECT assigned_location_id FROM users WHERE id = auth.jwt() ->> 'sub'::text
    )
    AND (
      SELECT location_type FROM locations WHERE id = location_id
    ) = 'store'
  )
  WITH CHECK (
    get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
    AND location_id = (
      SELECT assigned_location_id FROM users WHERE id = auth.jwt() ->> 'sub'::text
    )
    AND (
      SELECT location_type FROM locations WHERE id = location_id
    ) = 'store'
  );

-- Admin: DELETE — only own store's storage spaces (not warehouse)
CREATE POLICY "Admin delete own store storage spaces" ON storage_spaces
  FOR DELETE TO authenticated
  USING (
    get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
    AND location_id = (
      SELECT assigned_location_id FROM users WHERE id = auth.jwt() ->> 'sub'::text
    )
    AND (
      SELECT location_type FROM locations WHERE id = location_id
    ) = 'store'
  );

-- Employee SELECT — unchanged from 001_admin_schema.sql (no touch needed)
-- Service role full access — unchanged from 001_admin_schema.sql (no touch needed)


-- ============================================================
-- ACCEPTANCE CRITERIA TESTS (run in Supabase SQL editor)
-- ============================================================
-- Test as admin role:
--   INSERT INTO locations (...)                   → RLS violation
--   DELETE FROM locations WHERE id = own          → RLS violation
--   UPDATE locations SET name = 'x' WHERE own     → Success
--   UPDATE locations SET location_type = 'warehouse' WHERE own → Success at RLS level,
--                                                   blocked at query layer
--   INSERT INTO storage_spaces (location_id = own_store)  → Success
--   INSERT INTO storage_spaces (location_id = warehouse)  → RLS violation
--   DELETE FROM storage_spaces WHERE parent = own_store   → Success
--   DELETE FROM storage_spaces WHERE parent = warehouse   → RLS violation
--
-- Test as super_admin:
--   All above → Success
-- ============================================================
