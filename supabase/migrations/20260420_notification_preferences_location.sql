-- supabase/migrations/20260420_notification_preferences_location.sql

-- ── notification_preferences ──────────────────────────────────────────────────
-- The table previously had UNIQUE(organization_id) which allowed only one row
-- per org. We replace it with UNIQUE(organization_id, location_id) so every
-- location (store or warehouse) can have its own preferences row.

ALTER TABLE "public"."notification_preferences"
  ADD COLUMN IF NOT EXISTS "location_id" uuid
    REFERENCES "public"."locations"("id") ON DELETE CASCADE;

-- Drop the old unique constraint (name may vary — use the safe approach)
DO $$
BEGIN
  -- Try the most common generated name first
  IF EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'notification_preferences'
      AND constraint_type = 'UNIQUE'
      AND constraint_name = 'notification_preferences_organization_id_key'
  ) THEN
    ALTER TABLE "public"."notification_preferences"
      DROP CONSTRAINT "notification_preferences_organization_id_key";
  END IF;
END $$;

ALTER TABLE "public"."notification_preferences"
  ADD CONSTRAINT "notification_preferences_org_location_unique"
  UNIQUE ("organization_id", "location_id");

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
      AND constraint_name = 'daily_summary_preferences_organization_id_key'
  ) THEN
    ALTER TABLE "public"."daily_summary_preferences"
      DROP CONSTRAINT "daily_summary_preferences_organization_id_key";
  END IF;
END $$;

ALTER TABLE "public"."daily_summary_preferences"
  ADD CONSTRAINT "daily_summary_preferences_org_location_unique"
  UNIQUE ("organization_id", "location_id");
