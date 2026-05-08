-- FIX-A5: Expand RLS policy set on low_stock_thresholds.
--
-- Per April 15 meeting requirement for per-warehouse threshold UI.
-- Replaces the single catch-all "Admins manage low stock thresholds" policy with
-- three targeted policies:
--
--   1. Super Admin  — full CRUD, scoped to their org via members
--   2. Store Admin  — SELECT only, scoped to their assigned_location_id
--   3. Employee     — no policy → blocked by RLS (no explicit DENY needed)
--
-- Role mapping (users.role column):
--   'super_admin' → Super Admin
--   'admin'       → Store Admin
--   'employee'    → Employee (blocked by absence of policy)

-- Drop existing single policy
DROP POLICY IF EXISTS "Admins manage low stock thresholds" ON low_stock_thresholds;

-- ── Policy 1: Super Admin full CRUD at org scope ──────────────────────────────
CREATE POLICY "Super admin full access low stock thresholds"
  ON low_stock_thresholds
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users u
      JOIN members m ON m.user_id = u.id
      WHERE u.id = auth.jwt() ->> 'sub'
        AND u.role = 'super_admin'
        AND m.organization_id = low_stock_thresholds.organization_id
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users u
      JOIN members m ON m.user_id = u.id
      WHERE u.id = auth.jwt() ->> 'sub'
        AND u.role = 'super_admin'
        AND m.organization_id = low_stock_thresholds.organization_id
    )
  );

-- ── Policy 2: Store Admin (admin role) read-only for their assigned location ──
-- Grants SELECT on thresholds where location_id matches the admin's
-- assigned_location_id. Org-wide thresholds (location_id IS NULL) are excluded
-- to avoid leaking cross-store config; super_admin handles those.
CREATE POLICY "Store admin read own location low stock thresholds"
  ON low_stock_thresholds
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.jwt() ->> 'sub'
        AND u.role = 'admin'
        AND u.assigned_location_id IS NOT NULL
        AND u.assigned_location_id = low_stock_thresholds.location_id
    )
  );

-- ── Policy 3: Employee — no policy = blocked ──────────────────────────────────
-- RLS is already enabled on this table. With no matching policy, employees are
-- denied access implicitly. No explicit DENY policy required.

-- "Service role full access low stock thresholds" — NO CHANGE (service role
-- bypasses RLS by default in Supabase; no policy needed).
