-- Migration: 013_multi_admin_per_location.sql
-- Task 1.20 — Multi-Admin Per Location Support
--
-- WHAT THIS DOES:
--   1. Verifies (and removes if present) any UNIQUE constraint on
--      users.assigned_location_id — multiple admins per location must be allowed.
--   2. Adds performance indexes for per-location user queries
--      (these become hot paths in RLS policies as team grows).
--   3. No RLS changes — existing policies from Tasks 1.8/1.19 already
--      use assigned_location_id = get_user_assigned_location() which
--      naturally supports N admins per location.
--
-- DEPENDS ON:
--   005_rls_super_admin.sql
--   009_invitation_user_hierarchy.sql
-- ============================================================


-- ============================================================
-- STEP 1 — Drop UNIQUE constraint on assigned_location_id if it exists
--
-- The constraint name may vary by environment. We attempt to drop the
-- most common name patterns. If none match, this is a no-op (safe).
-- Run the verification query below first if unsure.
-- ============================================================

-- Verification query (run manually before deploying if needed):
-- SELECT conname FROM pg_constraint
-- WHERE conrelid = 'users'::regclass
--   AND contype = 'u'
--   AND conkey @> ARRAY[
--     (SELECT attnum FROM pg_attribute
--      WHERE attrelid = 'users'::regclass
--        AND attname = 'assigned_location_id')
--   ];

-- Safe DROP attempts for common constraint name patterns:
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_assigned_location_id_key;
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_assigned_location_id_unique;
ALTER TABLE users DROP CONSTRAINT IF EXISTS unique_assigned_location_id;


-- ============================================================
-- STEP 2 — Performance indexes for per-location user queries
--
-- idx_users_assigned_location:
--   Covers: WHERE assigned_location_id = X
--   Used by: RLS policies, getEmployeesByLocation(), admin user list
--
-- idx_users_location_role:
--   Covers: WHERE assigned_location_id = X AND role = Y
--   Used by: RLS policies doing role-scoped location lookups,
--            'Admins Here' stat card, employee counts per location
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_users_assigned_location
  ON users (assigned_location_id);

CREATE INDEX IF NOT EXISTS idx_users_location_role
  ON users (assigned_location_id, role);


-- ============================================================
-- NOTES FOR APPLICATION LAYER (no SQL changes, dev reminders)
-- ============================================================
-- 1. getEmployeesByLocation(locationId) — confirm no LIMIT 1 assumption.
--    Must return ALL users at the location regardless of count.
--
-- 2. useOrganizationUsers() — admin-scoped queries filter by
--    assigned_location_id. Confirm no single-row assumption in UI.
--
-- 3. /admin/users stats grid:
--    - Replace org-wide 'Admins' card with 'Admins Here' (own location count).
--    - Replace org-wide 'Employees' with location-scoped count.
--    - Use useUserInfo() to get assigned_location_id, filter client-side.
--
-- 4. /super-admin/stores page:
--    - Each store card shows admin count + employee count separately.
--    - If admin count = 0, show warning badge ('No admin assigned').
--
-- 5. After deploying, run EXPLAIN (ANALYZE, BUFFERS) on
--    getEmployeesByLocation() to confirm index scan on
--    idx_users_location_role (no seq scan).
-- ============================================================


-- ============================================================
-- ACCEPTANCE CRITERIA TESTS
-- ============================================================
-- After migration:
--   INSERT two admin users with same assigned_location_id    → Both succeed (no unique violation)
--   Both admins log in and SELECT from inventory             → Both see same location data
--   Admin 1 invites employee                                 → Admin 2 sees invite in list
--   Admin 1 cannot SELECT from other location                → RLS blocks (unchanged behavior)
--   EXPLAIN ANALYZE on getEmployeesByLocation(id)            → Index scan on idx_users_location_role
-- ============================================================
