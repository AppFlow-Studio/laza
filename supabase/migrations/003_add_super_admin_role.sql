-- Verify prerequisite tables exist before running
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'users'
  ) THEN
    RAISE EXCEPTION 'Prerequisite missing: users table not found. Apply original schema migrations (001, 002, 003_update_limits, 004_email_notifications, 005_scheduled_email_jobs) before running this batch.';
END IF;
END;
$$;

-- Safe to proceed
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
    ADD CONSTRAINT users_role_check
        CHECK (role IN ('super_admin', 'admin', 'employee'));