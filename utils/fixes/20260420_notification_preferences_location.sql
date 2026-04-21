-- supabase/migrations/20260420_notification_preferences_location.sql

-- ── notification_preferences ──────────────────────────────────────────────────
-- Replace UNIQUE(organization_id) with UNIQUE(organization_id, location_id) so
-- every location can have its own preferences row.
-- location_id is intentionally nullable: NULL = org-wide default row.
-- PostgreSQL treats NULLs as distinct in unique indexes, so only one NULL row
-- per organization_id is allowed, while each (org, location) pair is unique.

ALTER TABLE "public"."notification_preferences"
  ADD COLUMN IF NOT EXISTS "location_id" uuid
    REFERENCES "public"."locations"("id") ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'notification_preferences'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'unique_organization_notification_preferences'
  ) THEN
    ALTER TABLE "public"."notification_preferences"
      DROP CONSTRAINT "unique_organization_notification_preferences";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'notification_preferences'
      AND constraint_name = 'notification_preferences_org_location_unique'
  ) THEN
    ALTER TABLE "public"."notification_preferences"
      ADD CONSTRAINT "notification_preferences_org_location_unique"
      UNIQUE ("organization_id", "location_id");
  END IF;
END $$;

-- ── daily_summary_preferences ─────────────────────────────────────────────────

ALTER TABLE "public"."daily_summary_preferences"
  ADD COLUMN IF NOT EXISTS "location_id" uuid
    REFERENCES "public"."locations"("id") ON DELETE CASCADE;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'daily_summary_preferences'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'unique_organization_daily_summary_preferences'
  ) THEN
    ALTER TABLE "public"."daily_summary_preferences"
      DROP CONSTRAINT "unique_organization_daily_summary_preferences";
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'daily_summary_preferences'
      AND constraint_name = 'daily_summary_preferences_org_location_unique'
  ) THEN
    ALTER TABLE "public"."daily_summary_preferences"
      ADD CONSTRAINT "daily_summary_preferences_org_location_unique"
      UNIQUE ("organization_id", "location_id");
  END IF;
END $$;
