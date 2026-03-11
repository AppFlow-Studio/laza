-- =============================================================
-- Migration: 005_notification_preferences_location_scope.sql
-- Adds location_id to notification_preferences and
-- daily_summary_preferences so each store can override the
-- org-wide defaults independently.
-- =============================================================

-- ── 1. Add location_id columns ───────────────────────────────

ALTER TABLE notification_preferences
    ADD COLUMN IF NOT EXISTS location_id UUID
    REFERENCES locations(id) ON DELETE CASCADE;

ALTER TABLE daily_summary_preferences
    ADD COLUMN IF NOT EXISTS location_id UUID
    REFERENCES locations(id) ON DELETE CASCADE;

-- ── 2. Unique indexes ─────────────────────────────────────────
-- One org-wide default row (location_id IS NULL) per org.
-- One location-specific row per (org, location) pair.

CREATE UNIQUE INDEX IF NOT EXISTS notif_prefs_org_default_unique
    ON notification_preferences (organization_id)
    WHERE location_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS notif_prefs_org_location_unique
    ON notification_preferences (organization_id, location_id)
    WHERE location_id IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS daily_summary_prefs_org_default_unique
    ON daily_summary_preferences (organization_id)
    WHERE location_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS daily_summary_prefs_org_location_unique
    ON daily_summary_preferences (organization_id, location_id)
    WHERE location_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_notif_prefs_location_id
    ON notification_preferences (location_id);

CREATE INDEX IF NOT EXISTS idx_daily_summary_prefs_location_id
    ON daily_summary_preferences (location_id);

-- ── 3. RLS policies ───────────────────────────────────────────
-- Drop old broad admin policies; replace with scoped ones.
-- Adjust the DROP names if your actual policy names differ.

DROP POLICY IF EXISTS "admins_manage_notification_preferences"      ON notification_preferences;
DROP POLICY IF EXISTS "super_admin_manage_notification_preferences" ON notification_preferences;

-- Super admin: full access to all rows
CREATE POLICY "super_admin_all_notification_preferences"
    ON notification_preferences FOR ALL TO authenticated
    USING  (is_super_admin())
    WITH CHECK (is_super_admin());

-- Admin SELECT: org-wide defaults + their own location row
CREATE POLICY "admin_select_notification_preferences"
    ON notification_preferences FOR SELECT TO authenticated
    USING (
        (SELECT role FROM users WHERE id = requesting_user_id()) IN ('admin','super_admin')
        AND (
            location_id IS NULL
            OR location_id = (SELECT assigned_location_id FROM users WHERE id = requesting_user_id())
        )
    );

-- Admin INSERT: only their own location (never org-wide row)
CREATE POLICY "admin_insert_notification_preferences"
    ON notification_preferences FOR INSERT TO authenticated
    WITH CHECK (
        location_id IS NOT NULL
        AND location_id = (
            SELECT assigned_location_id FROM users
            WHERE id = requesting_user_id() AND role = 'admin'
        )
    );

-- Admin UPDATE: only their own location row
CREATE POLICY "admin_update_notification_preferences"
    ON notification_preferences FOR UPDATE TO authenticated
    USING (
        location_id IS NOT NULL
        AND location_id = (SELECT assigned_location_id FROM users WHERE id = requesting_user_id() AND role = 'admin')
    )
    WITH CHECK (
        location_id IS NOT NULL
        AND location_id = (SELECT assigned_location_id FROM users WHERE id = requesting_user_id() AND role = 'admin')
    );

-- daily_summary_preferences (same pattern)
DROP POLICY IF EXISTS "admins_manage_daily_summary_preferences"      ON daily_summary_preferences;
DROP POLICY IF EXISTS "super_admin_manage_daily_summary_preferences" ON daily_summary_preferences;

CREATE POLICY "super_admin_all_daily_summary_preferences"
    ON daily_summary_preferences FOR ALL TO authenticated
    USING  (is_super_admin())
    WITH CHECK (is_super_admin());

