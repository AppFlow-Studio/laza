-- Migration: 015_permission_audit.sql
-- Task 1.22 — Permission Audit Trail Table (Schema Only)
--
-- APPEND-ONLY by design:
--   - No UPDATE policy
--   - No DELETE policy
--   - No updated_at column (immutable rows)
--
-- Insert logic is wired in mutation tasks (1.19, 1.12 extension).
-- Keep separate from other migrations — can be deferred independently.
--
-- DEPENDS ON:
--   005_rls_super_admin.sql  (is_super_admin helper)
-- ============================================================

CREATE TABLE permission_change_logs (
  id                   UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id      TEXT          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,

  -- SET NULL on user delete: preserves log entry for deleted accounts
  actor_user_id        TEXT          REFERENCES users(id) ON DELETE SET NULL,
  target_user_id       TEXT          REFERENCES users(id) ON DELETE SET NULL,

  action_type          TEXT          NOT NULL,

  -- Generic before/after for role changes, name changes, etc.
  previous_value       TEXT,
  new_value            TEXT,

  -- Location-specific fields for reassignment events
  previous_location_id UUID          REFERENCES locations(id) ON DELETE SET NULL,
  new_location_id      UUID          REFERENCES locations(id) ON DELETE SET NULL,

  -- Optional actor-provided reason (shown in audit UI for deactivations)
  notes                TEXT,

  -- 'application' set explicitly by app code.
  -- Default 'direct_db' flags changes made via Supabase Studio.
  source               TEXT          NOT NULL DEFAULT 'direct_db',

  -- Caller IP from auth context for security auditing
  ip_address           TEXT,

  -- No updated_at — immutable rows by design
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

ALTER TABLE permission_change_logs
  ADD CONSTRAINT pcl_action_type_check
  CHECK (action_type IN (
    'role_changed',
    'location_reassigned',
    'user_deactivated',
    'user_reactivated',
    'invitation_sent',
    'invitation_cancelled',
    'invitation_accepted'
  ));

-- Indexes for common query patterns
CREATE INDEX idx_pcl_org_created   ON permission_change_logs (organization_id, created_at DESC);
CREATE INDEX idx_pcl_target_user   ON permission_change_logs (target_user_id, created_at DESC);
CREATE INDEX idx_pcl_actor_user    ON permission_change_logs (actor_user_id, created_at DESC);
CREATE INDEX idx_pcl_action_type   ON permission_change_logs (action_type, created_at DESC);

-- RLS
ALTER TABLE permission_change_logs ENABLE ROW LEVEL SECURITY;

-- Super admin: SELECT all logs in their org
CREATE POLICY "Super admin read permission logs" ON permission_change_logs
  FOR SELECT TO authenticated
  USING ( is_super_admin() );

-- All authenticated: INSERT (application writes logs during mutations)
CREATE POLICY "Authenticated insert permission logs" ON permission_change_logs
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Service role: full access (Clerk webhook writes invitation_accepted events)
CREATE POLICY "Service role full access permission logs" ON permission_change_logs
  FOR ALL USING ( auth.role() = 'service_role' );

-- NO UPDATE policy — intentionally omitted.
-- NO DELETE policy — intentionally omitted.

-- FUTURE INTEGRATION (wired in mutation tasks, not here):
--   updateUser()         → role_changed, location_reassigned, user_deactivated, user_reactivated
--   createInvitation()   → invitation_sent
--   cancelInvitation()   → invitation_cancelled
--   Clerk webhook (1.12) → invitation_accepted on organizationMembership.created
--

-- App code MUST set source = 'application' on every INSERT.
-- Default 'direct_db' flags Supabase Studio changes in the audit log.
