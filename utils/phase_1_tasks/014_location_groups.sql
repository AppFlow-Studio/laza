-- Migration: 014_location_groups.sql
-- Task 1.21 — Location Groups Table (Regional Grouping Schema Only)
--
-- Schema-only. No UI, no API endpoints, no hooks in this task.
-- Groups allow the Super Admin to organize locations into regions
-- for analytics aggregation. Keep this file SEPARATE from
-- 004_warehouse_foundation.sql so it can be deferred independently.
--
-- DEPENDS ON:
--   004_warehouse_foundation.sql  (location_type column)
--   005_rls_super_admin.sql       (is_super_admin helper)
-- ============================================================


CREATE TABLE location_groups (
  id              UUID          NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  organization_id TEXT          NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            TEXT          NOT NULL,
  description     TEXT,
  created_by      TEXT          REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE TRIGGER set_location_groups_updated_at
  BEFORE UPDATE ON location_groups
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_location_groups_org
  ON location_groups (organization_id);


-- Add group_id FK to locations
-- NULL = ungrouped. ON DELETE SET NULL preserves locations if group deleted.
ALTER TABLE locations
  ADD COLUMN group_id UUID REFERENCES location_groups(id) ON DELETE SET NULL;

CREATE INDEX idx_locations_group
  ON locations (group_id);


-- RLS
ALTER TABLE location_groups ENABLE ROW LEVEL SECURITY;

-- All authenticated users: SELECT (needed for group name display)
CREATE POLICY "Authenticated users read location groups" ON location_groups
  FOR SELECT TO authenticated
  USING (true);

-- Super admin only: INSERT / UPDATE / DELETE
CREATE POLICY "Super admin write location groups" ON location_groups
  FOR ALL TO authenticated
  USING ( is_super_admin() )
  WITH CHECK ( is_super_admin() );

-- Service role: full access
CREATE POLICY "Service role full access location groups" ON location_groups
  FOR ALL USING ( auth.role() = 'service_role' );


-- NOTE: Warehouse location should never have a group_id.
--       Enforce in UI by excluding warehouse from group assignment dropdown.
--       Regenerate TypeScript types after applying this migration.