CREATE POLICY "admin_select_daily_summary_preferences"
    ON daily_summary_preferences FOR SELECT TO authenticated
    USING (
        (SELECT role FROM users WHERE id = requesting_user_id()) IN ('admin','super_admin')
        AND (
            location_id IS NULL
            OR location_id = (SELECT assigned_location_id FROM users WHERE id = requesting_user_id())
        )
    );

CREATE POLICY "admin_insert_daily_summary_preferences"
    ON daily_summary_preferences FOR INSERT TO authenticated
    WITH CHECK (
        location_id IS NOT NULL
        AND location_id = (
            SELECT assigned_location_id FROM users
            WHERE id = requesting_user_id() AND role = 'admin'
        )
    );

CREATE POLICY "admin_update_daily_summary_preferences"
    ON daily_summary_preferences FOR UPDATE TO authenticated
    USING (
        location_id IS NOT NULL
        AND location_id = (SELECT assigned_location_id FROM users WHERE id = requesting_user_id() AND role = 'admin')
    )
    WITH CHECK (
        location_id IS NOT NULL
        AND location_id = (SELECT assigned_location_id FROM users WHERE id = requesting_user_id() AND role = 'admin')
    );

-- ── 4. RPC: get_effective_notification_preferences ────────────
-- Returns the merged preferences for a location.
-- Priority: location-specific override → org-wide default → system defaults.
-- Called by the alert service and edge functions.

CREATE OR REPLACE FUNCTION get_effective_notification_preferences(
    p_organization_id TEXT,
    p_location_id     UUID
)
RETURNS TABLE (
    notifications_enabled    BOOLEAN,
    low_stock_alerts_enabled BOOLEAN,
    delivery_mode            TEXT,
    quiet_hours_start        TIME,
    quiet_hours_end          TIME,
    primary_email            TEXT,
    secondary_emails         JSONB,
    timezone                 TEXT,
    source                   TEXT   -- 'location' | 'org_default' | 'system_default'
)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
    loc_row notification_preferences%ROWTYPE;
    org_row notification_preferences%ROWTYPE;
BEGIN
    SELECT * INTO loc_row
    FROM   notification_preferences
    WHERE  organization_id = p_organization_id
      AND  location_id = p_location_id
    LIMIT 1;

    SELECT * INTO org_row
    FROM   notification_preferences
    WHERE  organization_id = p_organization_id
      AND  location_id IS NULL
    LIMIT 1;

    IF loc_row.id IS NOT NULL THEN
        RETURN QUERY SELECT
            COALESCE(loc_row.notifications_enabled,    org_row.notifications_enabled,    TRUE),
            COALESCE(loc_row.low_stock_alerts_enabled, org_row.low_stock_alerts_enabled, TRUE),
            COALESCE(loc_row.delivery_mode,            org_row.delivery_mode,            'immediate'),
            COALESCE(loc_row.quiet_hours_start,        org_row.quiet_hours_start),
            COALESCE(loc_row.quiet_hours_end,          org_row.quiet_hours_end),
            COALESCE(loc_row.primary_email,            org_row.primary_email),
            COALESCE(loc_row.secondary_emails,         org_row.secondary_emails,         '[]'::jsonb),
            COALESCE(loc_row.timezone,                 org_row.timezone,                 'UTC'),
            'location'::TEXT;
    ELSIF org_row.id IS NOT NULL THEN
        RETURN QUERY SELECT
            COALESCE(org_row.notifications_enabled,    TRUE),
            COALESCE(org_row.low_stock_alerts_enabled, TRUE),
            COALESCE(org_row.delivery_mode,            'immediate'),
            org_row.quiet_hours_start,
            org_row.quiet_hours_end,
            org_row.primary_email,
            COALESCE(org_row.secondary_emails, '[]'::jsonb),
            COALESCE(org_row.timezone, 'UTC'),
            'org_default'::TEXT;
    ELSE
        RETURN QUERY SELECT
            TRUE, TRUE, 'immediate'::TEXT,
            NULL::TIME, NULL::TIME, NULL::TEXT,
            '[]'::JSONB, 'UTC'::TEXT,
            'system_default'::TEXT;
    END IF;
END;
$$;
