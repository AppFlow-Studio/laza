-- Migration: 005_rls_super_admin.sql
-- Task 1.7 + 1.8 — is_super_admin() helper + update ALL existing RLS policies
--
-- SOURCE FILES AUDITED:
--   001_admin_schema.sql          → organizations, locations, storage_spaces,
--                                   items, item_locations, inventory_logs, alerts
--   002_org_invites.sql           → org_invites
--   003_update_limits_system.sql  → update_limits, update_override_logs (no RLS existed)
--   004_email_notifications.sql   → notification_preferences, low_stock_thresholds,
--                                   daily_summary_preferences, email_delivery_logs,
--                                   low_stock_notification_queue
--   005_scheduled_email_jobs.sql  → email_schedule_log
--
-- RULE APPLIED EVERYWHERE:
--   role = 'admin'  →  role IN ('admin', 'super_admin')
--
-- UNTOUCHED:
--   - All employee policies (zero changes)
--   - All "Service role full access" policies (zero changes)
--   - members table (managed by Clerk webhook, no migration file found —
--     verify manually in Supabase dashboard)
-- ============================================================


-- ============================================================
-- TASK 1.7 — is_super_admin() helper function
-- Referenced by policies and future RPC functions.
-- ============================================================

CREATE OR REPLACE FUNCTION is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM users
    WHERE users.id = auth.uid()::text
    AND users.role = 'super_admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- ============================================================
-- 001_admin_schema.sql — 7 tables
-- ============================================================

-- organizations
DROP POLICY IF EXISTS "Admins full access" ON organizations;
CREATE POLICY "Admins full access" ON organizations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- locations
DROP POLICY IF EXISTS "Admins full access" ON locations;
CREATE POLICY "Admins full access" ON locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
    )
  );
-- "Employees read assigned location" — NO CHANGE

-- storage_spaces
DROP POLICY IF EXISTS "Admins full access" ON storage_spaces;
CREATE POLICY "Admins full access" ON storage_spaces
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- items
DROP POLICY IF EXISTS "Admins full access" ON items;
CREATE POLICY "Admins full access" ON items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
    )
  );

-- item_locations
DROP POLICY IF EXISTS "Admins full access" ON item_locations;
CREATE POLICY "Admins full access" ON item_locations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
    )
  );
-- "Employees read assigned location items" — NO CHANGE
-- "Employees update assigned location inventory" — NO CHANGE

-- inventory_logs
DROP POLICY IF EXISTS "Admins full access" ON inventory_logs;
CREATE POLICY "Admins full access" ON inventory_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
    )
  );
-- "Employees insert inventory logs" — NO CHANGE

-- alerts
DROP POLICY IF EXISTS "Admins full access" ON alerts;
CREATE POLICY "Admins full access" ON alerts
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
    )
  );


-- ============================================================
-- 002_org_invites.sql — 1 table
-- ============================================================

-- org_invites
DROP POLICY IF EXISTS "Admins manage org invites" ON org_invites;
CREATE POLICY "Admins manage org invites" ON org_invites
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
      AND EXISTS (
        SELECT 1 FROM members
        WHERE members.user_id = users.id
        AND members.organization_id = org_invites.organization_id
      )
    )
  );
-- "Service role full access" — NO CHANGE


-- ============================================================
-- 003_update_limits_system.sql — 2 tables (no RLS existed, adding fresh)
-- ============================================================

ALTER TABLE update_limits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access" ON update_limits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Employees read own location limits" ON update_limits
  FOR SELECT USING (
    location_id = (
      SELECT assigned_location_id FROM users WHERE id = auth.uid()::text
    )
  );

ALTER TABLE update_override_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access" ON update_override_logs
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
    )
  );


-- ============================================================
-- 004_email_notifications.sql — 5 tables
-- ============================================================

-- notification_preferences
DROP POLICY IF EXISTS "Admins manage notification preferences" ON notification_preferences;
CREATE POLICY "Admins manage notification preferences" ON notification_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
      AND EXISTS (
        SELECT 1 FROM members
        WHERE members.user_id = users.id
        AND members.organization_id::text = notification_preferences.organization_id::text
      )
    )
  );
-- "Service role full access notification preferences" — NO CHANGE

-- low_stock_thresholds
DROP POLICY IF EXISTS "Admins manage low stock thresholds" ON low_stock_thresholds;
CREATE POLICY "Admins manage low stock thresholds" ON low_stock_thresholds
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
      AND EXISTS (
        SELECT 1 FROM members
        WHERE members.user_id = users.id
        AND members.organization_id::text = low_stock_thresholds.organization_id::text
      )
    )
  );
