-- Migration: 012_invitation_user_hierarchy.sql
-- Task 1.19 — Invitation and User Management Hierarchy
--
-- WHAT CHANGES:
--   org_invites  INSERT  admin scoped to own location, role IN ('admin','employee') only
--   org_invites  SELECT  admin scoped to own location only
--   org_invites  UPDATE  admin scoped to own location only (cancel/resend)
--   users        UPDATE  admin scoped to employees at own location only
--                        (cannot reassign location, cannot escalate to admin/super_admin,
--                         cannot deactivate peer admins or other-location users)
--
-- NOTE: Application-layer guards in createInvitation(), updateUser(),
--       cancelInvitation(), resendInvitation() are required in addition to
--       these RLS policies. RLS is the authoritative enforcement layer;
--       app guards catch misuse earlier with better error messages.
--
-- DEPENDS ON:
--   005_rls_super_admin.sql  (is_super_admin, get_user_role helpers)
-- ============================================================


-- ============================================================
-- HELPER: get_user_role() — already exists with parameter name "user_id".
-- No changes needed — just confirming it exists before policies below use it.
-- ============================================================


-- ============================================================
-- ORG_INVITES — scoped INSERT, SELECT, UPDATE, DELETE for admins
-- ============================================================

-- Drop all existing org_invites policies (broad ones from 1.8 + any partial runs)
DROP POLICY IF EXISTS "Admins manage org invites" ON org_invites;
DROP POLICY IF EXISTS "Super admin full access org invites" ON org_invites;
DROP POLICY IF EXISTS "Admin manage own org invites" ON org_invites;
DROP POLICY IF EXISTS "Admin insert own location invites" ON org_invites;
DROP POLICY IF EXISTS "Admin select own location invites" ON org_invites;
DROP POLICY IF EXISTS "Admin update own location invites" ON org_invites;
DROP POLICY IF EXISTS "Admin delete own location invites" ON org_invites;

-- Super admin: full access to all invites org-wide
CREATE POLICY "Super admin full access org invites" ON org_invites
  FOR ALL TO authenticated
  USING ( is_super_admin() )
  WITH CHECK ( is_super_admin() );

-- Admin: INSERT — own location only, role must be 'admin' or 'employee'
CREATE POLICY "Admin insert own location invites" ON org_invites
  FOR INSERT TO authenticated
  WITH CHECK (
    get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
    AND role IN ('admin', 'employee')
    AND assigned_location_id = (
      SELECT assigned_location_id FROM users WHERE id = auth.jwt() ->> 'sub'::text
    )
  );

-- Admin: SELECT — own location invites only
CREATE POLICY "Admin select own location invites" ON org_invites
  FOR SELECT TO authenticated
                                                                  USING (
                                                                  get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
                                                                  AND assigned_location_id = (
                                                                  SELECT assigned_location_id FROM users WHERE id = auth.jwt() ->> 'sub'::text
                                                                  )
                                                                  );

-- Admin: UPDATE — own location invites only (cancel/resend writes status)
CREATE POLICY "Admin update own location invites" ON org_invites
  FOR UPDATE TO authenticated
                 USING (
                 get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
                 AND assigned_location_id = (
                 SELECT assigned_location_id FROM users WHERE id = auth.jwt() ->> 'sub'::text
                 )
                 )
      WITH CHECK (
                 get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
                 AND assigned_location_id = (
                 SELECT assigned_location_id FROM users WHERE id = auth.jwt() ->> 'sub'::text
                 )
                 );

-- Admin: DELETE — own location invites only
CREATE POLICY "Admin delete own location invites" ON org_invites
  FOR DELETE TO authenticated
  USING (
    get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
    AND assigned_location_id = (
      SELECT assigned_location_id FROM users WHERE id = auth.jwt() ->> 'sub'::text
    )
  );

-- Service role full access assumed from 002_org_invites.sql — no change needed.


-- ============================================================
-- USERS TABLE — scoped UPDATE for admins
-- ============================================================

-- Drop all existing users policies (broad ones from 1.8 + any partial runs)
DROP POLICY IF EXISTS "Admins full access" ON users;
DROP POLICY IF EXISTS "Super admin full access users" ON users;
DROP POLICY IF EXISTS "Admin read and manage non-super users" ON users;
DROP POLICY IF EXISTS "Admin select own location users" ON users;
DROP POLICY IF EXISTS "Admin update own location employees" ON users;

-- Super admin: full access to all users
CREATE POLICY "Super admin full access users" ON users
  FOR ALL TO authenticated
  USING ( is_super_admin() )
  WITH CHECK ( is_super_admin() );

-- Admin: SELECT — users at own location only
CREATE POLICY "Admin select own location users" ON users
  FOR SELECT TO authenticated
     USING (
         get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
         AND assigned_location_id = (
            SELECT assigned_location_id FROM users u2 WHERE u2.id = auth.jwt() ->> 'sub'::text
         )
     );

-- Admin: UPDATE — employees at own location only.
-- Column restrictions (no location_id change, no role escalation) enforced
-- at application layer in updateUser(). RLS restricts WHICH rows.
CREATE POLICY "Admin update own location employees" ON users
  FOR UPDATE TO authenticated
     USING (
        get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
        AND role = 'employee'
        AND assigned_location_id = (
            SELECT assigned_location_id FROM users u2 WHERE u2.id = auth.jwt() ->> 'sub'::text
        )
     )
      WITH CHECK (
          get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
          AND role = 'employee'
          AND assigned_location_id = (
            SELECT assigned_location_id FROM users u2 WHERE u2.id = auth.jwt() ->> 'sub'::text
          )
      );

-- Employee SELECT own record — assumed from Task 1.8, no change needed.


-- ============================================================
-- ACCEPTANCE CRITERIA TESTS
-- ============================================================
-- As admin:
--   INSERT org_invites role='employee' assigned=own_location    → Success
--   INSERT org_invites role='super_admin'                       → RLS violation
--   INSERT org_invites assigned=OTHER_location                  → RLS violation
--   SELECT org_invites                                          → Own location only
--   UPDATE org_invites WHERE assigned=own_location              → Success
--   UPDATE org_invites WHERE assigned=OTHER_location            → RLS violation
--   UPDATE users is_active=false WHERE role='employee', own     → Success
--   UPDATE users is_active=false WHERE role='admin', own        → RLS violation
--   UPDATE users is_active=false WHERE OTHER location           → RLS violation
--   UPDATE users SET assigned_location_id=X                    → App layer PermissionError
--   UPDATE users SET role='super_admin'                         → App layer PermissionError
--
-- As super_admin:
--   All above → Success
-- ============================================================