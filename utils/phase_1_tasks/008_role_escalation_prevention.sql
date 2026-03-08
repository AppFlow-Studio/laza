-- Migration: 008_role_escalation_prevention.sql
-- Task 1.24 — Role escalation prevention guards

-- Create get_user_role helper if it doesn't exist
-- (may already exist if applied manually via SQL editor)
CREATE OR REPLACE FUNCTION get_user_role(user_id TEXT)
RETURNS TEXT AS $$
DECLARE
  user_role TEXT;
BEGIN
  SELECT role INTO user_role
  FROM users
  WHERE id = user_id;
  RETURN user_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create is_super_admin helper
CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role(auth.jwt() ->> 'sub'::text) = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create is_admin_or_above helper
CREATE OR REPLACE FUNCTION is_admin_or_above()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role(auth.jwt() ->> 'sub'::text) IN ('admin', 'super_admin');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- GUARD 1: users table UPDATE
-- Admin can only set role to 'admin' or 'employee', never 'super_admin'
-- Super admin can set any role
-- Drop the broad policy from 005 and replace with split policies

DROP POLICY IF EXISTS "Admins full access" ON users;

CREATE POLICY "Super admin full access on users" ON users
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub'::text) = 'super_admin'
  );

CREATE POLICY "Admin read and manage non-super users" ON users
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
  )
  WITH CHECK (
    -- Admin cannot set or promote anyone to super_admin
    get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
    AND (role IS NULL OR role IN ('admin', 'employee'))
  );

CREATE POLICY "Employees read own record" ON users
  FOR SELECT USING (
    id = auth.jwt() ->> 'sub'::text
  );


-- GUARD 2: org_invites INSERT
-- Admin cannot create invitations with role = 'super_admin'
-- Drop existing policy and replace with split policies

DROP POLICY IF EXISTS "Admins manage org invites" ON org_invites;

CREATE POLICY "Super admin full access on org_invites" ON org_invites
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub'::text) = 'super_admin'
  );

CREATE POLICY "Admin manage own org invites" ON org_invites
  FOR ALL USING (
    get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
    AND EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.jwt() ->> 'sub'::text
      AND members.organization_id = org_invites.organization_id
    )
  )
  WITH CHECK (
    -- Admin cannot invite anyone as super_admin
    get_user_role(auth.jwt() ->> 'sub'::text) = 'admin'
    AND org_invites.role IN ('admin', 'employee')
    AND EXISTS (
      SELECT 1 FROM members
      WHERE members.user_id = auth.jwt() ->> 'sub'::text
      AND members.organization_id = org_invites.organization_id
    )
  );

CREATE POLICY "Service role full access on org_invites" ON org_invites
  FOR ALL USING (auth.role() = 'service_role');