-- "Service role full access low stock thresholds" — NO CHANGE

-- daily_summary_preferences
DROP POLICY IF EXISTS "Admins manage daily summary preferences" ON daily_summary_preferences;
CREATE POLICY "Admins manage daily summary preferences" ON daily_summary_preferences
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
      AND EXISTS (
        SELECT 1 FROM members
        WHERE members.user_id = users.id
        AND members.organization_id::text = daily_summary_preferences.organization_id::text
      )
    )
  );
-- "Service role full access daily summary preferences" — NO CHANGE

-- email_delivery_logs
DROP POLICY IF EXISTS "Admins view email delivery logs" ON email_delivery_logs;
CREATE POLICY "Admins view email delivery logs" ON email_delivery_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
      AND EXISTS (
        SELECT 1 FROM members
        WHERE members.user_id = users.id
        AND members.organization_id::text = email_delivery_logs.organization_id::text
      )
    )
  );
-- "Service role full access email delivery logs" — NO CHANGE

-- low_stock_notification_queue
DROP POLICY IF EXISTS "Admins view notification queue" ON low_stock_notification_queue;
CREATE POLICY "Admins view notification queue" ON low_stock_notification_queue
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
      AND EXISTS (
        SELECT 1 FROM members
        WHERE members.user_id = users.id
        AND members.organization_id::text = low_stock_notification_queue.organization_id::text
      )
    )
  );
-- "Service role full access notification queue" — NO CHANGE


-- ============================================================
-- 005_scheduled_email_jobs.sql — 1 table
-- ============================================================

-- email_schedule_log
DROP POLICY IF EXISTS "Admins view email schedule logs" ON email_schedule_log;
CREATE POLICY "Admins view email schedule logs" ON email_schedule_log
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()::text
      AND users.role IN ('admin', 'super_admin')
      AND EXISTS (
        SELECT 1 FROM members
        WHERE members.user_id = users.id
        AND members.organization_id::text = email_schedule_log.organization_id::text
      )
    )
  );
-- "Service role full access email schedule log" — NO CHANGE


-- ============================================================
-- users table (no policy existed — adding fresh)
-- ============================================================

ALTER TABLE users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins full access" ON users
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = auth.uid()::text
      AND u.role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Employees read own record" ON users
  FOR SELECT USING (
    id = auth.uid()::text
  );


-- ============================================================
-- NEW TABLES from 004_warehouse_foundation.sql
-- order_tickets, order_ticket_items, order_ticket_logs,
-- payment_holds — covered by Task 1.9 in the next migration.
-- ============================================================


-- ============================================================
-- FINAL TRACKING SPREADSHEET
--
-- Table                        | Found In          | Policy Updated
-- -----------------------------|-------------------|----------------
-- organizations                | 001_admin_schema  | YES
-- locations                    | 001_admin_schema  | YES
-- storage_spaces               | 001_admin_schema  | YES
-- items                        | 001_admin_schema  | YES
-- item_locations               | 001_admin_schema  | YES
-- inventory_logs               | 001_admin_schema  | YES
-- alerts                       | 001_admin_schema  | YES
-- org_invites                  | 002_org_invites   | YES
-- update_limits                | 003_update_limits | YES (RLS added fresh)
-- update_override_logs         | 003_update_limits | YES (RLS added fresh)
-- notification_preferences     | 004_email_notifs  | YES
-- low_stock_thresholds         | 004_email_notifs  | YES
-- daily_summary_preferences    | 004_email_notifs  | YES
-- email_delivery_logs          | 004_email_notifs  | YES
-- low_stock_notification_queue | 004_email_notifs  | YES
-- email_schedule_log           | 005_scheduled     | YES
-- users                        | 001 (ALTER only)  | YES (RLS added fresh)
-- order_tickets                | 004_warehouse     | PENDING → Task 1.9
-- order_ticket_items           | 004_warehouse     | PENDING → Task 1.9
-- order_ticket_logs            | 004_warehouse     | PENDING → Task 1.9
-- payment_holds                | 004_warehouse     | PENDING → Task 1.9
-- members                      | NOT IN ANY FILE   | ⚠️  CHECK MANUALLY
--                              |                   | (Clerk webhook managed)
-- ============================================================
